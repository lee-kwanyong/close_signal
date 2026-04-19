import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type MonitorRow = {
  id: number;
  business_id?: number | null;
  business_key?: string | null;
  business_number?: string | null;
  business_name?: string | null;
  address?: string | null;
  region_code?: string | null;
  region_name?: string | null;
  category_id?: number | null;
  category_code?: string | null;
  category_name?: string | null;
  latest_stage?: string | null;
  latest_market_risk_score?: number | null;
  latest_business_risk_score?: number | null;
  latest_rescue_chance_score?: number | null;
  latest_closing_risk_score?: number | null;
  last_snapshot_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

type SnapshotRow = {
  id: number;
  monitor_id: number;
  snapshot_date?: string | null;
  stage?: string | null;
  market_risk_score?: number | null;
  business_risk_score?: number | null;
  rescue_chance_score?: number | null;
  closing_risk_score?: number | null;
  why_summary?: string | null;
  action_summary?: string | null;
  next_review_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

type SnapshotReasonRow = {
  id: number;
  health_snapshot_id: number;
  source_type?: string | null;
  dimension?: string | null;
  reason_code?: string | null;
  canonical_reason_code?: string | null;
  title?: string | null;
  detail?: string | null;
  weight?: number | null;
  severity?: string | null;
  playbook_code?: string | null;
  evidence_needed?: unknown;
  success_criteria?: unknown;
  rank_order?: number | null;
  source_ref?: string | null;
};

type RecommendedActionRow = {
  id: number;
  health_snapshot_id: number;
  playbook_code?: string | null;
  title?: string | null;
  description?: string | null;
  priority?: number | null;
  due_in_days?: number | null;
  status?: string | null;
  action_status?: string | null;
  evidence_needed?: unknown;
  success_criteria?: unknown;
  source_reason_codes?: unknown;
  owner_user_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type TaskRow = {
  id: number;
  monitor_id?: number | null;
  recommended_action_id?: number | null;
  snapshot_recommended_action_id?: number | null;
  action_id?: number | null;
  playbook_code?: string | null;
  action_title?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  outcome_status?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

type OutcomeRow = {
  id: number;
  task_id?: number | null;
  recommended_action_id?: number | null;
  snapshot_recommended_action_id?: number | null;
  action_id?: number | null;
  playbook_code?: string | null;
  outcome_status?: string | null;
  status?: string | null;
  note?: string | null;
  summary?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function text(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const s = String(value).trim();
    if (s.length > 0) return s;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "timeline 조회 중 오류가 발생했습니다.";
}

function toStatusCode(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("not found") ||
    normalized.includes("없습니다") ||
    normalized.includes("찾을 수 없습니다")
  ) {
    return 404;
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("유효한") ||
    normalized.includes("잘못된")
  ) {
    return 400;
  }

  return 500;
}

function sortByDateDesc<T extends Record<string, unknown>>(
  rows: T[],
  ...keys: string[]
) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(
      text(...keys.map((key) => a[key])) ?? "1970-01-01T00:00:00.000Z",
    ).getTime();
    const bTime = new Date(
      text(...keys.map((key) => b[key])) ?? "1970-01-01T00:00:00.000Z",
    ).getTime();

    return bTime - aTime;
  });
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const monitorId = Number(id);

    if (!Number.isFinite(monitorId) || monitorId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "유효한 monitor id가 아닙니다.",
        },
        { status: 400 },
      );
    }

    const supabase = supabaseAdmin();

    const { data: monitor, error: monitorError } = await supabase
      .from("external_intel_targets")
      .select("*")
      .eq("id", monitorId)
      .maybeSingle();

    if (monitorError) {
      throw new Error(`external_intel_targets 조회 실패: ${monitorError.message}`);
    }

    if (!monitor) {
      return NextResponse.json(
        {
          ok: false,
          error: "모니터 대상을 찾을 수 없습니다.",
        },
        { status: 404 },
      );
    }

    const monitorRow = monitor as MonitorRow;

    const { data: snapshotData, error: snapshotError } = await supabase
      .from("business_health_snapshots")
      .select("*")
      .eq("monitor_id", monitorId)
      .order("snapshot_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(20);

    if (snapshotError) {
      throw new Error(`business_health_snapshots 조회 실패: ${snapshotError.message}`);
    }

    const snapshotRows = (snapshotData ?? []) as SnapshotRow[];
    const snapshotIds = snapshotRows.map((row) => row.id).filter(Boolean);

    let reasonRows: SnapshotReasonRow[] = [];
    let actionRows: RecommendedActionRow[] = [];

    if (snapshotIds.length > 0) {
      const [{ data: reasons, error: reasonsError }, { data: actions, error: actionsError }] =
        await Promise.all([
          supabase
            .from("business_snapshot_reasons")
            .select("*")
            .in("health_snapshot_id", snapshotIds)
            .order("rank_order", { ascending: true })
            .order("weight", { ascending: false }),

          supabase
            .from("snapshot_recommended_actions")
            .select("*")
            .in("health_snapshot_id", snapshotIds)
            .order("priority", { ascending: true })
            .order("due_in_days", { ascending: true })
            .order("id", { ascending: true }),
        ]);

      if (reasonsError) {
        throw new Error(`business_snapshot_reasons 조회 실패: ${reasonsError.message}`);
      }

      if (actionsError) {
        throw new Error(`snapshot_recommended_actions 조회 실패: ${actionsError.message}`);
      }

      reasonRows = (reasons ?? []) as SnapshotReasonRow[];
      actionRows = (actions ?? []) as RecommendedActionRow[];
    }

    const { data: taskData, error: taskError } = await supabase
      .from("intervention_tasks")
      .select("*")
      .eq("monitor_id", monitorId)
      .order("created_at", { ascending: false });

    if (taskError) {
      throw new Error(`intervention_tasks 조회 실패: ${taskError.message}`);
    }

    const taskRows = sortByDateDesc(
      (taskData ?? []) as TaskRow[],
      "completed_at",
      "updated_at",
      "created_at",
    );

    const taskIds = taskRows.map((row) => num(row.id)).filter((value) => value > 0);

    let outcomeRows: OutcomeRow[] = [];
    if (taskIds.length > 0) {
      const { data: outcomeData, error: outcomeError } = await supabase
        .from("intervention_outcomes")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false });

      if (outcomeError) {
        throw new Error(`intervention_outcomes 조회 실패: ${outcomeError.message}`);
      }

      outcomeRows = sortByDateDesc(
        (outcomeData ?? []) as OutcomeRow[],
        "updated_at",
        "created_at",
      );
    }

    const reasonsBySnapshotId = new Map<number, SnapshotReasonRow[]>();
    for (const row of reasonRows) {
      const snapshotId = num(row.health_snapshot_id);
      if (snapshotId <= 0) continue;

      const bucket = reasonsBySnapshotId.get(snapshotId) ?? [];
      bucket.push(row);
      reasonsBySnapshotId.set(snapshotId, bucket);
    }

    const actionsBySnapshotId = new Map<number, RecommendedActionRow[]>();
    for (const row of actionRows) {
      const snapshotId = num(row.health_snapshot_id);
      if (snapshotId <= 0) continue;

      const bucket = actionsBySnapshotId.get(snapshotId) ?? [];
      bucket.push(row);
      actionsBySnapshotId.set(snapshotId, bucket);
    }

    const enrichedSnapshots = snapshotRows.map((snapshotRow) => {
      const snapshotId = num(snapshotRow.id);
      const reasons = reasonsBySnapshotId.get(snapshotId) ?? [];
      const recommendedActions = actionsBySnapshotId.get(snapshotId) ?? [];

      return {
        ...snapshotRow,
        metadata: asRecord(snapshotRow.metadata),
        reasons,
        top_reasons: reasons.slice(0, 3),
        recommended_actions: recommendedActions,
        actions: recommendedActions,
        top_actions: recommendedActions.slice(0, 3),
      };
    });

    return NextResponse.json({
      ok: true,
      monitor: {
        ...monitorRow,
        metadata: asRecord(monitorRow.metadata),
      },
      timeline: {
        healthSnapshots: enrichedSnapshots,
        interventionTasks: taskRows.map((row) => ({
          ...row,
          metadata: asRecord(row.metadata),
        })),
        interventionOutcomes: outcomeRows.map((row) => ({
          ...row,
          metadata: asRecord(row.metadata),
        })),
      },
    });
  } catch (error) {
    const message = toErrorMessage(error);

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: toStatusCode(message) },
    );
  }
}