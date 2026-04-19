import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function text(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function num(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

async function fetchLatestSnapshot(monitorId: number) {
  const { data, error } = await supabaseAdmin()
    .from("business_health_snapshots")
    .select("*")
    .eq("monitor_id", monitorId)
    .order("snapshot_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`latest snapshot 조회 실패: ${error.message}`);
  }

  return data ? asRecord(data) : null;
}

async function createTask(args: {
  monitorId: number;
  action: UnknownRecord;
}) {
  const { monitorId, action } = args;

  const title =
    text(action.title, action.action_title, action.actionTitle, action.name) ??
    "추천 액션 수행";

  const description =
    text(action.description, action.summary, action.action_description) ?? "";

  const playbookCode = text(action.playbook_code, action.playbookCode, action.code);
  const dueDays = num(action.target_days, action.targetDays, action.due_in_days) ?? 7;

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + dueDays);

  const variants: UnknownRecord[] = [
    {
      monitor_id: monitorId,
      title,
      description,
      status: "todo",
      playbook_code: playbookCode,
      due_at: dueAt.toISOString(),
    },
    {
      monitor_id: monitorId,
      title,
      description,
      task_status: "todo",
      playbook_code: playbookCode,
      due_at: dueAt.toISOString(),
    },
    {
      monitor_id: monitorId,
      title,
      status: "todo",
      due_at: dueAt.toISOString(),
    },
    {
      monitor_id: monitorId,
      title,
      task_status: "todo",
      due_at: dueAt.toISOString(),
    },
    {
      monitor_id: monitorId,
      title,
      status: "todo",
    },
    {
      monitor_id: monitorId,
      title,
      task_status: "todo",
    },
  ];

  let lastError: string | null = null;

  for (const payload of variants) {
    const { data, error } = await supabaseAdmin()
      .from("intervention_tasks")
      .insert(payload)
      .select("*")
      .single();

    if (!error) {
      return asRecord(data);
    }

    lastError = error.message;
  }

  throw new Error(`fallback task 생성 실패: ${lastError ?? "unknown error"}`);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const monitorId = Number(id);

    if (!Number.isInteger(monitorId) || monitorId <= 0) {
      return NextResponse.json(
        { ok: false, message: "유효한 monitor id가 아닙니다." },
        { status: 400 },
      );
    }

    const body = asRecord(await request.json().catch(() => ({})));
    const action = asRecord(body.action);

    if (!text(action.title, action.action_title, action.name)) {
      return NextResponse.json(
        { ok: false, message: "fallback action payload가 비어 있습니다." },
        { status: 400 },
      );
    }

    const latestSnapshot = await fetchLatestSnapshot(monitorId);
    const task = await createTask({ monitorId, action });

    return NextResponse.json({
      ok: true,
      monitorId,
      snapshotId: num(latestSnapshot?.id),
      mode: "fallback_accept",
      task,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "fallback accept 처리 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}