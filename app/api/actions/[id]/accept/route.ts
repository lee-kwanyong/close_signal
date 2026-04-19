import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RecommendedActionRow = {
  id: number;
  health_snapshot_id: number;
  playbook_code?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  action_status?: string | null;
  owner_user_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type SnapshotRow = {
  id: number;
  monitor_id: number;
};

type TaskRow = {
  id: number;
  monitor_id?: number | null;
  recommended_action_id?: number | null;
  playbook_code?: string | null;
  action_title?: string | null;
  title?: string | null;
  status?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

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

function normalizeStatus(value: unknown) {
  const v = String(value ?? "").trim().toLowerCase();

  if (v === "completed" || v === "done") return "completed";
  if (v === "accepted" || v === "in_progress") return "accepted";
  if (v === "dismissed" || v === "canceled") return "dismissed";
  return "recommended";
}

function isOpenTask(task?: TaskRow | null) {
  if (!task) return false;
  const status = normalizeStatus(task.status);
  return status !== "completed" && status !== "dismissed";
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "액션 수락 처리 중 오류가 발생했습니다.";
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

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actionId = Number(id);

    if (!Number.isFinite(actionId) || actionId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "유효한 action id가 아닙니다.",
        },
        { status: 400 },
      );
    }

    const supabase = supabaseAdmin();
    const now = new Date().toISOString();

    const { data: action, error: actionError } = await supabase
      .from("snapshot_recommended_actions")
      .select("*")
      .eq("id", actionId)
      .maybeSingle();

    if (actionError) {
      throw new Error(`snapshot_recommended_actions 조회 실패: ${actionError.message}`);
    }

    if (!action) {
      return NextResponse.json(
        {
          ok: false,
          error: "추천 액션을 찾을 수 없습니다.",
        },
        { status: 404 },
      );
    }

    const actionRow = action as RecommendedActionRow;

    const { data: snapshot, error: snapshotError } = await supabase
      .from("business_health_snapshots")
      .select("id, monitor_id")
      .eq("id", actionRow.health_snapshot_id)
      .maybeSingle();

    if (snapshotError) {
      throw new Error(`business_health_snapshots 조회 실패: ${snapshotError.message}`);
    }

    if (!snapshot) {
      return NextResponse.json(
        {
          ok: false,
          error: "연결된 health snapshot을 찾을 수 없습니다.",
        },
        { status: 404 },
      );
    }

    const snapshotRow = snapshot as SnapshotRow;
    const currentActionStatus = normalizeStatus(
      actionRow.action_status ?? actionRow.status,
    );

    if (currentActionStatus === "completed") {
      return NextResponse.json({
        ok: true,
        actionId: actionRow.id,
        monitorId: snapshotRow.monitor_id,
        status: "completed",
        message: "이미 완료된 액션입니다.",
      });
    }

    const { data: existingTasks, error: existingTasksError } = await supabase
      .from("intervention_tasks")
      .select("*")
      .eq("monitor_id", snapshotRow.monitor_id)
      .eq("recommended_action_id", actionRow.id)
      .order("created_at", { ascending: false });

    if (existingTasksError) {
      throw new Error(`intervention_tasks 조회 실패: ${existingTasksError.message}`);
    }

    const taskRows = (existingTasks ?? []) as TaskRow[];
    const openTask = taskRows.find((task) => isOpenTask(task)) ?? null;

    let linkedTaskId: number | null = openTask?.id ?? null;

    if (!openTask) {
      const taskMetadata: Record<string, unknown> = {
        accepted_from_action_id: actionRow.id,
        accepted_at: now,
        playbook_code: text(actionRow.playbook_code),
      };

      const { data: insertedTask, error: insertTaskError } = await supabase
        .from("intervention_tasks")
        .insert({
          monitor_id: snapshotRow.monitor_id,
          recommended_action_id: actionRow.id,
          playbook_code: text(actionRow.playbook_code),
          action_title: text(actionRow.title),
          status: "accepted",
          metadata: taskMetadata,
        })
        .select("id")
        .single();

      if (insertTaskError) {
        throw new Error(`intervention_tasks 생성 실패: ${insertTaskError.message}`);
      }

      linkedTaskId = Number(insertedTask?.id ?? 0) || null;
    } else if (normalizeStatus(openTask.status) !== "accepted") {
      const mergedTaskMetadata: Record<string, unknown> = {
        ...asRecord(openTask.metadata),
        accepted_from_action_id: actionRow.id,
        accepted_at: now,
        playbook_code: text(actionRow.playbook_code),
      };

      const { error: updateTaskError } = await supabase
        .from("intervention_tasks")
        .update({
          status: "accepted",
          metadata: mergedTaskMetadata,
        })
        .eq("id", openTask.id);

      if (updateTaskError) {
        throw new Error(`intervention_tasks 상태 갱신 실패: ${updateTaskError.message}`);
      }

      linkedTaskId = openTask.id;
    }

    const mergedActionMetadata: Record<string, unknown> = {
      ...asRecord(actionRow.metadata),
      accepted_at: now,
      linked_task_id: linkedTaskId,
      accepted_from_snapshot_id: actionRow.health_snapshot_id,
    };

    const { error: updateActionError } = await supabase
      .from("snapshot_recommended_actions")
      .update({
        status: "accepted",
        action_status: "accepted",
        metadata: mergedActionMetadata,
      })
      .eq("id", actionRow.id);

    if (updateActionError) {
      throw new Error(
        `snapshot_recommended_actions 상태 갱신 실패: ${updateActionError.message}`,
      );
    }

    return NextResponse.json({
      ok: true,
      actionId: actionRow.id,
      monitorId: snapshotRow.monitor_id,
      taskId: linkedTaskId,
      status: "accepted",
      message: "추천 액션을 수락하고 작업을 연결했습니다.",
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