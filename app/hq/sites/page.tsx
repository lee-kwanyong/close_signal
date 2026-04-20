import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  brandId?: string;
  regionCode?: string;
  page?: string;
}>;

type BrandOption = {
  id: number;
  brand_name: string;
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

const PAGE_SIZE = 20;

function toOptionalNumber(value?: string) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toPage(value?: string) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 1;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatScore(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(Number(value))}`;
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
  if (num >= 85) return "border-sky-300 bg-sky-50 text-sky-700";
  if (num >= 70) return "border-emerald-300 bg-emerald-50 text-emerald-700";
  if (num >= 55) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function buildHref(
  basePath: string,
  params: Record<string, string | number | undefined | null>,
) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    qs.set(key, String(value));
  });
  const query = qs.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function toReasonList(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export default async function HQSitesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const resolved = (await searchParams) || {};
  const page = toPage(resolved.page);
  const selectedBrandId = toOptionalNumber(resolved.brandId);
  const selectedRegionCode = (resolved.regionCode || "").trim();
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  const [brandsResult, sitesResult] = await Promise.all([
    supabase.from("hq_brands").select("id, brand_name").eq("is_active", true).order("brand_name"),
    supabase.rpc("get_hq_candidate_site_rankings", {
      p_brand_id: selectedBrandId,
      p_region_code: selectedRegionCode || null,
      p_limit: PAGE_SIZE,
      p_offset: offset,
    }),
  ]);

  const brands = (brandsResult.data || []) as BrandOption[];
  const rows = (sitesResult.data || []) as CandidateSiteRow[];

  const approvedCount = rows.filter((row) => Number(row.opening_fit_score ?? 0) >= 70).length;
  const riskyCount = rows.filter((row) => Number(row.competition_pressure_score ?? 0) >= 70).length;
  const avgOpeningFit =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + Number(row.opening_fit_score ?? 0), 0) / rows.length
      : 0;

  const prevHref = buildHref("/hq/sites", {
    brandId: selectedBrandId ?? undefined,
    regionCode: selectedRegionCode || undefined,
    page: page > 1 ? page - 1 : undefined,
  });

  const nextHref = buildHref("/hq/sites", {
    brandId: selectedBrandId ?? undefined,
    regionCode: selectedRegionCode || undefined,
    page: rows.length === PAGE_SIZE ? page + 1 : undefined,
  });

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                HQ CANDIDATE SITES
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                출점 후보 검토
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                어디에 차리면 좋을지, 경쟁이 과한 곳은 어디인지, 인구가 늘고 있는지
                본사 관점에서 바로 검토합니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/hq"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                HQ 대시보드
              </Link>
              <Link
                href="/hq/regions"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                지역 성장 보기
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              출점 우선 후보
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {formatNumber(approvedCount)}
            </div>
            <div className="mt-2 text-sm text-slate-500">적합도 70 이상</div>
          </div>

          <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
              경쟁 압박 후보
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-orange-700">
              {formatNumber(riskyCount)}
            </div>
            <div className="mt-2 text-sm text-orange-700">경쟁압박 70 이상</div>
          </div>

          <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              평균 출점 적합도
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-sky-700">
              {formatScore(avgOpeningFit)}
            </div>
            <div className="mt-2 text-sm text-sky-700">현재 페이지 기준</div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <form className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                브랜드
              </label>
              <select
                name="brandId"
                defaultValue={selectedBrandId ? String(selectedBrandId) : ""}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="">전체 브랜드</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.brand_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                지역코드
              </label>
              <input
                name="regionCode"
                defaultValue={selectedRegionCode}
                placeholder="예: 11680"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="md:col-span-2 flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex h-[50px] flex-1 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                적용
              </button>
              <Link
                href="/hq/sites"
                className="inline-flex h-[50px] flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                초기화
              </Link>
            </div>
          </form>
        </section>

        <section className="grid gap-4">
          {rows.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm">
              표시할 후보지가 없습니다.
            </div>
          ) : (
            rows.map((row) => {
              const reasons = toReasonList(row.top_reasons);

              return (
                <div
                  key={row.candidate_site_id}
                  className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                          {row.site_name || `후보지 #${row.candidate_site_id}`}
                        </h2>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${scoreTone(
                            row.opening_fit_score,
                          )}`}
                        >
                          적합도 {formatScore(row.opening_fit_score)}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                          {row.review_status || "-"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                          {row.recommendation || "-"}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-slate-500">
                        {row.brand_name} · {row.region_name || row.region_code || "-"} ·{" "}
                        {row.category_name || row.category_id || "-"} · 기준일 {formatDate(row.snapshot_date)}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {reasons.slice(0, 4).map((reason: any, index) => (
                          <span
                            key={`${row.candidate_site_id}-reason-${index}`}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                          >
                            {reason?.reason_label || reason?.reason_code || "사유"}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid min-w-full grid-cols-2 gap-3 sm:min-w-[360px] sm:grid-cols-3 xl:min-w-[460px]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          경쟁 압박
                        </div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">
                          {formatScore(row.competition_pressure_score)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          잠식 위험
                        </div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">
                          {formatScore(row.cannibalization_score)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          경쟁점 수
                        </div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">
                          {formatNumber(row.direct_competitor_count)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          인구 12M
                        </div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">
                          {formatSignedPercent(row.resident_population_change_12m)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          생활 3M
                        </div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">
                          {formatSignedPercent(row.living_population_change_3m)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          매출지수
                        </div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">
                          {formatScore(row.estimated_sales_index)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          포화지수
                        </div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">
                          {formatScore(row.saturation_index)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section className="flex items-center justify-between gap-3">
          <Link
            href={prevHref}
            aria-disabled={page <= 1}
            className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
              page <= 1
                ? "pointer-events-none border border-slate-200 text-slate-300"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            이전
          </Link>
          <div className="text-sm text-slate-500">페이지 {page}</div>
          <Link
            href={nextHref}
            aria-disabled={rows.length < PAGE_SIZE}
            className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
              rows.length < PAGE_SIZE
                ? "pointer-events-none border border-slate-200 text-slate-300"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            다음
          </Link>
        </section>
      </div>
    </main>
  );
}