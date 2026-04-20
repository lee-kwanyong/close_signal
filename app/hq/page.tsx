import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  brandId?: string;
}>;

type BrandOption = {
  id: number;
  brand_name: string;
};

type DashboardSummaryRow = {
  latest_snapshot_date: string | null;
  brand_count: number | null;
  store_count: number | null;
  candidate_site_count: number | null;
  high_risk_store_count: number | null;
  critical_store_count: number | null;
  recoverable_store_count: number | null;
  open_action_count: number | null;
  growth_region_count: number | null;
};

type StoreRow = {
  brand_id: number;
  brand_name: string;
  store_id: number;
  store_name: string;
  store_code: string | null;
  store_status: string | null;
  region_code: string | null;
  region_name: string | null;
  category_id: number | null;
  category_name: string | null;
  snapshot_date: string | null;
  store_risk_score: number | null;
  recovery_potential_score: number | null;
  action_priority_score: number | null;
  cannibalization_score: number | null;
  competition_pressure_score: number | null;
  risk_grade: string | null;
  recommendation: string | null;
  direct_competitor_count: number | null;
  resident_population: number | null;
  resident_population_change_12m: number | null;
  living_population_change_3m: number | null;
  estimated_sales_index: number | null;
  top_reasons: unknown;
  pending_actions: unknown;
};

type CandidateSiteRow = {
  brand_id: number;
  brand_name: string;
  candidate_site_id: number;
  site_name: string | null;
  review_status: string | null;
  region_code: string | null;
  region_name: string | null;
  category_id: number | null;
  category_name: string | null;
  snapshot_date: string | null;
  opening_fit_score: number | null;
  competition_pressure_score: number | null;
  cannibalization_score: number | null;
  risk_grade: string | null;
  recommendation: string | null;
  resident_population: number | null;
  resident_population_change_12m: number | null;
  living_population_change_3m: number | null;
  direct_competitor_count: number | null;
  saturation_index: number | null;
  estimated_sales_index: number | null;
  top_reasons: unknown;
};

type RegionRow = {
  brand_id: number;
  region_code: string;
  region_name: string | null;
  category_id: number | null;
  category_name: string | null;
  snapshot_month: string | null;
  population_growth_score: number | null;
  market_heat_score: number | null;
  opening_fit_score: number | null;
  growth_grade: string | null;
  resident_population_change_3m: number | null;
  resident_population_change_12m: number | null;
  living_population_change_3m: number | null;
  living_population_change_12m: number | null;
  same_category_poi_count: number | null;
  competitor_growth_90d: number | null;
  saturation_index: number | null;
  estimated_sales_index: number | null;
  tourism_demand_score: number | null;
  evidence: unknown;
};

type ActionRow = {
  action_id: number;
  brand_id: number;
  brand_name: string;
  store_id: number;
  store_name: string;
  region_code: string | null;
  region_name: string | null;
  category_id: number | null;
  category_name: string | null;
  snapshot_date: string | null;
  action_code: string;
  title: string;
  why_text: string | null;
  playbook_text: string | null;
  owner_type: string | null;
  priority: number | null;
  status: string | null;
  due_date: string | null;
  expected_effect: string | null;
  store_risk_score: number | null;
  recovery_potential_score: number | null;
  action_priority_score: number | null;
  recent_run_status: string | null;
  recent_result_summary: string | null;
};

type PortfolioRow = {
  brand_id: number;
  brand_key: string;
  brand_name: string;
  snapshot_month: string | null;
  total_store_count: number | null;
  active_store_count: number | null;
  high_risk_store_count: number | null;
  critical_store_count: number | null;
  recoverable_store_count: number | null;
  close_review_store_count: number | null;
  candidate_site_count: number | null;
  avg_store_risk_score: number | null;
  avg_opening_fit_score: number | null;
  avg_recovery_potential_score: number | null;
  avg_action_priority_score: number | null;
  open_action_count: number | null;
  done_action_count: number | null;
  evidence: unknown;
};

type UploadBatchRow = {
  id: number;
  brand_id: number;
  upload_name: string | null;
  upload_status: string | null;
  snapshot_date: string | null;
  total_rows: number | null;
  success_rows: number | null;
  failed_rows: number | null;
  created_store_count: number | null;
  updated_store_count: number | null;
  skipped_store_count: number | null;
  created_at: string | null;
  meta: unknown;
};

