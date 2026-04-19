"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition, type ReactNode } from "react";

type UnknownRecord = Record<string, unknown>;

type MonitorDetailClientProps = {
  detail: UnknownRecord;
};

type ActionState = "recommended" | "accepted" | "completed" | "unknown";

type ActionWithState = UnknownRecord & {
  effectiveStatus: ActionState;
  matchedTasks: UnknownRecord[];
  matchedOutcomes: UnknownRecord[];
};

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function textValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function listFromUnknown(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (typeof item === "number" && Number.isFinite(item)) return String(item);
        if (item && typeof item === "object") {
          const row = item as UnknownRecord;
          return textValue(
            row.title,
            row.name,
            row.label,
            row.description,
            row.detail,
            row.code,
          );
        }
        return "";
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function formatScore(value: unknown) {
  const score = numberValue(value);
  if (score == null) return "-";
  return String(Math.round(score));
}

function formatDate(value: unknown) {
  const text = textValue(value);
  if (!text) return "날짜 없음";

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatRelativeDate(value: unknown) {
  const text = textValue(value);
  if (!text) return "갱신 없음";

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diff <= 0) return "오늘";
  if (diff === 1) return "1일 전";
  if (diff < 7) return `${diff}일 전`;
  return formatDate(text);
}

function normalizeStatus(value: unknown): ActionState {
  const status = textValue(value).toLowerCase();

  if (["recommended", "queued", "pending", "todo"].includes(status)) {
    return "recommended";
  }
  if (["accepted", "assigned", "in_progress", "doing", "open"].includes(status)) {
    return "accepted";
  }
  if (["completed", "done", "success", "resolved", "closed"].includes(status)) {
    return "completed";
  }

  return status ? "unknown" : "recommended";
}

function sameId(a: unknown, b: unknown) {
  const left = textValue(a);
  const right = textValue(b);
  if (!left || !right) return false;
  return left === right;
}

function sameCode(a: unknown, b: unknown) {
  const left = textValue(a).toLowerCase();
  const right = textValue(b).toLowerCase();
  if (!left || !right) return false;
  return left === right;
}

function stageMeta(value: unknown) {
  const stage = textValue(value).toLowerCase();

  if (["critical", "last_chance", "last-chance"].includes(stage)) {
    return {
      label: "마지막 기회",
      tone: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }
  if (["urgent", "high"].includes(stage)) {
    return {
      label: "긴급",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  if (["caution", "warning", "medium"].includes(stage)) {
    return {
      label: "오늘 처리",
      tone: "border-orange-200 bg-orange-50 text-orange-700",
    };
  }
  if (["observe", "watch", "low"].includes(stage)) {
    return {
      label: "관찰",
      tone: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }
  if (["stable", "safe"].includes(stage)) {
    return {
      label: "안정",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    label: textValue(value) || "미정",
    tone: "border-slate-200 bg-slate-50 text-slate-600",
  };
}

function statusMeta(value: ActionState) {
  switch (value) {
    case "completed":
      return {
        label: "완료",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "accepted":
      return {
        label: "진행 중",
        tone: "border-amber-200 bg-amber-50 text-amber-700",
      };
    case "recommended":
      return {
        label: "추천",
        tone: "border-sky-200 bg-sky-50 text-sky-700",
      };
    default:
      return {
        label: "확인 필요",
        tone: "border-slate-200 bg-slate-50 text-slate-600",
      };
  }
}

function scoreTone(value: unknown, positiveHigher = false) {
  const score = numberValue(value);

  if (score == null) return "border-slate-200 bg-slate-50 text-slate-600";

  if (positiveHigher) {
    if (score >= 60) return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (score >= 35) return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (score >= 80) return "border-rose-200 bg-rose-50 text-rose-700";
  if (score >= 60) return "border-amber-200 bg-amber-50 text-amber-700";
  if (score >= 40) return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function deltaTone(value: number | null, positiveIsGood = false) {
  if (value == null) return "text-slate-500";

  if (positiveIsGood) {
    if (value > 0) return "text-emerald-700";
    if (value < 0) return "text-rose-700";
    return "text-slate-500";
  }

  if (value > 0) return "text-rose-700";
  if (value < 0) return "text-emerald-700";
  return "text-slate-500";
}

function formatDelta(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function actionMatchesTask(action: UnknownRecord, task: UnknownRecord) {
  if (
    sameId(action.id, task.recommended_action_id) ||
    sameId(action.id, task.snapshot_recommended_action_id) ||
    sameId(action.id, task.action_id)
  ) {
    return true;
  }

  if (sameCode(action.playbook_code, task.playbook_code)) {
    return true;
  }

  const meta = asRecord(task.metadata);
  if (
    sameId(action.id, meta.recommended_action_id) ||
    sameId(action.id, meta.snapshot_recommended_action_id) ||
    sameCode(action.playbook_code, meta.playbook_code)
  ) {
    return true;
  }

  return false;
}

function outcomeMatchesAction(
  action: UnknownRecord,
  outcome: UnknownRecord,
  relatedTasks: UnknownRecord[],
) {
  if (
    sameId(action.id, outcome.recommended_action_id) ||
    sameId(action.id, outcome.snapshot_recommended_action_id) ||
    sameId(action.id, outcome.action_id)
  ) {
    return true;
  }

  if (sameCode(action.playbook_code, outcome.playbook_code)) {
    return true;
  }

  const meta = asRecord(outcome.metadata);
  if (
    sameId(action.id, meta.recommended_action_id) ||
    sameId(action.id, meta.snapshot_recommended_action_id) ||
    sameCode(action.playbook_code, meta.playbook_code)
  ) {
    return true;
  }

  return relatedTasks.some((task) => sameId(task.id, outcome.task_id));
}

function getActionEffectiveState(
  action: UnknownRecord,
  tasks: UnknownRecord[],
  outcomes: UnknownRecord[],
) {
  const matchedTasks = tasks.filter((task) => actionMatchesTask(action, task));
  const matchedOutcomes = outcomes.filter((outcome) =>
    outcomeMatchesAction(action, outcome, matchedTasks),
  );

  const explicit = normalizeStatus(action.action_status ?? action.status);

  if (matchedOutcomes.length > 0) {
    return {
      status: "completed" as const,
      tasks: matchedTasks,
      outcomes: matchedOutcomes,
    };
  }

  if (matchedTasks.some((task) => normalizeStatus(task.status) === "completed")) {
    return {
      status: "completed" as const,
      tasks: matchedTasks,
      outcomes: matchedOutcomes,
    };
  }

  if (explicit === "completed") {
    return {
      status: "completed" as const,
      tasks: matchedTasks,
      outcomes: matchedOutcomes,
    };
  }

  if (explicit === "accepted" || matchedTasks.length > 0) {
    return {
      status: "accepted" as const,
      tasks: matchedTasks,
      outcomes: matchedOutcomes,
    };
  }

  return {
    status: explicit,
    tasks: matchedTasks,
    outcomes: matchedOutcomes,
  };
}

function timelineDate(row: UnknownRecord) {
  return textValue(
    row.created_at,
    row.updated_at,
    row.snapshot_date,
    row.next_review_at,
    row.date,
    row.occurred_at,
  );
}

function Pill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "blue" | "rose" | "amber" | "emerald";
}) {
  const className =
    tone === "blue"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : tone === "emerald"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function ScoreCard({
  label,
  value,
  hint,
  positiveHigher = false,
}: {
  label: string;
  value: unknown;
  hint: string;
  positiveHigher?: boolean;
}) {
  return (
    <div className={`rounded-[22px] border p-4 ${scoreTone(value, positiveHigher)}`}>
      <div className="text-[11px] font-black uppercase tracking-[0.14em] opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-[-0.05em]">{formatScore(value)}</div>
      <div className="mt-1 text-xs opacity-90">{hint}</div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">{value}</div>
    </div>
  );
}

function ListPanel({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>

      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 text-sm text-slate-500">{emptyText}</div>
      )}
    </div>
  );
}

export default function MonitorDetailClient({ detail }: MonitorDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const root = useMemo(() => asRecord(detail), [detail]);

  const monitor = useMemo(() => asRecord(root.monitor), [root]);
  const latestSnapshot = useMemo(() => asRecord(root.latestSnapshot), [root]);
  const previousSnapshot = useMemo(() => asRecord(root.previousSnapshot), [root]);
  const latestOutcome = useMemo(() => asRecord(root.latestOutcome), [root]);
  const viewRow = useMemo(() => asRecord(root.viewRow), [root]);
  const timeline = useMemo(() => asRecord(root.timeline), [root]);

  const monitorId = numberValue(monitor.id);

  const businessName =
    textValue(
      viewRow.business_name,
      monitor.business_name,
      monitor.businessName,
      latestSnapshot.business_name,
      monitor.name,
    ) || `모니터 ${monitorId ?? "-"}`;

  const regionName = textValue(viewRow.region_name, monitor.region_name, monitor.regionName);
  const categoryName = textValue(viewRow.category_name, monitor.category_name, monitor.categoryName);
  const address = textValue(viewRow.address, monitor.address);

  const stage = textValue(
    viewRow.stage,
    latestSnapshot.stage,
    latestSnapshot.risk_stage,
    monitor.latest_stage,
    monitor.stage,
  );
  const stageInfo = stageMeta(stage);

  const marketRiskScore = numberValue(
    viewRow.market_risk_score,
    latestSnapshot.market_risk_score,
    latestSnapshot.marketRiskScore,
    monitor.latest_market_risk_score,
    monitor.marketRiskScore,
  );

  const businessRiskScore = numberValue(
    viewRow.business_risk_score,
    latestSnapshot.business_risk_score,
    latestSnapshot.businessRiskScore,
    monitor.latest_business_risk_score,
    monitor.businessRiskScore,
  );

  const recoverabilityScore = numberValue(
    viewRow.recoverability_score,
    viewRow.rescue_chance_score,
    latestSnapshot.recoverability_score,
    latestSnapshot.recoverabilityScore,
    latestSnapshot.rescue_chance_score,
    monitor.latest_rescue_chance_score,
    monitor.recoverabilityScore,
  );

  const finalClosingRiskScore = numberValue(
    viewRow.final_closing_risk_score,
    viewRow.closing_risk_score,
    latestSnapshot.final_closing_risk_score,
    latestSnapshot.finalClosingRiskScore,
    latestSnapshot.closing_risk_score,
    latestSnapshot.risk_score,
    monitor.latest_closing_risk_score,
    monitor.closingRiskScore,
  );

  const whySummary =
    textValue(viewRow.why_summary, latestSnapshot.why_summary, root.whySummary) ||
    "현재 점수와 이유를 기준으로 즉시 개입 포인트를 정리해야 합니다.";

  const actionSummary =
    textValue(viewRow.action_summary, latestSnapshot.action_summary, root.actionSummary) ||
    "추천 액션을 바로 수락하고 작업으로 전환하세요.";

  const nextReviewAt = textValue(viewRow.next_review_at, latestSnapshot.next_review_at);

  const previousClosingRisk = numberValue(
    previousSnapshot.final_closing_risk_score,
    previousSnapshot.finalClosingRiskScore,
    previousSnapshot.closing_risk_score,
    previousSnapshot.risk_score,
  );

  const previousRecoverability = numberValue(
    previousSnapshot.recoverability_score,
    previousSnapshot.recoverabilityScore,
    previousSnapshot.rescue_chance_score,
  );

  const totalRiskDelta =
    finalClosingRiskScore != null && previousClosingRisk != null
      ? finalClosingRiskScore - previousClosingRisk
      : null;

  const recoverabilityDelta =
    recoverabilityScore != null && previousRecoverability != null
      ? recoverabilityScore - previousRecoverability
      : null;

  const reasons = useMemo(() => {
    const fromView = asArray<UnknownRecord>(viewRow.top_reasons ?? viewRow.topReasons);
    if (fromView.length > 0) return fromView;

    const fromDetail = asArray<UnknownRecord>(root.reasonRows);
    if (fromDetail.length > 0) return fromDetail;

    return asArray<UnknownRecord>(
      latestSnapshot.reasons ?? latestSnapshot.top_reasons ?? latestSnapshot.reason_rows,
    );
  }, [latestSnapshot, root.reasonRows, viewRow]);

  const actions = useMemo(() => {
    const fromView = asArray<UnknownRecord>(viewRow.top_actions ?? viewRow.topActions);
    if (fromView.length > 0) return fromView;

    const fromDetail = asArray<UnknownRecord>(root.actionRows);
    if (fromDetail.length > 0) return fromDetail;

    return asArray<UnknownRecord>(
      latestSnapshot.top_actions ??
        latestSnapshot.actions ??
        latestSnapshot.recommended_actions ??
        latestSnapshot.recommendedActions,
    );
  }, [latestSnapshot, root.actionRows, viewRow]);

  const healthSnapshots = useMemo(
    () =>
      asArray<UnknownRecord>(
        timeline.healthSnapshots ?? timeline.snapshots ?? timeline.businessHealthSnapshots,
      ),
    [timeline],
  );

  const tasks = useMemo(
    () =>
      asArray<UnknownRecord>(
        timeline.interventionTasks ?? timeline.tasks ?? timeline.intervention_tasks,
      ),
    [timeline],
  );

  const outcomes = useMemo(
    () =>
      asArray<UnknownRecord>(
        timeline.interventionOutcomes ?? timeline.outcomes ?? timeline.intervention_outcomes,
      ),
    [timeline],
  );

  const mergedActions = useMemo<ActionWithState[]>(() => {
    return actions.map((action) => {
      const resolved = getActionEffectiveState(action, tasks, outcomes);

      return {
        ...action,
        effectiveStatus: resolved.status,
        matchedTasks: [...resolved.tasks].sort((a, b) => {
          const at = new Date(textValue(a.created_at, a.updated_at) || 0).getTime();
          const bt = new Date(textValue(b.created_at, b.updated_at) || 0).getTime();
          return bt - at;
        }),
        matchedOutcomes: [...resolved.outcomes].sort((a, b) => {
          const at = new Date(textValue(a.created_at, a.updated_at) || 0).getTime();
          const bt = new Date(textValue(b.created_at, b.updated_at) || 0).getTime();
          return bt - at;
        }),
      };
    });
  }, [actions, outcomes, tasks]);

  const recommendedActions = mergedActions.filter((item) => item.effectiveStatus === "recommended");
  const acceptedActions = mergedActions.filter((item) => item.effectiveStatus === "accepted");
  const completedActions = mergedActions.filter((item) => item.effectiveStatus === "completed");

  const openTasks = useMemo(
    () => tasks.filter((task) => normalizeStatus(task.status) !== "completed"),
    [tasks],
  );

  const completedTasks = useMemo(
    () => tasks.filter((task) => normalizeStatus(task.status) === "completed"),
    [tasks],
  );

  const timelineItems = useMemo(() => {
    const snapshotItems = healthSnapshots.map((row) => ({
      type: "snapshot" as const,
      date: timelineDate(row),
      title: `스냅샷 갱신 · ${stageMeta(row.stage).label}`,
      description:
        textValue(row.why_summary, row.summary, row.action_summary) ||
        `최종 폐업위험 ${formatScore(row.final_closing_risk_score ?? row.closing_risk_score)}점`,
    }));

    const taskItems = tasks.map((row) => ({
      type: "task" as const,
      date: timelineDate(row),
      title: `작업 ${normalizeStatus(row.status) === "completed" ? "완료" : "진행"}`,
      description:
        textValue(row.title, row.description, row.playbook_code) ||
        `task #${textValue(row.id) || "-"}`,
    }));

    const outcomeItems = outcomes.map((row) => ({
      type: "outcome" as const,
      date: timelineDate(row),
      title: "결과 기록",
      description:
        textValue(row.note, row.summary, row.description, row.outcome_status, row.status) ||
        `outcome #${textValue(row.id) || "-"}`,
    }));

    return [...snapshotItems, ...taskItems, ...outcomeItems].sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
    );
  }, [healthSnapshots, outcomes, tasks]);

  const postRequest = useCallback(async (path: string, successText: string) => {
    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || (json && json.ok === false)) {
      throw new Error(json?.error ?? json?.message ?? "요청 처리 중 오류가 발생했습니다.");
    }

    setMessage({
      type: "success",
      text: successText,
    });
  }, []);

  const runPost = useCallback(
    async (path: string, key: string, successText: string) => {
      setBusyKey(key);
      setMessage(null);

      try {
        await postRequest(path, successText);
        startTransition(() => {
          router.refresh();
        });
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다.",
        });
      } finally {
        setBusyKey("");
      }
    },
    [postRequest, router, startTransition],
  );

  const runRefreshAndRebuild = useCallback(async () => {
    if (!monitorId) return;

    setBusyKey("refresh-rebuild");
    setMessage(null);

    try {
      await postRequest(`/api/monitors/${monitorId}/refresh`, `${businessName} refresh 완료`);
      await postRequest(
        `/api/monitors/${monitorId}/rebuild-health`,
        `${businessName} 빠른 재평가가 완료되었습니다.`,
      );

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "빠른 재평가 처리 중 오류가 발생했습니다.",
      });
    } finally {
      setBusyKey("");
    }
  }, [businessName, monitorId, postRequest, router, startTransition]);

  return (
    <main className="min-h-screen bg-[#f8fbff] text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="blue">Intervention Case</Pill>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${stageInfo.tone}`}
                  >
                    {stageInfo.label}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    {formatRelativeDate(
                      textValue(latestSnapshot.updated_at, monitor.updatedAt, monitor.updated_at),
                    )}
                  </span>
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  {businessName}
                </h1>

                <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
                  {regionName ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                      {regionName}
                    </span>
                  ) : null}
                  {categoryName ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                      {categoryName}
                    </span>
                  ) : null}
                  {address ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                      {address}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50/70 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">
                    왜 지금 봐야 하나
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{whySummary}</p>
                </div>

                <div className="mt-3 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5CAB]">
                    바로 할 액션
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{actionSummary}</p>
                </div>
              </div>

              <div className="grid gap-3 xl:w-[320px]">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    다음 재평가
                  </div>
                  <div className="mt-2 text-lg font-black tracking-[-0.03em] text-slate-950">
                    {nextReviewAt ? formatDate(nextReviewAt) : "미정"}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {nextReviewAt ? `${formatRelativeDate(nextReviewAt)} 기준 점검` : "다음 일정이 없습니다."}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    최근 결과
                  </div>
                  <div className="mt-2 text-base font-black tracking-[-0.02em] text-slate-950">
                    {textValue(latestOutcome.outcome_status, latestOutcome.status) || "기록 없음"}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {textValue(
                      latestOutcome.note,
                      latestOutcome.summary,
                      latestOutcome.description,
                    ) || "최근 결과 메모가 없습니다."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/monitors"
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    목록으로
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      monitorId &&
                      runPost(
                        `/api/monitors/${monitorId}/refresh`,
                        "refresh",
                        `${businessName} refresh 완료`,
                      )
                    }
                    disabled={!monitorId || busyKey === "refresh" || isPending}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyKey === "refresh" ? "refresh 중..." : "refresh"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      monitorId &&
                      runPost(
                        `/api/monitors/${monitorId}/rebuild-health`,
                        "rebuild-health",
                        `${businessName} rebuild-health 완료`,
                      )
                    }
                    disabled={!monitorId || busyKey === "rebuild-health" || isPending}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyKey === "rebuild-health" ? "rebuild 중..." : "rebuild-health"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void runRefreshAndRebuild()}
                    disabled={!monitorId || busyKey === "refresh-rebuild" || isPending}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#0B5CAB] px-4 text-sm font-semibold text-white transition hover:bg-[#084298] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyKey === "refresh-rebuild" ? "재평가 중..." : "빠른 재평가"}
                  </button>
                </div>
              </div>
            </div>

            {message ? (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {message.text}
              </div>
            ) : null}
          </section>

          <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <ScoreCard label="시장위험" value={marketRiskScore} hint="지역·업종 외부 위험" />
            <ScoreCard label="사업장위험" value={businessRiskScore} hint="현장·운영 불안정성" />
            <ScoreCard
              label="구조가능성"
              value={recoverabilityScore}
              hint="살릴 수 있는 여지"
              positiveHigher
            />
            <ScoreCard label="최종 폐업위험" value={finalClosingRiskScore} hint="개입 우선순위 기준" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <section className="space-y-6">
              <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                    Risk Drivers
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                    개입 근거
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    지금 이 케이스가 올라온 이유를 먼저 확인합니다.
                  </p>
                </div>

                <div className="mt-5 grid gap-3">
                  {reasons.length > 0 ? (
                    reasons.map((reason, index) => (
                      <div
                        key={textValue(reason.id) || `${textValue(reason.code)}-${index}`}
                        className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {textValue(reason.layer_label, reason.layerLabel) ? (
                            <Pill tone="blue">{textValue(reason.layer_label, reason.layerLabel)}</Pill>
                          ) : null}
                          {textValue(reason.code) ? <Pill>{textValue(reason.code)}</Pill> : null}
                          {numberValue(reason.weight) != null ? (
                            <Pill tone="amber">가중치 {formatScore(reason.weight)}</Pill>
                          ) : null}
                        </div>

                        <h3 className="mt-3 text-lg font-black tracking-[-0.02em] text-slate-950">
                          {textValue(reason.title) || `위험 원인 ${index + 1}`}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {textValue(reason.description, reason.detail) || "설명 없음"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                      등록된 위험 원인이 없습니다.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                    Action Queue
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                    지금 실행할 액션
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    추천 액션 수락, 작업 진행, 완료 여부가 한 번에 보이도록 정리했습니다.
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  {mergedActions.length > 0 ? (
                    mergedActions.map((action, index) => {
                      const actionId = textValue(action.id);
                      const statusInfo = statusMeta(action.effectiveStatus);
                      const openTask = action.matchedTasks.find(
                        (task) => normalizeStatus(task.status) !== "completed",
                      );
                      const latestOutcomeForAction = action.matchedOutcomes[0] ?? null;

                      const reasonCodes = uniqueStrings([
                        ...listFromUnknown(action.reason_codes),
                        ...listFromUnknown(action.reasonCodes),
                        ...listFromUnknown(action.related_reason_codes),
                        ...listFromUnknown(action.relatedReasonCodes),
                      ]);

                      const evidenceList = uniqueStrings([
                        ...listFromUnknown(action.evidence_needed),
                        ...listFromUnknown(action.evidenceNeeded),
                      ]);

                      const criteriaList = uniqueStrings([
                        ...listFromUnknown(action.success_criteria),
                        ...listFromUnknown(action.successCriteria),
                      ]);

                      return (
                        <div
                          key={actionId || `${textValue(action.playbook_code)}-${index}`}
                          className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusInfo.tone}`}
                                >
                                  {statusInfo.label}
                                </span>

                                {numberValue(action.priority) != null ? (
                                  <Pill>priority {formatScore(action.priority)}</Pill>
                                ) : null}

                                {numberValue(
                                  action.due_in_days,
                                  action.dueInDays,
                                  action.target_days,
                                  action.targetDays,
                                ) != null ? (
                                  <Pill tone="amber">
                                    {formatScore(
                                      action.due_in_days ??
                                        action.dueInDays ??
                                        action.target_days ??
                                        action.targetDays,
                                    )}
                                    일 내
                                  </Pill>
                                ) : null}

                                {textValue(action.playbook_code, action.playbookCode) ? (
                                  <Pill tone="blue">
                                    {textValue(action.playbook_code, action.playbookCode)}
                                  </Pill>
                                ) : null}
                              </div>

                              <h3 className="mt-3 text-lg font-black tracking-[-0.02em] text-slate-950">
                                {textValue(action.title) || `추천 액션 ${index + 1}`}
                              </h3>

                              <p className="mt-2 text-sm leading-7 text-slate-600">
                                {textValue(action.description, action.detail) || "설명 없음"}
                              </p>

                              {reasonCodes.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {reasonCodes.map((item) => (
                                    <Pill key={item}>{item}</Pill>
                                  ))}
                                </div>
                              ) : null}

                              {evidenceList.length > 0 || criteriaList.length > 0 ? (
                                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                                  <ListPanel
                                    title="필요한 증거"
                                    items={evidenceList}
                                    emptyText="등록된 증거 항목이 없습니다."
                                  />
                                  <ListPanel
                                    title="성공 기준"
                                    items={criteriaList}
                                    emptyText="등록된 성공 기준이 없습니다."
                                  />
                                </div>
                              ) : null}

                              {openTask ? (
                                <div className="mt-3 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                  작업 진행 중 · task #{textValue(openTask.id) || "-"} ·{" "}
                                  {textValue(
                                    openTask.title,
                                    openTask.description,
                                    openTask.playbook_code,
                                  ) || "-"}
                                </div>
                              ) : null}

                              {latestOutcomeForAction ? (
                                <div className="mt-3 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                  {textValue(
                                    latestOutcomeForAction.note,
                                    latestOutcomeForAction.summary,
                                    latestOutcomeForAction.description,
                                    latestOutcomeForAction.outcome_status,
                                    latestOutcomeForAction.status,
                                  ) || "결과가 기록되었습니다."}
                                </div>
                              ) : null}
                            </div>

                            <div className="grid grid-cols-2 gap-2 xl:w-[248px] xl:grid-cols-1">
                              {actionId && action.effectiveStatus === "recommended" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    runPost(
                                      `/api/actions/${actionId}/accept`,
                                      `accept-${actionId}`,
                                      "추천 액션을 수락했습니다.",
                                    )
                                  }
                                  disabled={busyKey === `accept-${actionId}` || isPending}
                                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#0B5CAB] bg-[#0B5CAB] px-4 text-sm font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {busyKey === `accept-${actionId}` ? "수락 중..." : "액션 수락"}
                                </button>
                              ) : null}

                              {openTask ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    runPost(
                                      `/api/tasks/${textValue(openTask.id)}/complete`,
                                      `complete-${textValue(openTask.id)}`,
                                      "작업 완료 처리가 반영되었습니다.",
                                    )
                                  }
                                  disabled={
                                    busyKey === `complete-${textValue(openTask.id)}` || isPending
                                  }
                                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {busyKey === `complete-${textValue(openTask.id)}`
                                    ? "완료 처리 중..."
                                    : "작업 완료"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                      등록된 추천 액션이 없습니다.
                    </div>
                  )}
                </div>
              </section>
            </section>

            <section className="space-y-6">
              <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Intervention Tracking
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                  개입 진행 현황
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  추천 액션 수락 이후 생성된 작업과 결과 기록을 추적합니다.
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <InfoCard label="추천 액션" value={`${recommendedActions.length}건`} />
                  <InfoCard label="진행 중 액션" value={`${acceptedActions.length}건`} />
                  <InfoCard label="완료 액션" value={`${completedActions.length}건`} />
                  <InfoCard label="결과 기록" value={`${outcomes.length}건`} />
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  <ListPanel
                    title="열린 작업"
                    items={openTasks.map(
                      (task) =>
                        textValue(task.title, task.description, task.playbook_code) ||
                        `task #${textValue(task.id) || "-"}`,
                    )}
                    emptyText="진행 중인 작업이 없습니다."
                  />

                  <ListPanel
                    title="완료된 작업"
                    items={completedTasks.map(
                      (task) =>
                        textValue(task.title, task.description, task.playbook_code) ||
                        `task #${textValue(task.id) || "-"}`,
                    )}
                    emptyText="완료된 작업이 없습니다."
                  />
                </div>
              </section>

              <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Re-Evaluation
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                  재평가 및 상태 판단
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  다음 체크 시점과 최근 결과를 기준으로 후속 조치를 정리합니다.
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                    <div className="text-xs font-semibold text-slate-500">총 위험 변화</div>
                    <div
                      className={`mt-2 text-2xl font-black tracking-[-0.03em] ${deltaTone(totalRiskDelta)}`}
                    >
                      {formatDelta(totalRiskDelta)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">이전 스냅샷 대비</div>
                  </div>

                  <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                    <div className="text-xs font-semibold text-slate-500">구조가능성 변화</div>
                    <div
                      className={`mt-2 text-2xl font-black tracking-[-0.03em] ${deltaTone(
                        recoverabilityDelta,
                        true,
                      )}`}
                    >
                      {formatDelta(recoverabilityDelta)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">이전 스냅샷 대비</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      다음 체크 시점
                    </div>
                    <div className="mt-2 text-base font-black tracking-[-0.02em] text-slate-950">
                      {nextReviewAt ? formatDate(nextReviewAt) : "미정"}
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      최근 결과 상태
                    </div>
                    <div className="mt-2 text-base font-black tracking-[-0.02em] text-slate-950">
                      {textValue(latestOutcome.outcome_status, latestOutcome.status) || "기록 없음"}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {textValue(
                        latestOutcome.note,
                        latestOutcome.summary,
                        latestOutcome.description,
                      ) || "아직 결과 메모가 없습니다."}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Timeline
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                  최근 변화
                </h2>

                <div className="mt-5 space-y-3">
                  {timelineItems.length > 0 ? (
                    timelineItems.slice(0, 12).map((item, index) => (
                      <div
                        key={`${item.type}-${item.date}-${index}`}
                        className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-sm font-black tracking-[-0.02em] text-slate-950">
                              {item.title}
                            </div>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {item.description}
                            </p>
                          </div>
                          <div className="shrink-0 text-xs text-slate-500">
                            {formatDate(item.date)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                      아직 기록된 타임라인이 없습니다.
                    </div>
                  )}
                </div>
              </section>
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}