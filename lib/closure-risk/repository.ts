import { db } from "@/lib/db/repositories";
import type { ClosureRiskSourceBundle } from "@/lib/closure-risk/feature-builder";
import type { ClosureRiskResult, StoreClosureRiskInput } from "@/lib/closure-risk/types";

type BaseBundle = Pick<ClosureRiskSourceBundle, "customer" | "profile" | "business" | "places" | "market" | "competition">;

function isMissingRelationError(error: any): boolean {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return error?.code === "42P01" || message.includes("does not exist") || message.includes("schema cache");
}

async function safeRecent(table: string, customerId: string, orderColumn: string, limit = 100) {
  const { data, error } = await db().from(table).select("*").eq("customer_id", customerId).order(orderColumn, { ascending: false }).limit(limit);
  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(`safeRecent ${table}: ${error.message}`);
  }
  return data ?? [];
}

async function safeLatest(table: string, customerId: string, orderColumn: string) {
  const rows = await safeRecent(table, customerId, orderColumn, 1);
  return rows[0] ?? null;
}

async function safeReviewConnections(customerId: string) {
  const { data, error } = await db()
    .from("review_platform_connections")
    .select("*")
    .eq("store_id", customerId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(`safeReviewConnections: ${error.message}`);
  }

  return data ?? [];
}

export async function loadClosureRiskOptionalData(customerId: string, base: BaseBundle): Promise<ClosureRiskSourceBundle> {
  const [
    salesDaily,
    latestCost,
    reviewWeeklyStats,
    latestReviewIssue,
    latestRegionalIndicator,
    latestClosureStats,
    competitionHistory,
    reviewConnections
  ] = await Promise.all([
    safeRecent("business_sales_daily", customerId, "sales_date", 220),
    safeLatest("business_cost_monthly", customerId, "cost_month"),
    safeRecent("review_weekly_stats", customerId, "week_start_date", 12),
    safeLatest("review_issue_snapshots", customerId, "snapshot_date"),
    safeLatest("regional_market_indicators", customerId, "snapshot_month"),
    safeLatest("external_closure_stats", customerId, "snapshot_month"),
    safeRecent("competition_snapshot", customerId, "snapshot_month", 2),
    safeReviewConnections(customerId)
  ]);

  return {
    ...base,
    salesDaily,
    latestCost,
    reviewWeeklyStats,
    latestReviewIssue,
    latestRegionalIndicator,
    latestClosureStats,
    previousCompetition: competitionHistory[1] ?? null,
    reviewConnections
  };
}

export async function saveClosureRiskSnapshot(params: {
  customerId: string;
  scoreId: string;
  input: StoreClosureRiskInput;
  result: ClosureRiskResult;
}) {
  const { error } = await db().from("closure_risk_snapshot").insert({
    customer_id: params.customerId,
    score_id: params.scoreId,
    snapshot_date: params.result.snapshotDate,
    risk_score: params.result.score,
    risk_level: params.result.level,
    risk_summary: params.result.summary,
    input_json: params.input,
    signals_json: params.result.signals,
    actions_json: params.result.actions,
    missing_data_json: params.result.missingData,
    review_data_status_json: params.result.reviewDataStatus,
    debug_json: params.result.debug
  });

  if (error && !isMissingRelationError(error)) {
    throw new Error(`saveClosureRiskSnapshot: ${error.message}`);
  }
}