type SnapshotEventRow = {
  brand_id: number;
  snapshot_date: string | null;
  event_type: string | null;
  open_state: string | null;
};

type SnapshotEventSummary = {
  snapshotDate: string;
  newCount: number;
  reopenedCount: number;
  pausedCount: number;
  closedCount: number;
  unchangedCount: number;
};

function toOptionalNumber(value?: string) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatScore(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(Number(value))}`;
}

function formatPercent(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Number(value).toFixed(digits)}%`;
}

function formatSignedPercent(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const num = Number(value);
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(digits)}%`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildHref(
  basePath: string,
  params: Record<string, string | number | undefined | null>,
) {
  const qs = new URLSearchParams();

  Object.entries(params).forEach(([key, val]) => {
    if (val === undefined || val === null || val === "") return;
    qs.set(key, String(val));
  });

  const query = qs.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function toReasonList(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function neutralTone() {
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function scoreTone(value?: number | null) {
  const num = Number(value ?? 0);
  if (num >= 85) return "border-red-200 bg-red-50 text-red-700";
  if (num >= 70) return "border-orange-200 bg-orange-50 text-orange-700";
  if (num >= 55) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function gradeLabel(value?: string | null) {
  const v = String(value || "").toLowerCase();
  if (v === "critical") return "치명";
  if (v === "high") return "높음";
  if (v === "medium") return "주의";
  if (v === "low") return "안정";
  if (v === "growing") return "성장";
  if (v === "surging") return "급성장";
  if (v === "declining") return "감소";
  return value || "-";
}

function actionStatusTone(value?: string | null) {
  const v = String(value || "").toLowerCase();
  if (v === "recommended") return "border-sky-200 bg-sky-50 text-sky-700";
  if (v === "accepted") return "border-amber-200 bg-amber-50 text-amber-700";
  if (v === "in_progress") return "border-orange-200 bg-orange-50 text-orange-700";
  if (v === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (v === "dismissed") return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function reviewTone(value?: string | null) {
  const v = String(value || "").toLowerCase();
  if (v === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (v === "reviewing") return "border-sky-200 bg-sky-50 text-sky-700";
  if (v === "hold") return "border-amber-200 bg-amber-50 text-amber-700";
  if (v === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function batchStatusTone(value?: string | null) {
  const v = String(value || "").toLowerCase();
  if (v === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (v === "completed_with_errors") return "border-amber-200 bg-amber-50 text-amber-700";
  if (v === "processing") return "border-sky-200 bg-sky-50 text-sky-700";
  if (v === "failed") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function eventTone(type: "new" | "reopened" | "paused" | "closed") {
  if (type === "new") return "border-sky-200 bg-sky-50 text-sky-700";
  if (type === "reopened") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (type === "paused") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function growthTone(direction: "growth" | "decline", value?: number | null) {
  const num = Number(value ?? 0);

  if (direction === "decline") {
    if (num <= -8) return "border-red-200 bg-red-50 text-red-700";
    if (num <= -3) return "border-orange-200 bg-orange-50 text-orange-700";
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (num >= 8) return "border-sky-200 bg-sky-50 text-sky-700";
  if (num >= 3) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function aggregateSnapshotEvents(rows: SnapshotEventRow[]) {
  const map = new Map<string, SnapshotEventSummary>();

  rows.forEach((row) => {
    const snapshotDate = row.snapshot_date || "unknown";

    const current = map.get(snapshotDate) || {
      snapshotDate,
      newCount: 0,
      reopenedCount: 0,
      pausedCount: 0,
      closedCount: 0,
      unchangedCount: 0,
    };

    const eventType = String(row.event_type || "").toLowerCase();

    if (eventType === "new") current.newCount += 1;
    else if (eventType === "reopened") current.reopenedCount += 1;
    else if (eventType === "paused") current.pausedCount += 1;
    else if (eventType === "closed") current.closedCount += 1;
    else current.unchangedCount += 1;

    map.set(snapshotDate, current);
  });

  return [...map.values()].sort((a, b) => {
    if (a.snapshotDate === "unknown") return 1;
    if (b.snapshotDate === "unknown") return -1;
    return a.snapshotDate < b.snapshotDate ? 1 : -1;
  });
}

function StatCard({
  label,
  value,
  sub,
  tone = neutralTone(),
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tone}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      {sub ? <div className="mt-2 text-sm leading-6 text-slate-600">{sub}</div> : null}
    </div>
  );
}

function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export default async function HQDashboardPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const resolved = (await searchParams) || {};
  const selectedBrandId = toOptionalNumber(resolved.brandId);
  const supabase = await createClient();

  const brandsQuery = supabase
    .from("hq_brands")
    .select("id, brand_name")
    .eq("is_active", true)
    .order("brand_name");

  const summaryQuery = supabase.rpc("get_hq_dashboard_summary", {
    p_brand_id: selectedBrandId,
  });

  const storesQuery = supabase.rpc("get_hq_store_rankings", {
    p_brand_id: selectedBrandId,
    p_region_code: null,
    p_store_status: null,
    p_limit: 8,
    p_offset: 0,
  });

  const sitesQuery = supabase.rpc("get_hq_candidate_site_rankings", {
    p_brand_id: selectedBrandId,
    p_region_code: null,
    p_limit: 6,
    p_offset: 0,
  });

  const growthRegionsQuery = supabase.rpc("get_hq_region_growth_rankings", {
    p_brand_id: selectedBrandId,
    p_category_id: null,
    p_direction: "growth",
    p_limit: 6,
    p_offset: 0,
  });

  const declineRegionsQuery = supabase.rpc("get_hq_region_growth_rankings", {
    p_brand_id: selectedBrandId,
    p_category_id: null,
    p_direction: "decline",
    p_limit: 6,
    p_offset: 0,
  });

  const actionsQuery = supabase.rpc("get_hq_action_board", {
    p_brand_id: selectedBrandId,
    p_status: null,
    p_limit: 8,
    p_offset: 0,
  });

  let portfolioQuery = supabase
    .from("v_hq_brand_portfolio_latest")
    .select("*")
    .order("avg_action_priority_score", { ascending: false })
    .limit(selectedBrandId ? 1 : 6);

  if (selectedBrandId) {
    portfolioQuery = portfolioQuery.eq("brand_id", selectedBrandId);
  }

  let uploadBatchesQuery = supabase
    .from("hq_store_upload_batches")
    .select(
      "id, brand_id, upload_name, upload_status, snapshot_date, total_rows, success_rows, failed_rows, created_store_count, updated_store_count, skipped_store_count, created_at, meta",
    )
    .order("created_at", { ascending: false })
    .limit(6);

  if (selectedBrandId) {
    uploadBatchesQuery = uploadBatchesQuery.eq("brand_id", selectedBrandId);
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 21);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  let snapshotEventsQuery = supabase
    .from("hq_store_status_snapshots")
    .select("brand_id, snapshot_date, event_type, open_state")
    .gte("snapshot_date", cutoffDate)
    .order("snapshot_date", { ascending: false })
    .limit(400);

  if (selectedBrandId) {
    snapshotEventsQuery = snapshotEventsQuery.eq("brand_id", selectedBrandId);
  }

  const [
    brandsResult,
    summaryResult,
    storesResult,
    sitesResult,
    growthRegionsResult,
    declineRegionsResult,
    actionsResult,
    portfolioResult,
    uploadBatchesResult,
    snapshotEventsResult,
  ] = await Promise.all([
    brandsQuery,
    summaryQuery,
    storesQuery,
    sitesQuery,
    growthRegionsQuery,
    declineRegionsQuery,
    actionsQuery,
    portfolioQuery,
    uploadBatchesQuery,
    snapshotEventsQuery,
  ]);

  const brands = (brandsResult.data || []) as BrandOption[];
  const summary = ((summaryResult.data || [])[0] || null) as DashboardSummaryRow | null;
  const stores = (storesResult.data || []) as StoreRow[];
  const sites = (sitesResult.data || []) as CandidateSiteRow[];
  const growthRegions = (growthRegionsResult.data || []) as RegionRow[];
  const declineRegions = (declineRegionsResult.data || []) as RegionRow[];
  const actions = (actionsResult.data || []) as ActionRow[];
  const portfolios = (portfolioResult.data || []) as PortfolioRow[];
  const uploadBatches = (uploadBatchesResult.data || []) as UploadBatchRow[];
  const snapshotEvents = (snapshotEventsResult.data || []) as SnapshotEventRow[];

  const brandNameById = new Map<number, string>();
  brands.forEach((brand) => brandNameById.set(brand.id, brand.brand_name));

  const snapshotSummaries = aggregateSnapshotEvents(snapshotEvents).slice(0, 6);
  const latestBatch = uploadBatches[0] || null;
  const latestSnapshotSummary = snapshotSummaries[0] || null;

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                HQ OPERATING INTELLIGENCE
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                어디에 차려야 하고, 어떤 점포를 먼저 살려야 하는지
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                출점 추천, 위험 점포 조기경보, 원인 설명, 회생 액션, 지역 성장 감시,
                그리고 본사 점포 업로드/오픈·폐점 스냅샷까지 한 화면에서 운영합니다.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={buildHref("/hq/stores", { brandId: selectedBrandId ?? undefined })}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  위험 점포 보기
                </Link>
                <Link
                  href={buildHref("/hq/sites", { brandId: selectedBrandId ?? undefined })}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  출점 후보 보기
                </Link>
                <Link
                  href={buildHref("/hq/actions", { brandId: selectedBrandId ?? undefined })}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  액션 보드 보기
                </Link>
                <Link
                  href={buildHref("/hq/uploads", { brandId: selectedBrandId ?? undefined })}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-sky-300 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                >
                  점포 업로드 가기
                </Link>
              </div>
            </div>

            <form className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  브랜드
                </label>
                <select
                  name="brandId"
                  defaultValue={selectedBrandId ? String(selectedBrandId) : ""}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                >
                  <option value="">전체 브랜드</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.brand_name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="mt-auto inline-flex h-[50px] items-center justify-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                적용
              </button>
            </form>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="관리 점포"
            value={formatNumber(summary?.store_count)}
            sub={`출점 후보 ${formatNumber(summary?.candidate_site_count)}개`}
          />
          <StatCard
            label="고위험 점포"
            value={formatNumber(summary?.high_risk_store_count)}
            sub={`치명 ${formatNumber(summary?.critical_store_count)}개`}
            tone={scoreTone(summary?.high_risk_store_count)}
          />
          <StatCard
            label="회생 가능 점포"
            value={formatNumber(summary?.recoverable_store_count)}
            sub={`오픈 액션 ${formatNumber(summary?.open_action_count)}건`}
            tone="border-emerald-200 bg-emerald-50 text-emerald-700"
          />
          <StatCard
            label="성장 지역"
            value={formatNumber(summary?.growth_region_count)}
            sub={`기준일 ${formatDate(summary?.latest_snapshot_date)}`}
            tone="border-sky-200 bg-sky-50 text-sky-700"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="최근 점포 업로드 배치"
              description="본사 마스터 업로드가 최근 어떻게 들어왔는지, 성공/실패와 생성/업데이트 건수를 같이 봅니다."
              action={
                <Link
                  href={buildHref("/hq/uploads", { brandId: selectedBrandId ?? undefined })}
                  className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
                >
                  업로드 페이지
                </Link>
              }
            />

            {uploadBatches.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500">
                최근 업로드 배치가 없습니다.
              </div>
            ) : (
              <div className="grid gap-3">
                {uploadBatches.map((batch) => {
                  const brandName =
                    brandNameById.get(batch.brand_id) || `브랜드 #${batch.brand_id}`;

                  return (
                    <div
                      key={batch.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-slate-950">
                              {batch.upload_name || `업로드 #${batch.id}`}
                            </div>
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${batchStatusTone(
                                batch.upload_status,
                              )}`}
                            >
                              {batch.upload_status || "-"}
                            </span>
                          </div>

                          <div className="mt-2 text-sm text-slate-500">
                            {brandName} · 기준일 {formatDate(batch.snapshot_date)} · 실행{" "}
                            {formatDateTime(batch.created_at)}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                              총 {formatNumber(batch.total_rows)}행
                            </span>
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              성공 {formatNumber(batch.success_rows)}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              실패 {formatNumber(batch.failed_rows)}
                            </span>
                          </div>
                        </div>

                        <div className="grid min-w-full grid-cols-3 gap-2 sm:min-w-[280px]">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">
                              생성
                            </div>
                            <div className="mt-1 font-semibold text-slate-950">
                              {formatNumber(batch.created_store_count)}
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">
                              업데이트
                            </div>
                            <div className="mt-1 font-semibold text-slate-950">
                              {formatNumber(batch.updated_store_count)}
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">
                              스킵
                            </div>
                            <div className="mt-1 font-semibold text-slate-950">
                              {formatNumber(batch.skipped_store_count)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="최근 오픈·폐점 전환"
              description="최근 3주 기준으로 new / reopened / paused / closed 전환을 빠르게 요약합니다."
              action={
                <Link
                  href={buildHref("/hq/uploads", { brandId: selectedBrandId ?? undefined })}
                  className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
                >
                  상세 보기
                </Link>
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                  최신 업로드 기준일
                </div>
                <div className="mt-2 text-xl font-semibold text-sky-700">
                  {formatDate(latestBatch?.snapshot_date)}
                </div>
                <div className="mt-1 text-sm text-sky-700">
                  최근 배치 {latestBatch ? `#${latestBatch.id}` : "-"}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  최신 전환 기준일
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-950">
                  {formatDate(latestSnapshotSummary?.snapshotDate)}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  변동{" "}
                  {formatNumber(
                    latestSnapshotSummary
                      ? latestSnapshotSummary.newCount +
                          latestSnapshotSummary.reopenedCount +
                          latestSnapshotSummary.pausedCount +
                          latestSnapshotSummary.closedCount
                      : 0,
                  )}
                  건
                </div>
              </div>
            </div>

            {snapshotSummaries.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500">
                최근 스냅샷 전환 데이터가 없습니다.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {snapshotSummaries.map((group) => (
                  <div
                    key={group.snapshotDate}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">
                          기준일 {formatDate(group.snapshotDate)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          변화없음 {formatNumber(group.unchangedCount)}건
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className={`rounded-xl border px-3 py-2 ${eventTone("new")}`}>
                          <div className="text-[11px] uppercase tracking-wide">신규</div>
                          <div className="mt-1 font-semibold">
                            {formatNumber(group.newCount)}
                          </div>
                        </div>
                        <div className={`rounded-xl border px-3 py-2 ${eventTone("reopened")}`}>
                          <div className="text-[11px] uppercase tracking-wide">재오픈</div>
                          <div className="mt-1 font-semibold">
                            {formatNumber(group.reopenedCount)}
                          </div>
                        </div>
                        <div className={`rounded-xl border px-3 py-2 ${eventTone("paused")}`}>
                          <div className="text-[11px] uppercase tracking-wide">휴점</div>
                          <div className="mt-1 font-semibold">
                            {formatNumber(group.pausedCount)}
                          </div>
                        </div>
                        <div className={`rounded-xl border px-3 py-2 ${eventTone("closed")}`}>
                          <div className="text-[11px] uppercase tracking-wide">폐점</div>
                          <div className="mt-1 font-semibold">
                            {formatNumber(group.closedCount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="위험 점포 TOP"
              description="이번 주 본사가 먼저 확인해야 하는 점포입니다."
              action={
                <Link
                  href={buildHref("/hq/stores", { brandId: selectedBrandId ?? undefined })}
                  className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
                >
                  전체 보기
                </Link>
              }
            />

            <div className="grid gap-3">
              {stores.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  표시할 점포가 없습니다.
                </div>
              ) : (
                stores.map((row) => {
                  const reasons = toReasonList(row.top_reasons);
                  const pendingActions = toReasonList(row.pending_actions);

                  return (
                    <Link
                      key={row.store_id}
                      href={`/hq/stores/${row.store_id}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-200 hover:bg-sky-50/40"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-950">
                              {row.store_name}
                            </h3>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${scoreTone(
                                row.store_risk_score,
                              )}`}
                            >
                              위험 {formatScore(row.store_risk_score)}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${neutralTone()}`}
                            >
                              {gradeLabel(row.risk_grade)}
                            </span>
                          </div>

                          <div className="mt-1 text-sm text-slate-500">
                            {row.brand_name} · {row.region_name || row.region_code || "-"} ·{" "}
                            {row.category_name || row.category_id || "-"}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>우선순위 {formatScore(row.action_priority_score)}</span>
                            <span>회생 {formatScore(row.recovery_potential_score)}</span>
                            <span>경쟁압박 {formatScore(row.competition_pressure_score)}</span>
                            <span>기준일 {formatDate(row.snapshot_date)}</span>
                          </div>
                        </div>

                        <div className="grid min-w-[180px] grid-cols-2 gap-2 text-sm">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">
                              경쟁점
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {formatNumber(row.direct_competitor_count)}
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">
                              매출지수
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {formatScore(row.estimated_sales_index)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {reasons.slice(0, 3).map((reason: any, index) => (
                          <span
                            key={`${row.store_id}-reason-${index}`}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                          >
                            {reason?.reason_label || reason?.reason_code || "사유"}
                          </span>
                        ))}
                        {pendingActions.length > 0 ? (
                          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                            오픈 액션 {pendingActions.length}건
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="출점 후보 TOP"
              description="출점 적합도와 경쟁압박을 같이 봅니다."
              action={
                <Link
                  href={buildHref("/hq/sites", { brandId: selectedBrandId ?? undefined })}
                  className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
                >
                  전체 보기
                </Link>
              }
            />

            <div className="grid gap-3">
              {sites.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  표시할 후보지가 없습니다.
                </div>
              ) : (
                sites.map((row) => {
                  const reasons = toReasonList(row.top_reasons);

                  return (
                    <Link
                      key={row.candidate_site_id}
                      href={buildHref("/hq/sites", { brandId: selectedBrandId ?? undefined })}
                      className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-200 hover:bg-sky-50/40"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-950">
                          {row.site_name || `후보지 #${row.candidate_site_id}`}
                        </h3>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${scoreTone(
                            row.opening_fit_score,
                          )}`}
                        >
                          적합도 {formatScore(row.opening_fit_score)}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${reviewTone(
                            row.review_status,
                          )}`}
                        >
                          {row.review_status || "-"}
                        </span>
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        {row.brand_name} · {row.region_name || row.region_code || "-"} ·{" "}
                        {row.category_name || row.category_id || "-"}
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            경쟁압박
                          </div>
                          <div className="mt-1 font-semibold text-slate-900">
                            {formatScore(row.competition_pressure_score)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            매출지수
                          </div>
                          <div className="mt-1 font-semibold text-slate-900">
                            {formatScore(row.estimated_sales_index)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {reasons.slice(0, 3).map((reason: any, index) => (
                          <span
                            key={`${row.candidate_site_id}-reason-${index}`}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                          >
                            {reason?.reason_label || reason?.reason_code || "근거"}
                          </span>
                        ))}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="성장 지역 레이더"
              description="출점 타이밍을 공격적으로 봐도 되는 지역입니다."
              action={
                <Link
                  href={buildHref("/hq/regions", {
                    brandId: selectedBrandId ?? undefined,
                    direction: "growth",
                  })}
                  className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
                >
                  전체 보기
                </Link>
              }
            />

            <div className="grid gap-3">
              {growthRegions.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  표시할 지역이 없습니다.
                </div>
              ) : (
                growthRegions.map((row, index) => (
                  <Link
                    key={`${row.region_code}-${row.category_id}-${index}-growth`}
                    href={buildHref("/hq/regions", {
                      brandId: selectedBrandId ?? undefined,
                      direction: "growth",
                    })}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-200 hover:bg-sky-50/40"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">
                        {row.region_name || row.region_code}
                      </h3>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {row.category_name || row.category_id || "-"}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${growthTone(
                          "growth",
                          row.resident_population_change_12m,
                        )}`}
                      >
                        {gradeLabel(row.growth_grade)}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          출점적합
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatScore(row.opening_fit_score)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          인구12M
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatSignedPercent(row.resident_population_change_12m)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          상권열기
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatScore(row.market_heat_score)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="감소 지역 레이더"
              description="보수적으로 보거나 기존 점포 방어를 먼저 고민해야 하는 지역입니다."
              action={
                <Link
                  href={buildHref("/hq/regions", {
                    brandId: selectedBrandId ?? undefined,
                    direction: "decline",
                  })}
                  className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
                >
                  전체 보기
                </Link>
              }
            />

            <div className="grid gap-3">
              {declineRegions.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  표시할 지역이 없습니다.
                </div>
              ) : (
                declineRegions.map((row, index) => (
                  <Link
                    key={`${row.region_code}-${row.category_id}-${index}-decline`}
                    href={buildHref("/hq/regions", {
                      brandId: selectedBrandId ?? undefined,
                      direction: "decline",
                    })}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-orange-200 hover:bg-orange-50/40"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">
                        {row.region_name || row.region_code}
                      </h3>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {row.category_name || row.category_id || "-"}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${growthTone(
                          "decline",
                          row.resident_population_change_12m,
                        )}`}
                      >
                        {gradeLabel(row.growth_grade)}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          인구12M
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatSignedPercent(row.resident_population_change_12m)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          경쟁증가
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatPercent(row.competitor_growth_90d)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          포화지수
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatScore(row.saturation_index)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="회생 액션 보드"
            description="본사/SV/점주가 바로 움직여야 하는 액션입니다."
            action={
              <Link
                href={buildHref("/hq/actions", { brandId: selectedBrandId ?? undefined })}
                className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
              >
                전체 보기
              </Link>
            }
          />

          <div className="grid gap-3">
            {actions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500">
                표시할 액션이 없습니다.
              </div>
            ) : (
              actions.map((row) => (
                <Link
                  key={row.action_id}
                  href={buildHref("/hq/actions", { brandId: selectedBrandId ?? undefined })}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-200 hover:bg-sky-50/40"
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-950">{row.title}</h3>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${actionStatusTone(
                            row.status,
                          )}`}
                        >
                          {row.status || "-"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                          P{row.priority ?? "-"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                          {row.owner_type || "-"}
                        </span>
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        {row.brand_name} · {row.store_name} · {row.region_name || row.region_code || "-"} ·{" "}
                        {row.category_name || row.category_id || "-"}
                      </div>

                      {row.why_text ? (
                        <p className="mt-3 text-sm leading-7 text-slate-600">{row.why_text}</p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                        <span>액션코드 {row.action_code}</span>
                        <span>마감 {formatDate(row.due_date)}</span>
                        <span>최근실행 {row.recent_run_status || "-"}</span>
                      </div>

                      {row.recent_result_summary ? (
                        <div className="mt-2 text-sm text-slate-600">
                          최근 결과: {row.recent_result_summary}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid min-w-full grid-cols-3 gap-2 sm:min-w-[320px]">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          위험
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatScore(row.store_risk_score)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          회생
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatScore(row.recovery_potential_score)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          우선순위
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatScore(row.action_priority_score)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="브랜드 포트폴리오 상태"
            description="브랜드별 전체 운영 포지션과 액션 우선순위를 같이 봅니다."
          />

          {portfolios.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500">
              표시할 브랜드 포트폴리오가 없습니다.
            </div>
          ) : (
            <div className="grid gap-3">
              {portfolios.map((row) => (
                <div
                  key={row.brand_id}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-950">
                          {row.brand_name}
                        </h3>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                          {row.brand_key}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-slate-500">
                        기준월 {formatDate(row.snapshot_month)}
                      </div>
                    </div>

                    <div className="grid min-w-full grid-cols-2 gap-2 sm:min-w-[420px] sm:grid-cols-4">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          전체 점포
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatNumber(row.total_store_count)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-red-700">
                          고위험
                        </div>
                        <div className="mt-1 font-semibold text-red-700">
                          {formatNumber(row.high_risk_store_count)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-emerald-700">
                          회생 가능
                        </div>
                        <div className="mt-1 font-semibold text-emerald-700">
                          {formatNumber(row.recoverable_store_count)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-sky-700">
                          오픈 액션
                        </div>
                        <div className="mt-1 font-semibold text-sky-700">
                          {formatNumber(row.open_action_count)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        평균 위험
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatScore(row.avg_store_risk_score)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        평균 회생
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatScore(row.avg_recovery_potential_score)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        평균 우선순위
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatScore(row.avg_action_priority_score)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        출점 후보
                      </div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatNumber(row.candidate_site_count)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}