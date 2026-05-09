import {
  db,
  assertNoError,
  getCustomer,
  getStoreProfile,
  latest,
  recent,
  createEvent
} from "@/lib/db/repositories";

import {
  calculateDataConfidence,
  calculateGrowthLeverage,
  calculateGrowthScore,
  confidenceGrade,
  scoreActionVelocity,
  scoreCompetition,
  scoreConversion,
  scoreDigital,
  scoreMarket,
  scoreOperation,
  scoreTrust
} from "@/lib/engine/scoring";

import { generateDiagnoses, reportSummary } from "@/lib/engine/diagnosis";

import {
  buildActionCandidates,
  buildGrowthTwin,
  buildMissionPack,
  calculateUnlockPotential,
  createSprintAndActions,
  selectPolicy
} from "@/lib/engine/mission";

import { saveAssets } from "@/lib/engine/assets";
import type { ScoreComponents } from "@/lib/db/types";

function numeric(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
}

function driverObjects(
  components: ScoreComponents,
  diagnoses: ReturnType<typeof generateDiagnoses>
) {
  const positive = [];
  const negative = [];

  if ((components.market_opportunity ?? 0) >= 70) {
    positive.push({
      code: "GOOD_MARKET_SIGNAL",
      label: "상권 수요 양호",
      description: "같은 업종 기준 상권 기회가 평균 이상입니다.",
      impact: 8
    });
  }

  if ((components.operation_basic ?? 0) >= 75) {
    positive.push({
      code: "BUSINESS_INFO_OK",
      label: "기본 정보 정상",
      description: "사업자, 주소, 업종 정보가 안정적으로 확인됩니다.",
      impact: 5
    });
  }

  for (const d of diagnoses.slice(0, 3)) {
    negative.push({
      code: d.code,
      label: d.title,
      description: d.message,
      impact: d.impact
    });
  }

  return { positive, negative };
}

