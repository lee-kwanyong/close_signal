import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TaskRow = {
  id: number;
  monitor_id?: number | null;
  recommended_action_id?: number | null;
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

type ActionRow = {
  id: number;
  health_snapshot_id?: number | null;
  playbook_code?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  action_status?: string | null;
  metadata?: Record<string, unknown> | null;
};

type OutcomeRow = {
  id: number;
  task_id?: number | null;
  outcome_status?: string | null;
  status?: string | null;
  note?: string | null;
  summary?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CompleteBody = {
  outcomeStatus?: unknown;
  note?: unknown;
  summary?: unknown;
  description?: unknown;
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

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeTaskStatus(value: unknown) {
  const v = String(value ?? "").trim().toLowerCase();

  if (v === "done" || v === "completed") return "done";
  if (v === "accepted" || v === "in_progress") return "accepted";
  if (v === "dismissed" || v === "canceled") return "canceled";
  return "recommended";
}

function normalizeOutcomeStatus(value: unknown): "improved" | "unchanged" | "worsened" {
  const v = String(value ?? "").trim().toLowerCase();

  if (
    v.includes("worse") ||
    v.includes("bad") ||
    v.includes("decline") ||
    v.includes("악화")
  ) {
    return "worsened";
  }

  if (
    v.includes("same") ||
    v.includes("unchanged") ||
    v.includes("stable") ||
    v.includes("유지")
  ) {
    return "unchanged";
  }

  return "improved";
}

function getRecommendedActionId(task: TaskRow) {
  if (num(task.recommended_action_id) > 0) {
    return num(task.recommended_action_id);
  }

  const metadata = asRecord(task.metadata);

  if (num(metadata.recommended_action_id) > 0) {
    return num(metadata.recommended_action_id);
  }

  if (num(metadata.snapshot_recommended_action_id) > 0) {
    return num(metadata.snapshot_recommended_action_id);
  }

  if (num(metadata.accepted_from_action_id) > 0) {
    return num(metadata.accepted_from_action_id);
  }

  return null;
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "task 완료 처리 중 오류가 발생했습니다.";
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

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const taskId = Number(id);

    if (!Number.isFinite(taskId) || taskId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "유효한 task id가 아닙니다.",
        },
        { status: 400 },
      );
    }

    let body: CompleteBody = {};
    try {
      body = (await req.json()) as CompleteBody;
    } catch {
      body = {};
    }

    const supabase = supabaseAdmin();
    const now = new Date().toISOString();

    const { data: task, error: taskError } = await supabase
      .from("intervention_tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (taskError) {
      throw new Error(`intervention_tasks 조회 실패: ${taskError.message}`);
    }

    if (!task) {
      return NextResponse.json(
        {
          ok: false,
          error: "작업을 찾을 수 없습니다.",
        },
        { status: 404 },
      );
    }

    const taskRow = task as TaskRow;
    const recommendedActionId = getRecommendedActionId(taskRow);

    const outcomeStatus = normalizeOutcomeStatus(
      body.outcomeStatus ?? taskRow.outcome_status,
    );

    const outcomeNote =
      text(
        body.note,
        body.summary,
        body.description,
        taskRow.description,
      ) ?? "개입 작업이 완료 처리되었습니다.";

    const mergedTaskMetadataBefore = asRecord(taskRow.metadata);

    const { data: existingOutcomeRows, error: existingOutcomeError } = await supabase
      .from("intervention_outcomes")
      .select("*")
      .eq("task_id", taskRow.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingOutcomeError) {
      throw new Error(`intervention_outcomes 조회 실패: ${existingOutcomeError.message}`);
    }

    const existingOutcome = ((existingOutcomeRows ?? [])[0] ?? null) as OutcomeRow | null;

    let outcomeId: number | null = existingOutcome?.id ?? null;

    if (normalizeTaskStatus(taskRow.status) !== "done" || !taskRow.completed_at) {
      const mergedTaskMetadata: Record<string, unknown> = {
        ...mergedTaskMetadataBefore,
        completed_at: now,
        outcome_status: outcomeStatus,
        completion_note: outcomeNote,
      };

      const { error: updateTaskError } = await supabase
        .from("intervention_tasks")
        .update({
          status: "done",
          completed_at: now,
          outcome_status: outcomeStatus,
          metadata: mergedTaskMetadata,
        })
        .eq("id", taskRow.id);

      if (updateTaskError) {
        throw new Error(`intervention_tasks 완료 처리 실패: ${updateTaskError.message}`);
      }
    }

    if (existingOutcome) {
      const mergedOutcomeMetadata: Record<string, unknown> = {
        ...asRecord(existingOutcome.metadata),
        updated_from_task_complete_at: now,
        playbook_code: text(taskRow.playbook_code),
      };

      const { error: updateOutcomeError } = await supabase
        .from("intervention_outcomes")
        .update({
          outcome_status: outcomeStatus,
          note: outcomeNote,
          metadata: mergedOutcomeMetadata,
        })
        .eq("id", existingOutcome.id);

      if (updateOutcomeError) {
        throw new Error(`intervention_outcomes 업데이트 실패: ${updateOutcomeError.message}`);
      }

      outcomeId = existingOutcome.id;
    } else {
      const outcomeMetadata: Record<string, unknown> = {
        created_from_task_complete_at: now,
        playbook_code: text(taskRow.playbook_code),
        action_title: text(taskRow.action_title, taskRow.title),
      };

      const { data: insertedOutcome, error: insertOutcomeError } = await supabase
        .from("intervention_outcomes")
        .insert({
          task_id: taskRow.id,
          outcome_status: outcomeStatus,
          note: outcomeNote,
          metadata: outcomeMetadata,
        })
        .select("id")
        .single();

      if (insertOutcomeError) {
        throw new Error(`intervention_outcomes 생성 실패: ${insertOutcomeError.message}`);
      }

      outcomeId = num(insertedOutcome?.id) > 0 ? num(insertedOutcome?.id) : null;
    }

    if (recommendedActionId && recommendedActionId > 0) {
      const { data: action, error: actionError } = await supabase
        .from("snapshot_recommended_actions")
        .select("*")
        .eq("id", recommendedActionId)
        .maybeSingle();

      if (actionError) {
        throw new Error(`snapshot_recommended_actions 조회 실패: ${actionError.message}`);
      }

      if (action) {
        const actionRow = action as ActionRow;

        const mergedActionMetadata: Record<string, unknown> = {
          ...asRecord(actionRow.metadata),
          completed_at: now,
          outcome_status: outcomeStatus,
          linked_task_id: taskRow.id,
          linked_outcome_id: outcomeId,
        };

        const { error: updateActionError } = await supabase
          .from("snapshot_recommended_actions")
          .update({
            status: "completed",
            action_status: "completed",
            metadata: mergedActionMetadata,
          })
          .eq("id", actionRow.id);

        if (updateActionError) {
          throw new Error(
            `snapshot_recommended_actions 완료 처리 실패: ${updateActionError.message}`,
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      taskId: taskRow.id,
      recommendedActionId,
      outcomeId,
      status: "done",
      outcomeStatus,
      message: "작업 완료 및 outcome 기록이 반영되었습니다.",
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