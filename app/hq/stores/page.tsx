import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  brandId?: string;
  regionCode?: string;
  storeStatus?: string;
  page?: string;
}>;

type BrandOption = {
  id: number;
  brand_name: string;
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
  if (num >= 85) return "border-red-200 bg-red-50 text-red-700";
  if (num >= 70) return "border-orange-200 bg-orange-50 text-orange-700";
  if (num >= 55) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
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

export default async function HQStoresPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const resolved = (await searchParams) || {};
  const page = toPage(resolved.page);
  const selectedBrandId = toOptionalNumber(resolved.brandId);
  const selectedRegionCode = (resolved.regionCode || "").trim();
  const selectedStoreStatus = (resolved.storeStatus || "").trim();
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  const [brandsResult, storesResult] = await Promise.all([
    supabase.from("hq_brands").select("id, brand_name").eq("is_active", true).order("brand_name"),
    supabase.rpc("get_hq_store_rankings", {
      p_brand_id: selectedBrandId,
      p_region_code: selectedRegionCode || null,
      p_store_status: selectedStoreStatus || null,
      p_limit: PAGE_SIZE,
      p_offset: offset,
    }),
  ]);

  const brands = (brandsResult.data || []) as BrandOption[];
  const rows = (storesResult.data || []) as StoreRow[];

  const highRiskCount = rows.filter((row) => Number(row.store_risk_score ?? 0) >= 70).length;
  const criticalCount = rows.filter((row) => Number(row.store_risk_score ?? 0) >= 85).length;
  const avgPriority =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + Number(row.action_priority_score ?? 0), 0) / rows.length
      : 0;

  const prevHref = buildHref("/hq/stores", {
    brandId: selectedBrandId ?? undefined,
    regionCode: selectedRegionCode || undefined,
    storeStatus: selectedStoreStatus || undefined,
    page: page > 1 ? page - 1 : undefined,
  });

  const nextHref = buildHref("/hq/stores", {
    brandId: selectedBrandId ?? undefined,
    regionCode: selectedRegionCode || undefined,
    storeStatus: selectedStoreStatus || undefined,
    page: rows.length === PAGE_SIZE ? page + 1 : undefined,
  });

  return (
    <main className="page-shell py-8">
      <section className="overflow-hidden rounded-[32px] border border-sky-100 bg-white shadow-[0_24px_80px_rgba(56,189,248,0.08)]">
        <div className="flex flex-col gap-6 px-6 py-7 sm:px-8 sm:py-8 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:py-10">
          <div>
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
              HQ Store Watch
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              위험 점포를 먼저 찾고
              <br />
              회복 가능한 순서대로 개입합니다
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              점포별 위험도, 회복 가능성, 액션 우선순위를 한 번에 보고
              본사 운영팀이 어디부터 손대야 할지 빠르게 정렬합니다.
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
              href={buildHref("/hq/actions", { brandId: selectedBrandId ?? undefined })}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white transition hover:bg-sky-600"
            >
              액션 보드
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            현재 페이지
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{page}</div>
        </div>

        <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
            고위험 점포
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-orange-700">
            {formatNumber(highRiskCount)}
          </div>
          <div className="mt-2 text-sm text-orange-700">치명 {formatNumber(criticalCount)}개</div>
        </div>

        <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            평균 액션 우선순위
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-sky-700">
            {formatScore(avgPriority)}
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
              지역코드
            </label>
            <input
              name="regionCode"
              defaultValue={selectedRegionCode}
              placeholder="예: 11680"
              className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              점포상태
            </label>
            <select
              name="storeStatus"
              defaultValue={selectedStoreStatus}
              className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
            >
              <option value="">전체</option>
              <option value="active">active</option>
              <option value="warning">warning</option>
              <option value="paused">paused</option>
              <option value="closed">closed</option>
              <option value="candidate">candidate</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-[50px] flex-1 items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white transition hover:bg-sky-600"
            >
              적용
            </button>
            <Link
              href="/hq/stores"
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
            표시할 점포가 없습니다.
          </div>
        ) : (
          rows.map((row) => {
            const reasons = toReasonList(row.top_reasons);
            const actions = toReasonList(row.pending_actions);

            return (
              <Link
                key={row.store_id}
                href={`/hq/stores/${row.store_id}`}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/40"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                        {row.store_name}
                      </h2>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${scoreTone(
                          row.store_risk_score,
                        )}`}
                      >
                        위험 {formatScore(row.store_risk_score)}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                        회복 {formatScore(row.recovery_potential_score)}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                        {row.store_status || "-"}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-slate-500">
                      {row.brand_name} · {row.region_name || row.region_code || "-"} ·{" "}
                      {row.category_name || row.category_id || "-"} · 기준일 {formatDate(row.snapshot_date)}
                    </div>

                    {row.recommendation ? (
                      <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-4 text-sm leading-7 text-slate-700">
                        {row.recommendation}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {reasons.slice(0, 4).map((reason: any, index) => (
                        <span
                          key={`${row.store_id}-reason-${index}`}
                          className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700"
                        >
                          {reason?.reason_label || reason?.reason_code || "사유"}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {actions.slice(0, 3).map((action: any, index) => (
                        <span
                          key={`${row.store_id}-action-${index}`}
                          className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700"
                        >
                          {action?.title || action?.action_code || "액션"}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid min-w-full grid-cols-2 gap-3 sm:min-w-[360px] sm:grid-cols-3 xl:min-w-[460px]">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        액션 우선순위
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatScore(row.action_priority_score)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        경쟁 압박
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatScore(row.competition_pressure_score)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        잠식 위험
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatScore(row.cannibalization_score)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        경쟁점 수
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatNumber(row.direct_competitor_count)}
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

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:col-span-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        매출지수
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-950">
                        {formatScore(row.estimated_sales_index)}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
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