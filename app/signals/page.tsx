import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  page?: string;
  region?: string;
  categoryId?: string;
  q?: string;
}>;

type SignalRow = {
  signal_date?: string | null;
  region_code?: string | null;
  category_id?: number | string | null;
  category_name?: string | null;
  signal_type?: string | null;
  title?: string | null;
  description?: string | null;
};

const PAGE_SIZE = 12;
const FETCH_LIMIT = 200;

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

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function signalTone(signalType?: string | null) {
  const value = String(signalType || "").toLowerCase();

  if (value.includes("close") || value.includes("closure")) {
    return {
      badge: "border-red-200 bg-red-50 text-red-700",
      bar: "bg-red-500",
    };
  }

  if (value.includes("decline") || value.includes("drop")) {
    return {
      badge: "border-orange-200 bg-orange-50 text-orange-700",
      bar: "bg-orange-500",
    };
  }

  return {
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    bar: "bg-slate-500",
  };
}

function buildHref(
  basePath: string,
  params: {
    page?: number | string;
    region?: string;
    categoryId?: string;
    q?: string;
  }
) {
  const search = new URLSearchParams();

  if (params.page && String(params.page) !== "1") {
    search.set("page", String(params.page));
  }
  if (params.region) search.set("region", params.region);
  if (params.categoryId) search.set("categoryId", params.categoryId);
  if (params.q) search.set("q", params.q);

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export default async function SignalsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;

  const currentPage = Math.max(1, Number(resolved.page || "1") || 1);
  const selectedRegion = resolved.region || "";
  const selectedCategoryId = resolved.categoryId || "";
  const keyword = (resolved.q || "").trim().toLowerCase();

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_risk_signals_feed", {
    p_region_code: null,
    p_category_id: null,
    p_limit: FETCH_LIMIT,
  });

  const rows: SignalRow[] = Array.isArray(data) ? data : [];

  const regionOptions = Array.from(
    new Set(
      rows
        .map((row) => String(row.region_code || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "ko"));

  const categoryOptions = Array.from(
    new Map(
      rows
        .filter((row) => row.category_id !== null && row.category_id !== undefined)
        .map((row) => [
          String(row.category_id),
          {
            category_id: String(row.category_id),
            category_name: String(row.category_name || row.category_id || ""),
          },
        ])
    ).values()
  ).sort((a, b) => a.category_name.localeCompare(b.category_name, "ko"));

  const filteredRows = rows.filter((row) => {
    const regionMatch = selectedRegion
      ? String(row.region_code || "") === selectedRegion
      : true;

    const categoryMatch = selectedCategoryId
      ? String(row.category_id || "") === selectedCategoryId
      : true;

    const text = [
      row.title || "",
      row.description || "",
      row.signal_type || "",
      row.category_name || "",
      row.region_code || "",
    ]
      .join(" ")
      .toLowerCase();

    const keywordMatch = keyword ? text.includes(keyword) : true;

    return regionMatch && categoryMatch && keywordMatch;
  });

  const totalCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pagedRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);

  const latestSignalDate =
    filteredRows.length > 0
      ? filteredRows
          .map((row) => row.signal_date || "")
          .filter(Boolean)
          .sort()
          .reverse()[0] || null
      : null;

  const uniqueRegionCount = new Set(
    filteredRows.map((row) => String(row.region_code || "")).filter(Boolean)
  ).size;

  const uniqueCategoryCount = new Set(
    filteredRows.map((row) => String(row.category_id || "")).filter(Boolean)
  ).size;

  return (
    <main className="page-shell py-8">
      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-7 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
              Signals Monitor
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              위험 시그널 피드
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              저장된 시그널을 지역·업종 기준으로 확인하고, 상세 페이지로 바로 이동할 수 있습니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[430px]">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-300">
                최근 시그널 일자
              </div>
              <div className="mt-2 text-lg font-semibold">
                {formatDate(latestSignalDate)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-300">
                전체 시그널
              </div>
              <div className="mt-2 text-lg font-semibold">
                {formatNumber(totalCount)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-300">
                현재 페이지
              </div>
              <div className="mt-2 text-lg font-semibold">
                {safePage} / {totalPages}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">지역 수</div>
          <div className="mt-2 text-3xl font-semibold text-slate-950">
            {formatNumber(uniqueRegionCount)}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">업종 수</div>
          <div className="mt-2 text-3xl font-semibold text-slate-950">
            {formatNumber(uniqueCategoryCount)}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">표시 건수</div>
          <div className="mt-2 text-3xl font-semibold text-slate-950">
            {formatNumber(pagedRows.length)}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">필터</h2>
            <p className="mt-1 text-sm text-slate-500">
              지역, 업종, 키워드 기준으로 시그널을 정리합니다.
            </p>
          </div>

          <Link
            href="/signals"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            초기화
          </Link>
        </div>

        <form className="grid gap-4 lg:grid-cols-[1fr_1fr_1.3fr_auto]">
          <div>
            <label
              htmlFor="region"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              지역
            </label>
            <select
              id="region"
              name="region"
              defaultValue={selectedRegion}
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
            >
              <option value="">전체</option>
              {regionOptions.map((regionCode) => (
                <option key={regionCode} value={regionCode}>
                  {regionCode}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="categoryId"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              업종
            </label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={selectedCategoryId}
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
            >
              <option value="">전체</option>
              {categoryOptions.map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.category_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="q"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              키워드
            </label>
            <input
              id="q"
              name="q"
              defaultValue={resolved.q || ""}
              placeholder="제목, 설명, 시그널 유형 검색"
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
            />
          </div>

          <button
            type="submit"
            className="mt-auto inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            적용
          </button>
        </form>
      </div>

      {error ? (
        <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
          시그널 데이터를 불러오지 못했습니다.
        </div>
      ) : pagedRows.length === 0 ? (
        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-500">
            !
          </div>
          <h3 className="mt-5 text-xl font-semibold text-slate-950">
            표시할 시그널이 없습니다.
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            현재 DB에 저장된 시그널이 없거나, 필터 조건에 맞는 결과가 없습니다.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5">
          {pagedRows.map((row, index) => {
            const tone = signalTone(row.signal_type);
            const regionCode = String(row.region_code || "");
            const categoryId = String(row.category_id || "");
            const detailHref =
              regionCode && categoryId
                ? `/regions/${regionCode}/${categoryId}`
                : "#";

            return (
              <article
                key={`${regionCode}-${categoryId}-${row.signal_date || ""}-${index}`}
                className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
              >
                <div className={`h-1.5 w-full ${tone.bar}`} />

                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone.badge}`}
                        >
                          {row.signal_type || "signal"}
                        </span>

                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                          {formatDate(row.signal_date)}
                        </span>
                      </div>

                      <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                        {regionCode || "지역 미지정"} ·{" "}
                        {row.category_name || categoryId || "업종 미지정"}
                      </h3>

                      <div className="mt-3 text-base font-medium text-slate-900">
                        {row.title || "제목 없음"}
                      </div>

                      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                        {row.description || "설명 없음"}
                      </p>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            지역 코드
                          </div>
                          <div className="mt-2 text-lg font-semibold text-slate-950">
                            {regionCode || "-"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            업종 ID
                          </div>
                          <div className="mt-2 text-lg font-semibold text-slate-950">
                            {categoryId || "-"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            업종명
                          </div>
                          <div className="mt-2 text-lg font-semibold text-slate-950">
                            {row.category_name || "-"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-3 xl:w-[180px]">
                      <Link
                        href={detailHref}
                        className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        상세 보기
                      </Link>

                      <Link
                        href="/watchlist"
                        className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        관심목록
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            페이지 <span className="font-semibold text-slate-950">{safePage}</span> /{" "}
            <span className="font-semibold text-slate-950">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={buildHref("/signals", {
                page: Math.max(1, safePage - 1),
                region: selectedRegion,
                categoryId: selectedCategoryId,
                q: resolved.q || "",
              })}
              aria-disabled={safePage <= 1}
              className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
                safePage <= 1
                  ? "pointer-events-none border border-slate-200 text-slate-300"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              이전
            </Link>

            <Link
              href={buildHref("/signals", {
                page: Math.min(totalPages, safePage + 1),
                region: selectedRegion,
                categoryId: selectedCategoryId,
                q: resolved.q || "",
              })}
              aria-disabled={safePage >= totalPages}
              className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
                safePage >= totalPages
                  ? "pointer-events-none border border-slate-200 text-slate-300"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              다음
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}