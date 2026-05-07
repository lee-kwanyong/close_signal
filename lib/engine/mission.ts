import { db, assertNoError } from "@/lib/db/repositories";
import type { ActionCandidate, Diagnosis, ScoreComponents } from "@/lib/db/types";

export function buildGrowthTwin(customer: any, components: ScoreComponents, growthLeverageScore: number) {
  const level = (score: number | null) => score === null ? "none" : score >= 75 ? "high" : score >= 50 ? "medium" : "low";
  const market = components.market_opportunity === null ? "unknown" : components.market_opportunity >= 70 && (components.competition_position ?? 100) < 55 ? "high_demand_high_competition" : components.market_opportunity >= 70 ? "high_demand" : components.market_opportunity >= 50 ? "average_demand" : "low_demand";
  const av = components.action_velocity;
  const actionBehavior = av === null ? "unknown" : av < 30 ? "needs_easy_first_action" : av < 50 ? "slow_executor" : av < 75 ? "steady_executor" : "fast_executor";
  return {
    customer_id: customer.customer_id,
    industry_group: customer.industry_group ?? "unknown",
    market_type: market,
    competition_type: (components.competition_position ?? 100) < 50 ? "high" : "normal",
    digital_maturity_level: level(components.digital_discovery),
    conversion_readiness_level: level(components.conversion_readiness),
    trust_signal_level: level(components.trust_reaction),
    action_behavior_type: actionBehavior,
    growth_leverage_score: growthLeverageScore,
    raw_profile_json: { components }
  };
}

export function selectPolicy(components: ScoreComponents, diagnoses: Diagnosis[], dataConfidence: number, twin: any) {
  const codes = new Set(diagnoses.map((d) => d.code));
  if (codes.has("NO_ACTION_AFTER_VIEW") || twin.action_behavior_type === "needs_easy_first_action") return "FIRST_ACTION_FOR_INACTIVE";
  if (dataConfidence < 60) return "LOW_DATA_CONFIDENCE_BOOST";
  if ((components.market_opportunity ?? 0) >= 70 && (components.conversion_readiness ?? 100) < 55) return "GOOD_MARKET_LOW_CONVERSION";
  if (codes.has("HIGH_COMPETITION_PRESSURE")) return "HIGH_COMPETITION_LOW_DIFFERENTIATION";
  return "GOOD_MARKET_LOW_CONVERSION";
}

function expectedEffect(maxLift: number) {
  return Math.min(maxLift * 15, 100);
}

