import { NextRequest } from "next/server";
import { db, assertNoError, createEvent } from "@/lib/db/repositories";
import { routeGuard } from "@/lib/utils/response";
import { runGrowthSignalEngine } from "@/lib/engine/run";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest, { params }: { params: { actionId: string } }) {
  return routeGuard(async () => {
    const body = await request.json().catch(() => ({}));
    const before = await db().from("score_result").select("*").eq("customer_id", (await db().from("action_instance").select("customer_id").eq("action_id", params.actionId).single()).data?.customer_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const action = await assertNoError(await db().from("action_instance").update({ status: "completed_l0", completed_at: new Date().toISOString() }).eq("action_id", params.actionId).select("*").single(), "completeAction");
    await db().from("action_evidence").insert({ customer_id: action.customer_id, action_id: action.action_id, evidence_type: "checkbox", evidence_text: body.completion_note ?? "완료", verification_level: "L0", verification_status: "accepted" });
    await createEvent(action.customer_id, "ACTION_COMPLETED", "action_instance", action.action_id);
    const after = await runGrowthSignalEngine(action.customer_id, { createSprint: false });
    const beforeGrowthScore = before.data?.growth_signal_score === null || before.data?.growth_signal_score === undefined
      ? null
      : Number(before.data.growth_signal_score);
    const afterGrowthScore = Number(after.growth_signal_score ?? 0);
    await db().from("action_outcome").insert({
      customer_id: action.customer_id,
      action_id: action.action_id,
      action_code: action.action_code,
      industry_group: null,
      market_type: null,
      customer_segment: null,
      before_score_id: before.data?.score_id ?? null,
      after_score_id: after.score_id,
      before_growth_score: beforeGrowthScore,
      after_growth_score: afterGrowthScore,
      score_lift: beforeGrowthScore !== null ? afterGrowthScore - beforeGrowthScore : null,
      before_component_scores_json: before.data ? {
        market_opportunity: before.data.market_opportunity_score,
        competition_position: before.data.competition_position_score,
        digital_discovery: before.data.digital_discovery_score,
        conversion_readiness: before.data.conversion_readiness_score,
        trust_reaction: before.data.trust_reaction_score,
        action_velocity: before.data.action_velocity_score,
        operation_basic: before.data.operation_basic_score
      } : {},
      after_component_scores_json: after.component_scores,
      component_lift_json: {},
      completion_status: "completed",
      verification_level: "L0",
      time_to_complete_hours: action.assigned_at ? (Date.now() - new Date(action.assigned_at).getTime()) / 3600000 : null,
      report_revisited_after: false,
      consultation_requested_after: false,
      next_action_completed: false,
      retention_signal_after: true
    });
    return {
      action_id: action.action_id,
      status: "completed_l0",
      score_feedback: {
        message: "미션 완료! 실행속도점수가 상승했습니다.",
        before_growth_signal_score: beforeGrowthScore,
        after_growth_signal_score: afterGrowthScore,
        changed_components: { action_velocity: { before: before.data?.action_velocity_score ? Number(before.data.action_velocity_score) : 0, after: after.component_scores.action_velocity ?? 0 } }
      }
    };
  });
}
