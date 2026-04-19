import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

type MonitorRow = {
  id?: number | string | null;
  business_name?: string | null;
  business_number?: string | null;
  address?: string | null;
  region_name?: string | null;
  region_code?: string | null;
  category_name?: string | null;
  category_code?: string | null;
  latest_stage?: string | null;
  latest_market_risk_score?: number | string | null;
  latest_business_risk_score?: number | string | null;
  latest_rescue_chance_score?: number | string | null;
  latest_closing_risk_score?: number | string | null;
  last_snapshot_at?: string | null;
  trend_keywords?: string[] | string | null;
  is_active?: boolean | null;
  updated_at?: string | null;
};

type SnapshotRow = {
  id?: number | string | null;
  monitor_id?: number | string | null;
  snapshot_date?: string | null;
  stage?: string | null;
  market_risk_score?: number | string | null;
  business_risk_score?: number | string | null;
  rescue_chance_score?: number | string | null;
  closing_risk_score?: number | string | null;
  why_summary?: string | null;
  action_summary?: string | null;
  next_review_at?: string | null;
};

type ReasonRow = {
  id?: number | string | null;
  health_snapshot_id?: number | string | null;
  source_type?: string | null;
  dimension?: string | null;
  reason_code?: string | null;
  canonical_reason_code?: string | null;
  title?: string | null;
  detail?: string | null;
  weight?: number | string | null;
  severity?: string | null;
  playbook_code?: string | null;
  evidence_needed?: unknown;
  success_criteria?: unknown;
  rank_order?: number | string | null;
};

type ActionRow = {
  id?: number | string | null;
  health_snapshot_id?: number | string | null;
  playbook_code?: string | null;
  title?: string | null;
  description?: string | null;
  priority?: number | string | null;
  due_in_days?: number | string | null;
  status?: string | null;
  action_status?: string | null;
  evidence_needed?: unknown;
  success_criteria?: unknown;
  source_reason_codes?: string[] | null;
  owner_user_id?: string | null;
};