export async function runGrowthSignalEngine(
  customerId: string,
  options: { createSprint?: boolean; scoreVersion?: string } = {}
) {
  const customer = await getCustomer(customerId);
  const profile = await getStoreProfile(customerId);

  const business = await latest(
    "business_verification",
    customerId,
    "verified_at"
  );

  const places = await recent(
    "place_match_snapshot",
    customerId,
    "created_at",
    20
  );

  const market = await latest(
    "market_snapshot",
    customerId,
    "created_at"
  );

  const competition = await latest(
    "competition_snapshot",
    customerId,
    "created_at"
  );

  const events = await recent(
    "customer_event",
    customerId,
    "event_time",
    200
  );

  const actions = await recent(
    "action_instance",
    customerId,
    "assigned_at",
    100
  );

  const components: ScoreComponents = {
    operation_basic: scoreOperation(customer, business, profile),
    digital_discovery: scoreDigital(places),
    conversion_readiness: scoreConversion(places),
    trust_reaction: scoreTrust(places),
    market_opportunity: scoreMarket(market),
    competition_position: scoreCompetition(competition),
    action_velocity: scoreActionVelocity(events, actions)
  };

  const dataConfidence = calculateDataConfidence(
    customer,
    business,
    places,
    market,
    competition,
    events
  );

  const growthScore = calculateGrowthScore(components);
  const growthLeverage = calculateGrowthLeverage(components, dataConfidence);

  const hints = {
    place_found_any: places.some((p: any) => p.place_found) ? 100 : 0,
    category_match_score: places.length
      ? Math.round(
          places.reduce(
            (acc: number, p: any) =>
              acc + Number(p.category_match_score ?? 0),
            0
          ) / places.length
        )
      : null
  };

  const diagnoses = generateDiagnoses(components, hints, dataConfidence);
  const twin = buildGrowthTwin(customer, components, growthLeverage);
  const policyCode = selectPolicy(
    components,
    diagnoses,
    dataConfidence,
    twin
  );

  const candidates = await buildActionCandidates(
    customer,
    components,
    diagnoses,
    dataConfidence,
    twin,
    policyCode
  );

  const unlock = calculateUnlockPotential(candidates);
  const reachable = Math.min(growthScore + unlock, 100);
  const drivers = driverObjects(components, diagnoses);

  const score = await assertNoError(
    await db()
      .from("score_result")
      .insert({
        customer_id: customerId,
        score_version: options.scoreVersion ?? "gs-300-v1",

        growth_signal_score: growthScore,
        unlock_potential_score: unlock,
        reachable_score: reachable,
        growth_leverage_score: growthLeverage,

        market_opportunity_score: components.market_opportunity,
        competition_position_score: components.competition_position,
        digital_discovery_score: components.digital_discovery,
        conversion_readiness_score: components.conversion_readiness,
        trust_reaction_score: components.trust_reaction,
        action_velocity_score: components.action_velocity,
        operation_basic_score: components.operation_basic,

        data_confidence_score: dataConfidence,
        data_confidence_grade: confidenceGrade(dataConfidence),

        weights_used_json: {
          market_opportunity: 0.15,
          competition_position: 0.15,
          digital_discovery: 0.15,
          conversion_readiness: 0.15,
          trust_reaction: 0.1,
          action_velocity: 0.2,
          operation_basic: 0.1
        },

        positive_drivers_json: drivers.positive,
        negative_drivers_json: drivers.negative,

        missing_data_json: [
          {
            type: "revenue",
            label: "월매출 정보",
            message: "입력하면 추천 액션이 더 정교해집니다."
          }
        ],

        component_detail_json: {
          summary: reportSummary(components),
          policy_code: policyCode
        }
      })
      .select("*")
      .single(),
    "saveScoreResult"
  );

  for (const diagnosis of diagnoses) {
    await db()
      .from("diagnosis_result")
      .insert({
        customer_id: customerId,
        score_id: score.score_id,
        diagnosis_code: diagnosis.code,
        affected_score_area: diagnosis.area,
        severity_score: diagnosis.severity,
        confidence_score: diagnosis.confidence,
        impact_score: diagnosis.impact,
        customer_message: diagnosis.message,
        internal_message: `${diagnosis.title}: ${diagnosis.message}`,
        evidence_json: {
          recommended_action_codes: diagnosis.recommended_action_codes
        }
      });
  }

  await db().from("merchant_growth_twin").upsert(twin);

  await createEvent(
    customerId,
    "SCORE_CREATED",
    "score_result",
    score.score_id,
    Number(score.growth_signal_score),
    { policy_code: policyCode }
  );

  let sprint = null;
  let createdActions: any[] = [];

  if (options.createSprint !== false) {
    const missionActions = buildMissionPack(candidates);

    const created = await createSprintAndActions(
      customerId,
      score.score_id,
      missionActions
    );

    sprint = created.sprint;
    createdActions = created.actions;

    await saveAssets(customer, profile, createdActions);

    await createEvent(
      customerId,
      "SPRINT_STARTED",
      "growth_sprint",
      sprint.sprint_id,
      null,
      { action_count: createdActions.length }
    );
  }

  return {
    customer_id: customerId,
    score_id: score.score_id,
    score_date: score.score_date,

    growth_signal_score: numeric(score.growth_signal_score),
    unlock_potential_score: numeric(score.unlock_potential_score),
    reachable_score: numeric(score.reachable_score),

    data_confidence: {
      score: numeric(score.data_confidence_score),
      grade: score.data_confidence_grade
    },

    growth_leverage_score: numeric(score.growth_leverage_score),
    summary: reportSummary(components),
    component_scores: components,

    top_diagnoses: diagnoses.slice(0, 3).map((d) => ({
      code: d.code,
      title: d.title,
      message: d.message,
      impact: d.impact
    })),

    sprint_id: sprint?.sprint_id ?? null,
    mission_count: createdActions.length
  };
}

export function mapScoreRow(row: any) {
  const components = {
    market_opportunity: numeric(row.market_opportunity_score),
    competition_position: numeric(row.competition_position_score),
    digital_discovery: numeric(row.digital_discovery_score),
    conversion_readiness: numeric(row.conversion_readiness_score),
    trust_reaction: numeric(row.trust_reaction_score),
    action_velocity: numeric(row.action_velocity_score),
    operation_basic: numeric(row.operation_basic_score)
  };

  return {
    customer_id: row.customer_id,
    score_id: row.score_id,
    score_date: row.score_date,

    growth_signal_score: numeric(row.growth_signal_score),
    unlock_potential_score: numeric(row.unlock_potential_score),
    reachable_score: numeric(row.reachable_score),

    data_confidence: {
      score: numeric(row.data_confidence_score),
      grade: row.data_confidence_grade,
      message:
        "상권, 경쟁, 지도, 사업자, 사용행동 데이터를 기준으로 진단했습니다."
    },

    growth_leverage_score: numeric(row.growth_leverage_score),
    summary: row.component_detail_json?.summary ?? reportSummary(components),
    component_scores: components,

    positive_drivers: row.positive_drivers_json ?? [],
    negative_drivers: row.negative_drivers_json ?? [],
    missing_data: row.missing_data_json ?? []
  };
}
