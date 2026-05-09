import { db } from "@/lib/db/repositories";
import { routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: { customerId: string } }) {
  return routeGuard(async () => {
    const { data, error } = await db()
      .from("score_result")
      .select("*")
      .eq("customer_id", params.customerId)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      throw new Error(error.message);
    }

    const items = (data ?? []).map((row: any) => ({
      score_id: row.score_id,
      score_date: row.score_date,
      growth_signal_score: Number(row.growth_signal_score ?? 0),
      unlock_potential_score: Number(row.unlock_potential_score ?? 0),
      reachable_score: Number(row.reachable_score ?? 0),
      data_confidence_grade: row.data_confidence_grade,
      component_scores: {
        market_opportunity: row.market_opportunity_score == null ? null : Number(row.market_opportunity_score),
        competition_position: row.competition_position_score == null ? null : Number(row.competition_position_score),
        digital_discovery: row.digital_discovery_score == null ? null : Number(row.digital_discovery_score),
        conversion_readiness: row.conversion_readiness_score == null ? null : Number(row.conversion_readiness_score),
        trust_reaction: row.trust_reaction_score == null ? null : Number(row.trust_reaction_score),
        action_velocity: row.action_velocity_score == null ? null : Number(row.action_velocity_score),
        operation_basic: row.operation_basic_score == null ? null : Number(row.operation_basic_score)
      }
    }));

    return { items };
  });
}