type TaskRow = {
  id?: number | string | null;
  monitor_id?: number | string | null;
  status?: string | null;
};

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function textValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function listFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => textValue(item))
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[\n,]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function formatScore(value: unknown) {
  const n = numberValue(value, NaN);
  if (!Number.isFinite(n)) return "-";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatDate(value: unknown) {
  const raw = textValue(value);
  if (!raw) return "-";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}.${String(date.getDate()).padStart(2, "0")}.`;
}

function formatBusinessNumber(value: unknown) {
  const raw = textValue(value).replace(/\D/g, "");
  if (raw.length !== 10) return textValue(value);
  return `${raw.slice(0, 3)}-${raw.slice(3, 5)}-${raw.slice(5)}`;
}

function stageMeta(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();

  switch (normalized) {
    case "last_chance":
      return {
        value: "last_chance",
        label: "마지막 기회",
        tone: "border-rose-200 bg-rose-50 text-rose-700",
        headline: "즉시 개입이 필요한 상태입니다.",
      };
    case "urgent":
      return {
        value: "urgent",
        label: "긴급",
        tone: "border-amber-200 bg-amber-50 text-amber-700",
        headline: "우선순위 높은 개입이 필요합니다.",
      };
    case "caution":
      return {
        value: "caution",
        label: "주의",
        tone: "border-yellow-200 bg-yellow-50 text-yellow-700",
        headline: "위험 신호를 추적 중입니다.",
      };
    case "observe":
      return {
        value: "observe",
        label: "관찰",
        tone: "border-sky-200 bg-sky-50 text-sky-700",
        headline: "지속 관찰이 필요한 상태입니다.",
      };
    case "closed":
      return {
        value: "closed",
        label: "폐업",
        tone: "border-slate-300 bg-slate-100 text-slate-700",
        headline: "운영 종료 상태입니다.",
      };
    default:
      return {
        value: normalized || "observe",
        label: normalized || "관찰",
        tone: "border-slate-200 bg-slate-50 text-slate-700",
        headline: "최신 상태를 확인해보세요.",
      };
  }
}

function buildHref(params: { stage?: string; dimension?: string; q?: string }) {
  const sp = new URLSearchParams();

  if (params.stage) sp.set("stage", params.stage);
  if (params.dimension) sp.set("dimension", params.dimension);
  if (params.q) sp.set("q", params.q);

  const query = sp.toString();
  return query ? `/monitors?${query}` : "/monitors";
}

function isTaskOpen(status?: string | null) {
  const value = String(status ?? "").trim().toLowerCase();
  return value !== "done" && value !== "completed" && value !== "canceled";
}

function stageRank(stage?: string | null) {
  const value = String(stage ?? "").trim().toLowerCase();

  switch (value) {
    case "last_chance":
      return 0;
    case "urgent":
      return 1;
    case "caution":
      return 2;
    case "observe":
      return 3;
    case "closed":
      return 4;
    default:
      return 5;
  }
}

function dimensionMeta(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();

  switch (normalized) {
    case "market":
      return {
        value: "market",
        label: "시장",
        tone: "border-sky-200 bg-sky-50 text-sky-700",
      };
    case "business":
      return {
        value: "business",
        label: "사업장",
        tone: "border-violet-200 bg-violet-50 text-violet-700",
      };
    case "structure":
      return {
        value: "structure",
        label: "구조",
        tone: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
      };
    default:
      return {
        value: "other",
        label: "기타",
        tone: "border-slate-200 bg-slate-50 text-slate-700",
      };
  }
}

function severityMeta(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();

  switch (normalized) {
    case "critical":
      return {
        label: "치명",
        tone: "border-rose-200 bg-rose-50 text-rose-700",
      };
    case "high":
      return {
        label: "높음",
        tone: "border-amber-200 bg-amber-50 text-amber-700",
      };
    case "mid":
      return {
        label: "중간",
        tone: "border-yellow-200 bg-yellow-50 text-yellow-700",
      };
    case "low":
    default:
      return {
        label: normalized ? normalized : "낮음",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
  }
}

function actionStateMeta(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();

  switch (normalized) {
    case "completed":
      return {
        label: "완료",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "accepted":
      return {
        label: "수락됨",
        tone: "border-amber-200 bg-amber-50 text-amber-700",
      };
    case "dismissed":
      return {
        label: "제외",
        tone: "border-slate-200 bg-slate-100 text-slate-700",
      };
    case "recommended":
    default:
      return {
        label: "추천",
        tone: "border-slate-200 bg-white text-slate-700",
      };
  }
}

function riskTone(score: unknown): "default" | "danger" | "warning" | "success" {
  const value = numberValue(score, 0);
  if (value >= 70) return "danger";
  if (value >= 45) return "warning";
  return "success";
}

function chanceTone(score: unknown): "default" | "danger" | "warning" | "success" {
  const value = numberValue(score, 0);
  if (value >= 60) return "success";
  if (value >= 35) return "warning";
  return "danger";
}

function dominantDimensionFromReasons(reasons: ReasonRow[]) {
  return dimensionMeta(reasons[0]?.dimension).value;
}

export default async function MonitorsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = await Promise.resolve(searchParams ?? {});
  const stageFilter = one(params.stage).toLowerCase();
  const dimensionFilter = one(params.dimension).toLowerCase();
  const keyword = one(params.q).toLowerCase();

  const authClient = await supabaseServer();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16">
        <EmptyState
          title="모니터는 로그인 후 사용할 수 있습니다"
          description="사업장별 이유, 액션, 증거, 재평가를 한 화면에서 관리하는 운영 공간입니다."
          actionHref="/auth/login?next=%2Fmonitors"
          actionLabel="로그인"
          secondaryHref="/auth/signup?next=%2Fmonitors"
          secondaryLabel="회원가입"
        />
      </main>
    );
  }

  const supabase = supabaseAdmin();

  const { data: targetRows, error: targetError } = await supabase
    .from("external_intel_targets")
    .select("*")
    .order("id", { ascending: false })
    .limit(300);

  if (targetError) {
    throw new Error(`external_intel_targets 조회 실패: ${targetError.message}`);
  }

  const targets = (targetRows ?? []) as MonitorRow[];
  const monitorIds = targets
    .map((row) => numberValue(row.id, -1))
    .filter((value) => value > 0);

  const [snapshotRes, taskRes] =
    monitorIds.length > 0
      ? await Promise.all([
          supabase
            .from("business_health_snapshots")
            .select(
              "id, monitor_id, snapshot_date, stage, market_risk_score, business_risk_score, rescue_chance_score, closing_risk_score, why_summary, action_summary, next_review_at",
            )
            .in("monitor_id", monitorIds)
            .order("snapshot_date", { ascending: false })
            .order("id", { ascending: false })
            .limit(1500),
          supabase
            .from("intervention_tasks")
            .select("id, monitor_id, status")
            .in("monitor_id", monitorIds)
            .order("id", { ascending: false })
            .limit(3000),
        ])
      : [
          { data: [] as SnapshotRow[], error: null },
          { data: [] as TaskRow[], error: null },
        ];

  if (snapshotRes.error) {
    throw new Error(`business_health_snapshots 조회 실패: ${snapshotRes.error.message}`);
  }

  if (taskRes.error) {
    throw new Error(`intervention_tasks 조회 실패: ${taskRes.error.message}`);
  }

  const latestSnapshotByMonitor = new Map<number, SnapshotRow>();

  for (const row of (snapshotRes.data ?? []) as SnapshotRow[]) {
    const monitorId = numberValue(row.monitor_id, -1);
    if (monitorId <= 0 || latestSnapshotByMonitor.has(monitorId)) continue;
    latestSnapshotByMonitor.set(monitorId, row);
  }

  const latestSnapshotIds = Array.from(latestSnapshotByMonitor.values())
    .map((row) => numberValue(row.id, -1))
    .filter((value) => value > 0);

  const [reasonsRes, actionsRes] =
    latestSnapshotIds.length > 0
      ? await Promise.all([
          supabase
            .from("business_snapshot_reasons")
            .select(
              "id, health_snapshot_id, source_type, dimension, reason_code, canonical_reason_code, title, detail, weight, severity, playbook_code, evidence_needed, success_criteria, rank_order",
            )
            .in("health_snapshot_id", latestSnapshotIds)
            .order("health_snapshot_id", { ascending: false })
            .order("rank_order", { ascending: true }),
          supabase
            .from("snapshot_recommended_actions")
            .select(
              "id, health_snapshot_id, playbook_code, title, description, priority, due_in_days, status, action_status, evidence_needed, success_criteria, source_reason_codes, owner_user_id",
            )
            .in("health_snapshot_id", latestSnapshotIds)
            .order("health_snapshot_id", { ascending: false })
            .order("priority", { ascending: true }),
        ])
      : [
          { data: [] as ReasonRow[], error: null },
          { data: [] as ActionRow[], error: null },
        ];

  if (reasonsRes.error) {
    throw new Error(`business_snapshot_reasons 조회 실패: ${reasonsRes.error.message}`);
  }

  if (actionsRes.error) {
    throw new Error(`snapshot_recommended_actions 조회 실패: ${actionsRes.error.message}`);
  }

  const reasonsBySnapshot = new Map<number, ReasonRow[]>();
  for (const row of (reasonsRes.data ?? []) as ReasonRow[]) {
    const snapshotId = numberValue(row.health_snapshot_id, -1);
    if (snapshotId <= 0) continue;
    const bucket = reasonsBySnapshot.get(snapshotId) ?? [];
    bucket.push(row);
    reasonsBySnapshot.set(snapshotId, bucket);
  }

  const actionsBySnapshot = new Map<number, ActionRow[]>();
  for (const row of (actionsRes.data ?? []) as ActionRow[]) {
    const snapshotId = numberValue(row.health_snapshot_id, -1);
    if (snapshotId <= 0) continue;
    const bucket = actionsBySnapshot.get(snapshotId) ?? [];
    bucket.push(row);
    actionsBySnapshot.set(snapshotId, bucket);
  }

  const openTaskCountByMonitor = new Map<number, number>();
  for (const row of (taskRes.data ?? []) as TaskRow[]) {
    const monitorId = numberValue(row.monitor_id, -1);
    if (monitorId <= 0 || !isTaskOpen(row.status)) continue;
    openTaskCountByMonitor.set(monitorId, (openTaskCountByMonitor.get(monitorId) ?? 0) + 1);
  }

  const today = new Date().toISOString().slice(0, 10);

  const stageBuckets = {
    all: targets.length,
    last_chance: 0,
    urgent: 0,
    caution: 0,
    observe: 0,
    closed: 0,
  };

  const dimensionBuckets = {
    all: targets.length,
    market: 0,
    business: 0,
    structure: 0,
    other: 0,
  };

  for (const target of targets) {
    const monitorId = numberValue(target.id, -1);
    const snapshot = latestSnapshotByMonitor.get(monitorId);
    const stage = stageMeta(snapshot?.stage || target.latest_stage).value;
    if (stage in stageBuckets) {
      stageBuckets[stage as keyof typeof stageBuckets] += 1;
    }

    const reasons = reasonsBySnapshot.get(numberValue(snapshot?.id, -1)) ?? [];
    const dimension = dominantDimensionFromReasons(reasons);
    if (dimension in dimensionBuckets) {
      dimensionBuckets[dimension as keyof typeof dimensionBuckets] += 1;
    } else {
      dimensionBuckets.other += 1;
    }
  }

  const dueReviewCount = targets.filter((target) => {
    const monitorId = numberValue(target.id, -1);
    const snapshot = latestSnapshotByMonitor.get(monitorId);
    const nextReviewAt = textValue(snapshot?.next_review_at);
    const stage = stageMeta(snapshot?.stage || target.latest_stage).value;
    return !!nextReviewAt && nextReviewAt <= today && stage !== "closed";
  }).length;

  const openTaskMonitorCount = Array.from(openTaskCountByMonitor.values()).filter(
    (count) => count > 0,
  ).length;

  const rows = targets
    .map((target) => {
      const monitorId = numberValue(target.id, -1);
      const snapshot = latestSnapshotByMonitor.get(monitorId) ?? null;
      const snapshotId = numberValue(snapshot?.id, -1);
      const reasons = reasonsBySnapshot.get(snapshotId) ?? [];
      const actions = actionsBySnapshot.get(snapshotId) ?? [];
      const dominantDimension = dominantDimensionFromReasons(reasons);
      const openTaskCount = openTaskCountByMonitor.get(monitorId) ?? 0;

      return {
        target,
        monitorId,
        snapshot,
        reasons,
        actions,
        dominantDimension,
        openTaskCount,
      };
    })
    .filter((row) => {
      const stage = stageMeta(row.snapshot?.stage || row.target.latest_stage).value;
      if (stageFilter && stage !== stageFilter) return false;
      if (dimensionFilter && row.dominantDimension !== dimensionFilter) return false;

      if (!keyword) return true;

      const corpus = [
        textValue(row.target.business_name),
        textValue(row.target.business_number),
        textValue(row.target.address),
        textValue(row.target.region_name),
        textValue(row.target.category_name),
        textValue(row.snapshot?.why_summary),
        textValue(row.snapshot?.action_summary),
        ...row.reasons.map((reason) =>
          textValue(reason.title, reason.detail, reason.canonical_reason_code, reason.reason_code),
        ),
        ...row.actions.map((action) =>
          textValue(action.title, action.description, action.playbook_code),
        ),
        ...listFromUnknown(row.target.trend_keywords),
      ]
        .join(" ")
        .toLowerCase();

      return corpus.includes(keyword);
    })
    .sort((a, b) => {
      const stageDiff =
        stageRank(a.snapshot?.stage || a.target.latest_stage) -
        stageRank(b.snapshot?.stage || b.target.latest_stage);
      if (stageDiff !== 0) return stageDiff;

      const riskDiff =
        numberValue(
          b.snapshot?.closing_risk_score ?? b.target.latest_closing_risk_score,
          0,
        ) -
        numberValue(
          a.snapshot?.closing_risk_score ?? a.target.latest_closing_risk_score,
          0,
        );
      if (riskDiff !== 0) return riskDiff;

      return b.monitorId - a.monitorId;
    });

  const stageFilters = [
    { value: "", label: `전체 ${stageBuckets.all}` },
    { value: "last_chance", label: `마지막 기회 ${stageBuckets.last_chance}` },
    { value: "urgent", label: `긴급 ${stageBuckets.urgent}` },
    { value: "caution", label: `주의 ${stageBuckets.caution}` },
    { value: "observe", label: `관찰 ${stageBuckets.observe}` },
    { value: "closed", label: `폐업 ${stageBuckets.closed}` },
  ];

  const dimensionFilters = [
    { value: "", label: `전체 ${dimensionBuckets.all}` },
    { value: "market", label: `시장 ${dimensionBuckets.market}` },
    { value: "business", label: `사업장 ${dimensionBuckets.business}` },
    { value: "structure", label: `구조 ${dimensionBuckets.structure}` },
    { value: "other", label: `기타 ${dimensionBuckets.other}` },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:py-12">
      <PageHeader
        eyebrow="Monitor OS"
        title="사업장 중심 모니터"
        description="목록 단계에서도 점수, 대표 원인, 추천 액션, 재평가 시점을 함께 보이도록 바꿨습니다."
        actions={
          <>
            <Link
              href="/monitors/new"
              className="inline-flex h-11 items-center rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              모니터 등록
            </Link>
            <Link
              href="/signals"
              className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              시그널 보기
            </Link>
          </>
        }
      />

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="전체 모니터"
          value={targets.length}
          hint="사업장 개입 대상으로 등록된 수"
        />
        <MetricCard
          label="마지막 기회"
          value={stageBuckets.last_chance}
          hint="즉시 개입이 필요한 모니터"
          tone={stageBuckets.last_chance > 0 ? "danger" : "default"}
        />
        <MetricCard
          label="재평가 도래"
          value={dueReviewCount}
          hint={`${formatDate(today)} 기준 검토일 도래`}
          tone={dueReviewCount > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="열린 태스크 보유"
          value={openTaskMonitorCount}
          hint="실행 루프가 이미 열린 모니터"
          tone={openTaskMonitorCount > 0 ? "warning" : "default"}
        />
      </section>

      <SectionCard
        title="필터"
        description="단계와 원인 차원을 함께 걸러서 진짜 개입 우선순위를 빠르게 찾습니다."
        className="mt-8"
      >
        <div className="space-y-5">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Stage
            </div>
            <div className="flex flex-wrap gap-2">
              {stageFilters.map((item) => {
                const active = (item.value || "") === stageFilter;
                return (
                  <Link
                    key={item.value || "all"}
                    href={buildHref({
                      stage: item.value,
                      dimension: dimensionFilter,
                      q: keyword,
                    })}
                    className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Dimension
            </div>
            <div className="flex flex-wrap gap-2">
              {dimensionFilters.map((item) => {
                const active = (item.value || "") === dimensionFilter;
                return (
                  <Link
                    key={item.value || "all"}
                    href={buildHref({
                      stage: stageFilter,
                      dimension: item.value,
                      q: keyword,
                    })}
                    className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <form className="flex w-full gap-2 lg:max-w-xl" action="/monitors" method="get">
            {stageFilter ? <input type="hidden" name="stage" value={stageFilter} /> : null}
            {dimensionFilter ? (
              <input type="hidden" name="dimension" value={dimensionFilter} />
            ) : null}
            <input
              type="text"
              name="q"
              defaultValue={keyword}
              placeholder="사업장명, 주소, 원인, 액션, 코드"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900"
            />
            <button
              type="submit"
              className="inline-flex h-11 shrink-0 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              검색
            </button>
          </form>
        </div>
      </SectionCard>

      <section className="mt-8 space-y-4">
        {rows.length === 0 ? (
          <EmptyState
            title="조건에 맞는 모니터가 없습니다"
            description="필터를 초기화하거나 새 모니터를 등록해보세요."
            actionHref="/monitors/new"
            actionLabel="모니터 등록"
            secondaryHref="/monitors"
            secondaryLabel="필터 초기화"
          />
        ) : (
          rows.map(
            ({
              target,
              monitorId,
              snapshot,
              reasons,
              actions,
              dominantDimension,
              openTaskCount,
            }) => {
              const stage = stageMeta(snapshot?.stage || target.latest_stage);
              const dimension = dimensionMeta(dominantDimension);
              const reviewDue =
                textValue(snapshot?.next_review_at) &&
                textValue(snapshot?.next_review_at) <= today &&
                stage.value !== "closed";

              const marketRisk = numberValue(
                snapshot?.market_risk_score ?? target.latest_market_risk_score,
                0,
              );
              const businessRisk = numberValue(
                snapshot?.business_risk_score ?? target.latest_business_risk_score,
                0,
              );
              const structurePossible = numberValue(
                snapshot?.rescue_chance_score ?? target.latest_rescue_chance_score,
                0,
              );
              const closingRisk = numberValue(
                snapshot?.closing_risk_score ?? target.latest_closing_risk_score,
                0,
              );

              const topReasons = reasons.slice(0, 3);
              const topActions = actions.slice(0, 2);

              return (
                <Link
                  key={monitorId}
                  href={`/monitors/${monitorId}`}
                  className="block rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_12px_34px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${stage.tone}`}
                        >
                          {stage.label}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${dimension.tone}`}
                        >
                          대표 차원 {dimension.label}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          열린 태스크 {openTaskCount}건
                        </span>
                        {reviewDue ? (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            재평가 도래
                          </span>
                        ) : null}
                        {target.is_active === false ? (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            비활성
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4">
                        <div className="text-2xl font-bold tracking-[-0.03em] text-slate-950">
                          {textValue(target.business_name) || "이름 없는 모니터"}
                        </div>
                        <div className="mt-2 text-sm leading-7 text-slate-600">
                          {textValue(target.address) || "주소 미입력"}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                          <span>{textValue(target.region_name) || "지역 미지정"}</span>
                          <span>{textValue(target.category_name) || "업종 미지정"}</span>
                          {textValue(target.business_number) ? (
                            <span>사업자번호 {formatBusinessNumber(target.business_number)}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                        <MetricCard
                          label="종합 폐업위험"
                          value={formatScore(closingRisk)}
                          hint="최종 합성 점수"
                          tone={riskTone(closingRisk)}
                        />
                        <MetricCard
                          label="시장위험"
                          value={formatScore(marketRisk)}
                          hint="지역·업종 압력"
                          tone={riskTone(marketRisk)}
                        />
                        <MetricCard
                          label="사업장위험"
                          value={formatScore(businessRisk)}
                          hint="행정·노출·수요"
                          tone={riskTone(businessRisk)}
                        />
                        <MetricCard
                          label="구조가능성"
                          value={formatScore(structurePossible)}
                          hint="개입 후 회복 여지"
                          tone={chanceTone(structurePossible)}
                        />
                      </div>

                      {topReasons.length > 0 ? (
                        <div className="mt-5">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            대표 원인
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-3 xl:grid-cols-2">
                            {topReasons.map((reason) => {
                              const severity = severityMeta(reason.severity);
                              const reasonDimension = dimensionMeta(reason.dimension);

                              return (
                                <div
                                  key={numberValue(reason.id)}
                                  className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4"
                                >
                                  <div className="flex flex-wrap gap-2">
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${reasonDimension.tone}`}
                                    >
                                      {reasonDimension.label}
                                    </span>
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${severity.tone}`}
                                    >
                                      {severity.label}
                                    </span>
                                  </div>

                                  <div className="mt-3 font-semibold text-slate-950">
                                    {textValue(reason.title) || "원인 미정"}
                                  </div>
                                  <div className="mt-1 text-sm leading-6 text-slate-600">
                                    {textValue(reason.detail) || "상세 설명이 없습니다."}
                                  </div>
                                  <div className="mt-2 text-xs text-slate-500">
                                    {textValue(reason.canonical_reason_code, reason.reason_code)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {topActions.length > 0 ? (
                        <div className="mt-5">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            추천 액션
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {topActions.map((action) => {
                              const state = actionStateMeta(action.action_status ?? action.status);
                              return (
                                <span
                                  key={numberValue(action.id)}
                                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${state.tone}`}
                                >
                                  {textValue(action.title) || "제목 없는 액션"}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="w-full max-w-md rounded-[1.5rem] border border-emerald-100 bg-emerald-50/40 p-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        운영 요약
                      </div>

                      <div className="mt-4 space-y-4">
                        <div>
                          <div className="text-sm font-semibold text-slate-500">왜 지금 개입하나</div>
                          <div className="mt-1 text-sm leading-6 text-slate-700">
                            {textValue(snapshot?.why_summary) || stage.headline}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-slate-500">바로 할 액션</div>
                          <div className="mt-1 text-sm leading-6 text-slate-700">
                            {textValue(snapshot?.action_summary) || "액션 정의 전"}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                          <div>
                            <div className="font-semibold text-slate-500">다음 재평가</div>
                            <div className="mt-1 text-slate-900">
                              {formatDate(snapshot?.next_review_at)}
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-slate-500">최근 스냅샷</div>
                            <div className="mt-1 text-slate-900">
                              {formatDate(snapshot?.snapshot_date || target.last_snapshot_at)}
                            </div>
                          </div>
                        </div>

                        {listFromUnknown(target.trend_keywords).length > 0 ? (
                          <div>
                            <div className="text-sm font-semibold text-slate-500">추적 키워드</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {listFromUnknown(target.trend_keywords)
                                .slice(0, 4)
                                .map((item, index) => (
                                  <span
                                    key={`${item}-${index}`}
                                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
                                  >
                                    {item}
                                  </span>
                                ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            },
          )
        )}
      </section>
    </main>
  );
}