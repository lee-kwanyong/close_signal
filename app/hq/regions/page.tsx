import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  brandId?: string;
  categoryId?: string;
  direction?: string;
  page?: string;
}>;

type BrandOption = {
  id: number;
  brand_name: string;
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

function formatPercent(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Number(value).toFixed(digits)}%`;
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
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    qs.set(key, String(value));
  });
  const query = qs.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function gradeLabel(value?: string | null) {
  const v = String(value || "").toLowerCase();
  if (v === "surging") return "급성장";
  if (v === "growing") return "성장";
  if (v === "stable") return "보합";
  if (v === "declining") return "감소";
  return value || "-";
}

function growthTone(direction: string, value?: number | null) {
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

export default async function HQRegionsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const resolved = (await searchParams) || {};
  const page = toPage(resolved.page);
  const selectedBrandId = toOptionalNumber(resolved.brandId);
  const selectedCategoryId = toOptionalNumber(resolved.categoryId);
  const direction = resolved.direction === "decline" ? "decline" : "growth";
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  const [brandsResult, rowsResult] = await Promise.all([
    supabase.from("hq_brands").select("id, brand_name").eq("is_active", true).order("brand_name"),
    supabase.rpc("get_hq_region_growth_rankings", {
      p_brand_id: selectedBrandId,
      p_category_id: selectedCategoryId,
      p_direction: direction,
      p_limit: PAGE_SIZE,
      p_offset: offset,
    }),
  ]);

  const brands = (brandsResult.data || []) as BrandOption[];
  const rows = (rowsResult.data || []) as RegionRow[];

  const avgOpeningFit =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + Number(row.opening_fit_score ?? 0), 0) / rows.length
      : 0;

  const positiveCount =
    direction === "growth"
      ? rows.filter((row) => Number(row.resident_population_change_12m ?? 0) > 0).length
      : rows.filter((row) => Number(row.resident_population_change_12m ?? 0) < 0).length;

  const prevHref = buildHref("/hq/regions", {
    brandId: selectedBrandId ?? undefined,
    categoryId: selectedCategoryId ?? undefined,
    direction,
    page: page > 1 ? page - 1 : undefined,
  });

  const nextHref = buildHref("/hq/regions", {
    brandId: selectedBrandId ?? undefined,
    categoryId: selectedCategoryId ?? undefined,
    direction,
    page: rows.length === PAGE_SIZE ? page + 1 : undefined,
  });

  return (
    <main className="page-shell py-8">
      <section className="overflow-hidden rounded-[32px] border border-sky-100 bg-white shadow-[0_24px_80px_rgba(56,189,248,0.08)]">
        <div className="flex flex-col gap-6 px-6 py-7 sm:px-8 sm:py-8 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:py-10">
          <div>
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
              HQ Region Intelligence
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {direction === "decline" ? "감소 지역을 먼저 피하고" : "성장 지역을 먼저 선점하고"}
              <br />
              상권 열기를 지역 단위로 읽습니다
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              인구 증가, 생활인구 변화, 경쟁 증가, 포화지수, 관광수요를 같이 보면서
              어느 지역을 확장해야 하고 어느 지역은 보수적으로 접근해야 하는지 판단합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/hq"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              HQ 대시보드
            </Link>
            <Link
              href={buildHref("/hq/regions", {
                brandId: selectedBrandId ?? undefined,
                categoryId: selectedCategoryId ?? undefined,
                direction: direction === "growth" ? "decline" : "growth",
              })}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white transition hover:bg-sky-600"
            >
              {direction === "growth" ? "감소 지역 보기" : "성장 지역 보기"}
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            현재 페이지 지역 수
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {formatNumber(rows.length)}
          </div>
        </div>

        <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            평균 출점 적합도
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-sky-700">
            {formatScore(avgOpeningFit)}
          </div>
        </div>

        <div
          className={`rounded-3xl p-5 shadow-sm ${
            direction === "growth"
              ? "border border-emerald-200 bg-emerald-50"
              : "border border-orange-200 bg-orange-50"
          }`}
        >
          <div
            className={`text-xs font-semibold uppercase tracking-[0.16em] ${
              direction === "growth" ? "text-emerald-700" : "text-orange-700"
            }`}
          >
            {direction === "growth" ? "증가 지역 수" : "감소 지역 수"}
          </div>
          <div
            className={`mt-3 text-3xl font-semibold tracking-tight ${
              direction === "growth" ? "text-emerald-700" : "text-orange-700"
            }`}
          >
            {formatNumber(positiveCount)}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-sky-100 bg-white p-6 shadow-sm">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              브랜드
            </label>
            <select
              name="brandId"
              defaultValue={selectedBrandId ? String(selectedBrandId) : ""}
              className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
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
              카테고리 ID
            </label>
            <input
              name="categoryId"
              defaultValue={selectedCategoryId ? String(selectedCategoryId) : ""}
              placeholder="예: 101"
              className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
            />
          </div>

          <input type="hidden" name="direction" value={direction} />

          <div className="md:col-span-2 flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-[50px] flex-1 items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white transition hover:bg-sky-600"
            >
              적용
            </button>
            <Link
              href={buildHref("/hq/regions", { direction })}
              className="inline-flex h-[50px] flex-1 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              초기화
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-6 grid gap-4">
        {rows.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-sm">
            표시할 지역이 없습니다.
          </div>
        ) : (
          rows.map((row, index) => (
            <div
              key={`${row.region_code}-${row.category_id}-${index}`}
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/30"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                      {row.region_name || row.region_code}
                    </h2>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                      {row.category_name || row.category_id || "-"}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${growthTone(
                        direction,
                        row.resident_population_change_12m,
                      )}`}
                    >
                      {gradeLabel(row.growth_grade)}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    지역코드 {row.region_code} · 기준월 {formatDate(row.snapshot_month)}
                  </div>
                </div>

                <div className="grid min-w-full grid-cols-2 gap-3 sm:min-w-[360px] sm:grid-cols-3 xl:min-w-[520px]">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      출점적합
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {formatScore(row.opening_fit_score)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      상권열기
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {formatScore(row.market_heat_score)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      매출지수
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {formatScore(row.estimated_sales_index)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      인구 3M
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {formatSignedPercent(row.resident_population_change_3m)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      인구 12M
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {formatSignedPercent(row.resident_population_change_12m)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      생활 3M
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {formatSignedPercent(row.living_population_change_3m)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      경쟁 증가
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {formatPercent(row.competitor_growth_90d)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      포화지수
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {formatScore(row.saturation_index)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      관광수요
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {formatScore(row.tourism_demand_score)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:col-span-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      동일업종 점포 수
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {formatNumber(row.same_category_poi_count)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="mt-6 flex items-center justify-between gap-3">
        <Link
          href={prevHref}
          aria-disabled={page <= 1}
          className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
            page <= 1
              ? "pointer-events-none border border-slate-200 text-slate-300"
              : "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
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
              : "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
          }`}
        >
          다음
        </Link>
      </section>
    </main>
  );
}