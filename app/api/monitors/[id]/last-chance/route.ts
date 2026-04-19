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

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "last-chance 조회 중 오류가 발생했습니다.";
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

    const { data: snapshot, error: snapshotError } = await supabase
      .from("business_health_snapshots")
      .select("*")
      .eq("monitor_id", monitorId)
      .order("snapshot_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapshotError) {
      throw new Error(`business_health_snapshots 조회 실패: ${snapshotError.message}`);
    }

    const latestSnapshot = (snapshot ?? null) as SnapshotRow | null;

    let reasons: SnapshotReasonRow[] = [];
    let actions: RecommendedActionRow[] = [];

    if (latestSnapshot?.id) {
      const [{ data: reasonData, error: reasonError }, { data: actionData, error: actionError }] =
        await Promise.all([
          supabase
            .from("business_snapshot_reasons")
            .select("*")
            .eq("health_snapshot_id", latestSnapshot.id)
            .order("rank_order", { ascending: true })
            .order("weight", { ascending: false }),

          supabase
            .from("snapshot_recommended_actions")
            .select("*")
            .eq("health_snapshot_id", latestSnapshot.id)
            .order("priority", { ascending: true })
            .order("due_in_days", { ascending: true })
            .order("id", { ascending: true }),
        ]);

      if (reasonError) {
        throw new Error(`business_snapshot_reasons 조회 실패: ${reasonError.message}`);
      }

      if (actionError) {
        throw new Error(`snapshot_recommended_actions 조회 실패: ${actionError.message}`);
      }

      reasons = (reasonData ?? []) as SnapshotReasonRow[];
      actions = (actionData ?? []) as RecommendedActionRow[];
    }

    const { data: taskData, error: taskError } = await supabase
      .from("intervention_tasks")
      .select("*")
      .eq("monitor_id", monitorId)
      .order("created_at", { ascending: false })
      .limit(20);

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

    const latestTask = taskRows[0] ?? null;
    const latestOutcome = outcomeRows[0] ?? null;

    if (!latestSnapshot) {
      return NextResponse.json({
        ok: true,
        card: {
          monitor_id: monitorRow.id,
          business_name: monitorRow.business_name ?? null,
          address: monitorRow.address ?? null,
          region_code: monitorRow.region_code ?? null,
          region_name: monitorRow.region_name ?? null,
          category_id: monitorRow.category_id ?? null,
          category_code: monitorRow.category_code ?? null,
          category_name: monitorRow.category_name ?? null,
          snapshot_id: null,
          snapshot_date: null,
          stage: monitorRow.latest_stage ?? "observe",
          market_risk_score: monitorRow.latest_market_risk_score ?? 0,
          business_risk_score: monitorRow.latest_business_risk_score ?? 0,
          rescue_chance_score: monitorRow.latest_rescue_chance_score ?? 0,
          closing_risk_score: monitorRow.latest_closing_risk_score ?? 0,
          why_summary: null,
          action_summary: null,
          next_review_at: null,
          top_reasons: [],
          top_actions: [],
          latest_task: latestTask
            ? {
                ...latestTask,
                metadata: asRecord(latestTask.metadata),
              }
            : null,
          latest_outcome: latestOutcome
            ? {
                ...latestOutcome,
                metadata: asRecord(latestOutcome.metadata),
              }
            : null,
          metadata: {
            ...asRecord(monitorRow.metadata),
            fallback: true,
          },
        },
      });
    }

    return NextResponse.json({
      ok: true,
      card: {
        monitor_id: monitorRow.id,
        business_name: monitorRow.business_name ?? null,
        address: monitorRow.address ?? null,
        region_code: monitorRow.region_code ?? null,
        region_name: monitorRow.region_name ?? null,
        category_id: monitorRow.category_id ?? null,
        category_code: monitorRow.category_code ?? null,
        category_name: monitorRow.category_name ?? null,
        snapshot_id: latestSnapshot.id,
        snapshot_date: latestSnapshot.snapshot_date ?? null,
        stage: latestSnapshot.stage ?? monitorRow.latest_stage ?? "observe",
        market_risk_score:
          latestSnapshot.market_risk_score ?? monitorRow.latest_market_risk_score ?? 0,
        business_risk_score:
          latestSnapshot.business_risk_score ??
          monitorRow.latest_business_risk_score ??
          0,
        rescue_chance_score:
          latestSnapshot.rescue_chance_score ??
          monitorRow.latest_rescue_chance_score ??
          0,
        closing_risk_score:
          latestSnapshot.closing_risk_score ??
          monitorRow.latest_closing_risk_score ??
          0,
        why_summary: latestSnapshot.why_summary ?? null,
        action_summary: latestSnapshot.action_summary ?? null,
        next_review_at: latestSnapshot.next_review_at ?? null,
        reasons,
        top_reasons: reasons.slice(0, 3),
        actions,
        top_actions: actions.slice(0, 3),
        latest_task: latestTask
          ? {
              ...latestTask,
              metadata: asRecord(latestTask.metadata),
            }
          : null,
        latest_outcome: latestOutcome
          ? {
              ...latestOutcome,
              metadata: asRecord(latestOutcome.metadata),
            }
          : null,
        metadata: {
          ...asRecord(monitorRow.metadata),
          snapshot: asRecord(latestSnapshot.metadata),
        },
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