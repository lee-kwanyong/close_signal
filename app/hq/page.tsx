import Link from "next/link";
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

function scoreTone(value?: number | null) {
  const num = Number(value ?? 0);
  if (num >= 85) return "border-red-200 bg-red-50 text-red-700";
  if (num >= 70) return "border-orange-200 bg-orange-50 text-orange-700";
  if (num >= 55) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function neutralTone() {
  return "border-slate-200 bg-slate-50 text-slate-700";
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

function toReasonList(value: unknown) {
  return Array.isArray(value) ? value : [];
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
  action?: React.ReactNode;
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
    supabase
      .from("v_hq_brand_portfolio_latest")
      .select("*")
      .order("avg_action_priority_score", { ascending: false })
      .limit(selectedBrandId ? 1 : 6),
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
                출점 추천, 위험 점포 조기경보, 원인 설명, 회생 액션, 지역 성장 감시를
                본사 운영 기준으로 한 화면에 모았습니다.
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
                            <h3 className="text-base font-semibold text-slate-950">{row.store_name}</h3>
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
              description="지금 검토 우선순위를 올릴 후보지입니다."
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
                sites.map((row) => (
                  <div
                    key={row.candidate_site_id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-950">
                          {row.site_name || `후보지 #${row.candidate_site_id}`}
                        </h3>
                        <div className="mt-1 text-sm text-slate-500">
                          {row.region_name || row.region_code || "-"} ·{" "}
                          {row.category_name || row.category_id || "-"}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${scoreTone(
                          row.opening_fit_score,
                        )}`}
                      >
                        적합도 {formatScore(row.opening_fit_score)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          인구변화
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatSignedPercent(row.resident_population_change_12m)}
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
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="성장 지역"
              description="인구와 상권열기가 올라오는 지역입니다."
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
                  표시할 성장 지역이 없습니다.
                </div>
              ) : (
                growthRegions.map((row, index) => (
                  <div
                    key={`${row.region_code}-${row.category_id}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-950">
                          {row.region_name || row.region_code} · {row.category_name || row.category_id}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          기준월 {formatDate(row.snapshot_month)}
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                        {gradeLabel(row.growth_grade)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
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
                          인구 12M
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatSignedPercent(row.resident_population_change_12m)}
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
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="감소 지역"
              description="점포 구조조정이나 보수적 출점 검토가 필요한 지역입니다."
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
                  표시할 감소 지역이 없습니다.
                </div>
              ) : (
                declineRegions.map((row, index) => (
                  <div
                    key={`${row.region_code}-${row.category_id}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-950">
                          {row.region_name || row.region_code} · {row.category_name || row.category_id}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          기준월 {formatDate(row.snapshot_month)}
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        감소 감시
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          인구 12M
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatSignedPercent(row.resident_population_change_12m)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          생활 3M
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatSignedPercent(row.living_population_change_3m)}
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
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="액션 보드"
              description="운영팀과 SV가 바로 움직여야 할 항목입니다."
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  표시할 액션이 없습니다.
                </div>
              ) : (
                actions.map((row) => (
                  <div
                    key={row.action_id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            P{row.priority ?? "-"}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                            {row.status || "-"}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                            {row.owner_type || "-"}
                          </span>
                        </div>
                        <h3 className="mt-2 text-base font-semibold text-slate-950">{row.title}</h3>
                        <div className="mt-1 text-sm text-slate-500">
                          {row.brand_name} · {row.store_name} · {row.region_name || row.region_code || "-"}
                        </div>
                        {row.why_text ? (
                          <p className="mt-2 text-sm leading-6 text-slate-600">{row.why_text}</p>
                        ) : null}
                      </div>

                      <div className="grid min-w-[180px] grid-cols-2 gap-2 text-sm">
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
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="브랜드 포트폴리오"
              description="브랜드별 본사 운영 체력을 빠르게 봅니다."
            />
            <div className="grid gap-3">
              {portfolios.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  표시할 포트폴리오가 없습니다.
                </div>
              ) : (
                portfolios.map((row) => (
                  <div
                    key={row.brand_id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-950">{row.brand_name}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          기준월 {formatDate(row.snapshot_month)}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${scoreTone(
                          row.avg_action_priority_score,
                        )}`}
                      >
                        평균 우선순위 {formatScore(row.avg_action_priority_score)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          전체 점포
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatNumber(row.total_store_count)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          고위험
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatNumber(row.high_risk_store_count)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          회생 가능
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {formatNumber(row.recoverable_store_count)}
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
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}