async function effectivenessScore(actionCode: string, industryGroup: string, marketType: string, customerSegment: string) {
  const { data } = await db()
    .from("action_effectiveness_summary")
    .select("*")
    .eq("action_code", actionCode)
    .or(`industry_group.eq.${industryGroup},industry_group.eq.default`)
    .or(`market_type.eq.${marketType},market_type.eq.all`)
    .or(`customer_segment.eq.${customerSegment},customer_segment.eq.all`)
    .order("confidence_level", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return 50;
  const completion = Number(data.completion_rate ?? 0);
  const lift = Math.min(Number(data.avg_score_lift ?? 0) * 15, 100);
  const next = Number(data.next_action_completion_rate ?? 0);
  const confidence = Number(data.confidence_level ?? 20);
  return 0.35 * completion + 0.35 * lift + 0.15 * next + 0.15 * confidence;
}

export async function buildActionCandidates(customer: any, components: ScoreComponents, diagnoses: Diagnosis[], dataConfidence: number, twin: any, policyCode: string): Promise<ActionCandidate[]> {
  const { data: policy, error } = await db().from("mission_policy").select("*").eq("policy_code", policyCode).maybeSingle();
  if (error) throw new Error(error.message);
  const policyActions = Array.isArray(policy?.recommended_action_codes_json) ? policy.recommended_action_codes_json : [];
  const fromDiagnoses = diagnoses.flatMap((d) => d.recommended_action_codes.map((code) => ({ action_code: code, mission_type: "high_impact" })));
  const actionRefs = [...policyActions, ...fromDiagnoses];
  const unique = new Map<string, string>();
  for (const ref of actionRefs) {
    if (!unique.has(ref.action_code)) unique.set(ref.action_code, ref.mission_type ?? "high_impact");
  }

  const candidates: ActionCandidate[] = [];
 for (const [code, missionType] of Array.from(unique.entries())) {
    const { data: template, error: templateError } = await db()
      .from("action_template")
      .select("*")
      .eq("action_code", code)
      .or(`industry_group.eq.${customer.industry_group},industry_group.eq.default`)
      .eq("is_active", true)
      .order("industry_group", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (templateError || !template) continue;

    const past = await effectivenessScore(code, customer.industry_group ?? "default", twin.market_type ?? "all", twin.action_behavior_type ?? "all");
    const ease = 100 - Number(template.difficulty_score ?? 50);
    const expected = expectedEffect(Number(template.expected_lift_max ?? 2));
    const customerFit = twin.action_behavior_type === "needs_easy_first_action" && ease >= 70 ? 95 : 70;
    const industryFit = template.industry_group === customer.industry_group ? 95 : 75;
    const urgency = diagnoses.some((d) => d.recommended_action_codes.includes(code)) ? 90 : 60;
    const priority = 0.2 * expected + 0.15 * ease + 0.2 * customerFit + 0.1 * industryFit + 0.1 * dataConfidence + 0.15 * past + 0.1 * urgency;
    const lift = Math.max(Number(template.expected_lift_min ?? 1), Math.round(Number(template.expected_lift_max ?? 2)));

    candidates.push({
      action_template_id: template.action_template_id,
      action_code: code,
      mission_type: missionType ?? template.default_mission_type,
      title: template.title,
      description: template.description,
      expected_lift_area: template.expected_lift_area,
      expected_total_lift: lift,
      expected_component_lift: { [template.expected_lift_area]: lift },
      priority_score: Number(priority.toFixed(2)),
      effectiveness_score: Number(past.toFixed(2)),
      difficulty_score: Number(template.difficulty_score ?? 50),
      estimated_minutes: template.estimated_minutes,
      guide_json: template.guide_json ?? {},
      safety_note: template.safety_note
    });
  }

  candidates.sort((a, b) => b.priority_score - a.priority_score);
  return candidates;
}

export function buildMissionPack(candidates: ActionCandidate[]) {
  const selected: ActionCandidate[] = [];
  const addType = (type: string) => {
    const found = candidates.find((a) => a.mission_type === type && !selected.some((s) => s.action_code === a.action_code));
    if (found) selected.push(found);
  };
  addType("quick_win");
  addType("high_impact");
  addType("trust_builder");
  for (const candidate of candidates) {
    if (selected.length >= 3) break;
    if (!selected.some((s) => s.action_code === candidate.action_code)) selected.push(candidate);
  }
  return selected.slice(0, 3);
}

export function calculateUnlockPotential(candidates: ActionCandidate[]) {
  const used = new Set<string>();
  let total = 0;
  for (const action of candidates.slice(0, 8)) {
    let lift = action.expected_total_lift;
    if (used.has(action.expected_lift_area)) lift *= 0.5;
    used.add(action.expected_lift_area);
    total += lift;
  }
  return Math.min(Number(total.toFixed(2)), 25);
}

export async function createSprintAndActions(customerId: string, scoreId: string, actions: ActionCandidate[]) {
  const target = actions.reduce((acc, a) => acc + a.expected_total_lift, 0);
  const sprint = await assertNoError(await db().from("growth_sprint").insert({ customer_id: customerId, score_id: scoreId, target_score_lift: target }).select("*").single(), "createSprint");
  let day = 1;
  const createdActions = [];
  for (const action of actions) {
    const created = await assertNoError(
      await db().from("action_instance").insert({
        customer_id: customerId,
        score_id: scoreId,
        sprint_id: sprint.sprint_id,
        action_template_id: action.action_template_id,
        action_code: action.action_code,
        mission_type: action.mission_type,
        title: action.title,
        description: action.description,
        action_priority_score: action.priority_score,
        action_effectiveness_score: action.effectiveness_score,
        expected_total_lift: action.expected_total_lift,
        expected_component_lift_json: action.expected_component_lift,
        metadata_json: { guide_json: action.guide_json, safety_note: action.safety_note, estimated_minutes: action.estimated_minutes }
      }).select("*").single(),
      "createActionInstance"
    );
    createdActions.push(created);
    await db().from("sprint_mission").insert({
      sprint_id: sprint.sprint_id,
      customer_id: customerId,
      action_id: created.action_id,
      day_number: day++,
      mission_type: action.mission_type,
      title: action.title,
      expected_lift: action.expected_total_lift,
      estimated_minutes: action.estimated_minutes
    });
  }
  return { sprint, actions: createdActions };
}
