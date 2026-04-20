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

function toOptionalNumber(value?: string) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "0";
  return new Intl.NumberFormat("ko-KR").format(Number(value));
}

function formatScore(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Math.round(Number(value))}`;
}

function formatPercent(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Number(value).toFixed(digits)}%`;
}

function formatSignedPercent(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
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

function gradeLabel(value?: string | null) {
  const v = String(value || "").toLowerCase();

  if (v === "critical") return "치명";
  if (v === "high") return "높음";
  if (v === "medium") return "주의";
  if (v === "low") return "안정";
  if (v === "surging") return "급성장";
  if (v === "growing") return "성장";
  if (v === "stable") return "보합";
  if (v === "declining") return "감소";

  return value || "-";
}

function scoreTone(value?: number | null) {
  const num = Number(value ?? 0);

  if (num >= 85) return "border-red-200 bg-red-50 text-red-700";
  if (num >= 70) return "border-orange-200 bg-orange-50 text-orange-700";
  if (num >= 55) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function brandTone(value?: number | null) {
  const num = Number(value ?? 0);

  if (num >= 75) return "border-sky-200 bg-sky-50 text-sky-700";
  if (num >= 60) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (num >= 45) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
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

function statusTone(value?: string | null) {
  const v = String(value || "").toLowerCase();

  if (v === "recommended") return "border-sky-200 bg-sky-50 text-sky-700";
  if (v === "accepted") return "border-amber-200 bg-amber-50 text-amber-700";
  if (v === "in_progress") return "border-orange-200 bg-orange-50 text-orange-700";
  if (v === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (v === "dismissed") return "border-slate-200 bg-slate-50 text-slate-600";

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function toReasonList(value: unknown) {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function StatCard({
  label,
  value,
  sub,
  tone = "border-slate-200 bg-white text-slate-950",
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
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
      {text}
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

  let portfolioQuery = supabase
    .from("v_hq_brand_portfolio_latest")
    .select("*")
    .order("avg_action_priority_score", { ascending: false });

  if (selectedBrandId) {
    portfolioQuery = portfolioQuery.eq("brand_id", selectedBrandId);
  }

  portfolioQuery = portfolioQuery.limit(selectedBrandId ? 1 : 6);

  const [
    brandsResult,
    summaryResult,
    storeResult,
    siteResult,
    growthRegionResult,
    declineRegionResult,
    actionResult,
    portfolioResult,
  ] = await Promise.all([
    supabase.from("hq_brands").select("id, brand_name").eq("is_active", true).order("brand_name"),
    supabase.rpc("get_hq_dashboard_summary", {
      p_brand_id: selectedBrandId,
    }),
    supabase.rpc("get_hq_store_rankings", {
      p_brand_id: selectedBrandId,
      p_region_code: null,
      p_store_status: null,
      p_limit: 8,
      p_offset: 0,
    }),
    supabase.rpc("get_hq_candidate_site_rankings", {
      p_brand_id: selectedBrandId,
      p_region_code: null,
      p_limit: 6,
      p_offset: 0,
    }),
    supabase.rpc("get_hq_region_growth_rankings", {
      p_brand_id: selectedBrandId,
      p_category_id: null,
      p_direction: "growth",
      p_limit: 6,
      p_offset: 0,
    }),
    supabase.rpc("get_hq_region_growth_rankings", {
      p_brand_id: selectedBrandId,
      p_category_id: null,
      p_direction: "decline",
      p_limit: 6,
      p_offset: 0,
    }),
    supabase.rpc("get_hq_action_board", {
      p_brand_id: selectedBrandId,
      p_status: null,
      p_limit: 8,
      p_offset: 0,
    }),
    portfolioQuery,
  ]);

  const brands = (brandsResult.data || []) as BrandOption[];
  const summary = ((summaryResult.data || [])[0] || null) as DashboardSummaryRow | null;
  const stores = (storeResult.data || []) as StoreRow[];
  const sites = (siteResult.data || []) as CandidateSiteRow[];
  const growthRegions = (growthRegionResult.data || []) as RegionRow[];
  const declineRegions = (declineRegionResult.data || []) as RegionRow[];
  const actions = (actionResult.data || []) as ActionRow[];
  const portfolios = (portfolioResult.data || []) as PortfolioRow[];

  return (
    <main className="page-shell py-8">
      <section className="overflow-hidden rounded-[32px] border border-sky-100 bg-white shadow-[0_24px_80px_rgba(56,189,248,0.08)]">
        <div className="grid gap-8 px-6 py-7 sm:px-8 sm:py-8 xl:grid-cols-[1.15fr_0.85fr] xl:px-10 xl:py-10">
          <div>
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
              HQ Operating Intelligence
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-[44px] lg:leading-[1.08]">
              어디에 차려야 하고,
              <br />
              어떤 점포를 먼저 살려야 하는지
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              출점 추천, 부진 점포 조기경보, 인구·상권 변화, 회생 액션 우선순위를
              프렌차이즈 본사 운영 기준으로 한 화면에 모았습니다.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={buildHref("/hq/stores", { brandId: selectedBrandId ?? undefined })}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-sky-500 px-5 text-sm font-semibold text-white transition hover:bg-sky-600"
              >
                위험 점포 보기
              </Link>
              <Link
                href={buildHref("/hq/sites", { brandId: selectedBrandId ?? undefined })}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                출점 후보 보기
              </Link>
              <Link
                href={buildHref("/hq/actions", { brandId: selectedBrandId ?? undefined })}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                액션 보드 보기
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              Brand Filter
            </div>

            <form className="mt-4 grid gap-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  브랜드
                </label>
                <select
                  name="brandId"
                  defaultValue={selectedBrandId ? String(selectedBrandId) : ""}
                  className="h-12 w-full rounded-2xl border border-sky-200 bg-white px-4 text-sm outline-none"
                >
                  <option value="">전체 브랜드</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.brand_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white transition hover:bg-sky-600"
                >
                  적용
                </button>
                <Link
                  href="/hq"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  초기화
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-2xl border border-white bg-white/80 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    최신 스냅샷
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">
                    {formatDate(summary?.latest_snapshot_date)}
                  </div>
                </div>

                <div className="rounded-2xl border border-white bg-white/80 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    진행중 액션
                  </div>
                  <div className="mt-1 text-lg font-semibold text-sky-700">
                    {formatNumber(summary?.open_action_count)}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="관리 브랜드"
          value={formatNumber(summary?.brand_count)}
          tone="border-slate-200 bg-white text-slate-950"
        />
        <StatCard
          label="관리 점포"
          value={formatNumber(summary?.store_count)}
          tone="border-slate-200 bg-white text-slate-950"
        />
        <StatCard
          label="출점 후보"
          value={formatNumber(summary?.candidate_site_count)}
          tone="border-sky-200 bg-sky-50 text-sky-700"
        />
        <StatCard
          label="고위험 점포"
          value={formatNumber(summary?.high_risk_store_count)}
          sub={`치명 ${formatNumber(summary?.critical_store_count)}개`}
          tone="border-orange-200 bg-orange-50 text-orange-700"
        />
        <StatCard
          label="회복 가능 점포"
          value={formatNumber(summary?.recoverable_store_count)}
          tone="border-emerald-200 bg-emerald-50 text-emerald-700"
        />
        <StatCard
          label="진행중 액션"
          value={formatNumber(summary?.open_action_count)}
          tone="border-sky-200 bg-sky-50 text-sky-700"
        />
        <StatCard
          label="성장 지역"
          value={formatNumber(summary?.growth_region_count)}
          tone="border-sky-200 bg-sky-50 text-sky-700"
        />
        <StatCard
          label="최신 스냅샷"
          value={formatDate(summary?.latest_snapshot_date)}
          tone="border-slate-200 bg-white text-slate-950"
        />
      </section>

      <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <SectionTitle
          title="브랜드 포트폴리오"
          description="브랜드별 위험도, 출점 적합도, 회복 가능성, 액션 밀도를 함께 봅니다."
        />

        {portfolios.length === 0 ? (
          <EmptyState text="표시할 포트폴리오가 없습니다." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {portfolios.map((row) => (
              <div
                key={row.brand_id}
                className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                    {row.brand_name}
                  </h3>
                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {row.brand_key}
                  </span>
                </div>

                <div className="mt-2 text-sm text-slate-500">
                  기준월 {formatDate(row.snapshot_month)}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div
                    className={`rounded-2xl border px-4 py-3 ${brandTone(row.avg_store_risk_score)}`}
                  >
                    <div className="text-[11px] uppercase tracking-wide">평균 점포위험</div>
                    <div className="mt-1 text-lg font-semibold">
                      {formatScore(row.avg_store_risk_score)}
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border px-4 py-3 ${brandTone(row.avg_opening_fit_score)}`}
                  >
                    <div className="text-[11px] uppercase tracking-wide">평균 출점적합도</div>
                    <div className="mt-1 text-lg font-semibold">
                      {formatScore(row.avg_opening_fit_score)}
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border px-4 py-3 ${brandTone(
                      row.avg_recovery_potential_score,
                    )}`}
                  >
                    <div className="text-[11px] uppercase tracking-wide">평균 회복가능성</div>
                    <div className="mt-1 text-lg font-semibold">
                      {formatScore(row.avg_recovery_potential_score)}
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border px-4 py-3 ${brandTone(
                      row.avg_action_priority_score,
                    )}`}
                  >
                    <div className="text-[11px] uppercase tracking-wide">평균 액션우선순위</div>
                    <div className="mt-1 text-lg font-semibold">
                      {formatScore(row.avg_action_priority_score)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      전체 점포
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {formatNumber(row.total_store_count)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      고위험 점포
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {formatNumber(row.high_risk_store_count)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      출점 후보
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {formatNumber(row.candidate_site_count)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="우선 개입이 필요한 점포"
            description="위험도와 액션 우선순위가 높은 점포부터 먼저 봅니다."
            action={
              <Link
                href={buildHref("/hq/stores", { brandId: selectedBrandId ?? undefined })}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                전체 점포 보기
              </Link>
            }
          />

          {stores.length === 0 ? (
            <EmptyState text="표시할 점포가 없습니다." />
          ) : (
            <div className="grid gap-4">
              {stores.map((row) => {
                const reasons = toReasonList(row.top_reasons).slice(0, 3);

                return (
                  <div
                    key={row.store_id}
                    className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                            {row.store_name}
                          </h3>
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${scoreTone(
                              row.store_risk_score,
                            )}`}
                          >
                            위험 {formatScore(row.store_risk_score)}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                            {gradeLabel(row.risk_grade)}
                          </span>
                        </div>

                        <div className="mt-2 text-sm text-slate-500">
                          {row.brand_name} · {row.region_name || row.region_code || "-"} ·{" "}
                          {row.category_name || "-"} · 기준일 {formatDate(row.snapshot_date)}
                        </div>

                        {row.recommendation ? (
                          <div className="mt-3 text-sm leading-6 text-slate-700">
                            {row.recommendation}
                          </div>
                        ) : null}

                        {reasons.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {reasons.map((reason, index) => (
                              <span
                                key={`${row.store_id}-reason-${index}`}
                                className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                              >
                                {String(
                                  reason.reason_label ||
                                    reason.metric_value_text ||
                                    reason.reason_code ||
                                    "reason",
                                )}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid min-w-[240px] grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white bg-white px-4 py-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            회복가능성
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {formatScore(row.recovery_potential_score)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white bg-white px-4 py-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            액션우선순위
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {formatScore(row.action_priority_score)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white bg-white px-4 py-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            경쟁 압박
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {formatScore(row.competition_pressure_score)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white bg-white px-4 py-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            인구증감(12m)
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {formatSignedPercent(row.resident_population_change_12m)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="출점 우선 후보"
            description="적합도가 높고, 경쟁이 과하지 않은 후보지를 먼저 검토합니다."
            action={
              <Link
                href={buildHref("/hq/sites", { brandId: selectedBrandId ?? undefined })}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                전체 후보 보기
              </Link>
            }
          />

          {sites.length === 0 ? (
            <EmptyState text="표시할 출점 후보가 없습니다." />
          ) : (
            <div className="grid gap-4">
              {sites.map((row) => {
                const reasons = toReasonList(row.top_reasons).slice(0, 3);

                return (
                  <div
                    key={row.candidate_site_id}
                    className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                            {row.site_name || `후보지 ${row.candidate_site_id}`}
                          </h3>
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${brandTone(
                              row.opening_fit_score,
                            )}`}
                          >
                            적합도 {formatScore(row.opening_fit_score)}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                            {row.review_status || "review"}
                          </span>
                        </div>

                        <div className="mt-2 text-sm text-slate-500">
                          {row.brand_name} · {row.region_name || row.region_code || "-"} ·{" "}
                          {row.category_name || "-"} · 기준일 {formatDate(row.snapshot_date)}
                        </div>

                        {row.recommendation ? (
                          <div className="mt-3 text-sm leading-6 text-slate-700">
                            {row.recommendation}
                          </div>
                        ) : null}

                        {reasons.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {reasons.map((reason, index) => (
                              <span
                                key={`${row.candidate_site_id}-reason-${index}`}
                                className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                              >
                                {String(
                                  reason.reason_label ||
                                    reason.metric_value_text ||
                                    reason.reason_code ||
                                    "reason",
                                )}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid min-w-[240px] grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white bg-white px-4 py-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            경쟁압박
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {formatScore(row.competition_pressure_score)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white bg-white px-4 py-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            포화지수
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {formatScore(row.saturation_index)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white bg-white px-4 py-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            매출지수
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {formatScore(row.estimated_sales_index)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white bg-white px-4 py-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            인구증감(12m)
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {formatSignedPercent(row.resident_population_change_12m)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="성장 지역 레이더"
            description="인구와 상권열기가 같이 올라가는 지역을 먼저 봅니다."
            action={
              <Link
                href={buildHref("/hq/regions", {
                  brandId: selectedBrandId ?? undefined,
                  direction: "growth",
                })}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                전체 성장 지역
              </Link>
            }
          />

          {growthRegions.length === 0 ? (
            <EmptyState text="표시할 성장 지역이 없습니다." />
          ) : (
            <div className="grid gap-4">
              {growthRegions.map((row) => (
                <div
                  key={`growth-${row.region_code}-${row.category_id}`}
                  className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                      {row.region_name || row.region_code} · {row.category_name || "-"}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${growthTone(
                        "growth",
                        row.resident_population_change_12m,
                      )}`}
                    >
                      {gradeLabel(row.growth_grade)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        출점적합도
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatScore(row.opening_fit_score)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        인구증감(12m)
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatSignedPercent(row.resident_population_change_12m)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        유동증감(3m)
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatSignedPercent(row.living_population_change_3m)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="감소 지역 레이더"
            description="보수적으로 접근하거나 기존점 관리가 필요한 지역입니다."
            action={
              <Link
                href={buildHref("/hq/regions", {
                  brandId: selectedBrandId ?? undefined,
                  direction: "decline",
                })}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                전체 감소 지역
              </Link>
            }
          />

          {declineRegions.length === 0 ? (
            <EmptyState text="표시할 감소 지역이 없습니다." />
          ) : (
            <div className="grid gap-4">
              {declineRegions.map((row) => (
                <div
                  key={`decline-${row.region_code}-${row.category_id}`}
                  className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                      {row.region_name || row.region_code} · {row.category_name || "-"}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${growthTone(
                        "decline",
                        row.resident_population_change_12m,
                      )}`}
                    >
                      {gradeLabel(row.growth_grade)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        출점적합도
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatScore(row.opening_fit_score)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        인구증감(12m)
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatSignedPercent(row.resident_population_change_12m)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        경쟁증감(90d)
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatSignedPercent(row.competitor_growth_90d)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <SectionTitle
          title="회생 액션 보드 미리보기"
          description="왜 힘든지와 무엇을 해야 하는지를 한 번에 연결합니다."
          action={
            <Link
              href={buildHref("/hq/actions", { brandId: selectedBrandId ?? undefined })}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              전체 액션 보기
            </Link>
          }
        />

        {actions.length === 0 ? (
          <EmptyState text="표시할 액션이 없습니다." />
        ) : (
          <div className="grid gap-4">
            {actions.map((row) => (
              <div
                key={row.action_id}
                className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                        {row.title}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(
                          row.status,
                        )}`}
                      >
                        {row.status || "-"}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        P{row.priority ?? "-"}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-slate-500">
                      {row.brand_name} · {row.store_name} · {row.region_name || row.region_code || "-"} ·{" "}
                      {row.category_name || "-"}
                    </div>

                    {row.why_text ? (
                      <div className="mt-3 text-sm leading-6 text-slate-700">{row.why_text}</div>
                    ) : null}

                    {row.playbook_text ? (
                      <div className="mt-2 text-sm leading-6 text-slate-500">
                        {row.playbook_text}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid min-w-[240px] grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        점포위험
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatScore(row.store_risk_score)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        회복가능성
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatScore(row.recovery_potential_score)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        기대효과
                      </div>
                      <div className="mt-1 text-sm font-medium leading-6 text-slate-700">
                        {row.expected_effect || "-"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        마감일
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatDate(row.due_date)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}