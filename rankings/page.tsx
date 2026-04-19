import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { mutateWatchlistAction } from "@/app/watchlist/actions";

type SearchParams = Promise<{
  regionCode?: string;
  categoryId?: string;
  page?: string;
  success?: string;
  error?: string;
}>;

type RankingRow = {
  region_code: string;
  region_name: string | null;
  category_id: number;
  category_name: string | null;
  score_date: string | null;
  risk_score: number | null;
  risk_grade: string | null;
  business_count: number | null;
  close_count_7d?: number | null;
  open_count_7d?: number | null;
  pause_count_7d?: number | null;
  resume_count_7d?: number | null;
  close_rate_7d: number | null;
  open_rate_7d: number | null;
  pause_rate_7d?: number | null;
  resume_rate_7d?: number | null;
  net_change_7d: number | null;
  close_count_30d?: number | null;
  open_count_30d?: number | null;
  pause_count_30d?: number | null;
  resume_count_30d?: number | null;
  close_rate_30d?: number | null;
  open_rate_30d?: number | null;
  pause_rate_30d?: number | null;
  resume_rate_30d?: number | null;
  net_change_30d?: number | null;
  risk_delta_7d?: number | null;
  risk_delta_30d?: number | null;
};

type WatchlistRow = {
  watchlist_id: number;
  region_code: string;
  category_id: number;
};

const PAGE_SIZE = 20;

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value.toFixed(digits)}%`;
}

function formatScore(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

function formatSigned(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  if (value > 0) return `+${value.toFixed(digits)}`;
  if (value < 0) return value.toFixed(digits);
  return digits > 0 ? `0.${"0".repeat(digits)}` : "0";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function riskTone(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  if (score >= 80) return "border-red-200 bg-red-50 text-red-700";
  if (score >= 65) return "border-amber-200 bg-amber-50 text-amber-700";
  if (score >= 45) return "border-yellow-200 bg-yellow-50 text-yellow-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function deltaTone(value: number | null | undefined) {
  if (value === null || value === undefined) return "text-slate-500";
  if (value > 0) return "text-red-600";
  if (value < 0) return "text-emerald-600";
  return "text-slate-500";
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function buildQueryString(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

async function getInternalUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) return 1;

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !data?.id) {
    console.error("getInternalUserId error", error);
    return 1;
  }

  return Number(data.id);
}

async function getRankings(params: {
  page: number;
  regionCode?: string;
  categoryId?: number;
}) {
  const supabase = await createClient();
  const offset = (params.page - 1) * PAGE_SIZE;

  const { data, error } = await supabase.rpc("get_risk_rankings", {
    p_limit: PAGE_SIZE,
    p_offset: offset,
    p_region_code: params.regionCode || null,
    p_category_id: params.categoryId ?? null,
  });

  if (error) {
    console.error("get_risk_rankings error", error);
    return [] as RankingRow[];
  }

  return (data ?? []) as RankingRow[];
}

async function getWatchlistMap(userId: number) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_my_watchlists", {
    p_user_id: userId,
  });

  if (error) {
    console.error("get_my_watchlists error", error);
    return new Map<string, number>();
  }

  const map = new Map<string, number>();
  for (const row of (data ?? []) as WatchlistRow[]) {
    map.set(`${row.region_code}:${row.category_id}`, row.watchlist_id);
  }

  return map;
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium transition",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function MessageBanner({
  success,
  error,
}: {
  success?: string;
  error?: string;
}) {
  if (!success && !error) return null;

  const message =
    success === "added"
      ? "관심목록에 추가되었습니다."
      : success === "removed"
        ? "관심목록에서 제거되었습니다."
        : error === "missing_required_fields"
          ? "필수 값이 누락되었습니다."
          : error === "invalid_user"
            ? "사용자 정보를 확인할 수 없습니다."
            : error === "watchlist_lookup_failed"
              ? "관심목록 조회에 실패했습니다."
              : error === "watchlist_not_found"
                ? "해당 관심 항목을 찾지 못했습니다."
                : error === "remove_failed"
                  ? "관심목록 해제에 실패했습니다."
                  : error === "add_failed"
                    ? "관심목록 추가에 실패했습니다."
                    : "요청을 처리하지 못했습니다.";

  const tone = success
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-red-200 bg-red-50 text-red-700";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>{message}</div>;
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const regionCode = resolved.regionCode?.trim() || undefined;
  const categoryId =
    resolved.categoryId && Number.isFinite(Number(resolved.categoryId))
      ? Number(resolved.categoryId)
      : undefined;
  const page = toPositiveInt(resolved.page, 1);

  const userId = await getInternalUserId();

  const [rows, watchlistMap] = await Promise.all([
    getRankings({ page, regionCode, categoryId }),
    getWatchlistMap(userId),
  ]);

  const prevHref = buildQueryString({
    regionCode,
    categoryId,
    page: page > 1 ? page - 1 : undefined,
  });

  const nextHref = buildQueryString({
    regionCode,
    categoryId,
    page: rows.length === PAGE_SIZE ? page + 1 : undefined,
  });

  const summaryHighRisk = rows.filter((row) => (row.risk_score ?? 0) >= 65).length;
  const summaryAvgRisk =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + (row.risk_score ?? 0), 0) / rows.length
      : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 text-sm font-medium text-slate-500">RANKINGS</div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                지역·업종 위험도 랭킹
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                지역과 업종 조합별 위험 점수, 폐업률, 순증감을 한 화면에서 비교합니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">현재 페이지</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">{page}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">고위험 항목</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">
                  {formatNumber(summaryHighRisk)}
                </div>
              </div>

              <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-1">
                <div className="text-xs uppercase tracking-wide text-slate-500">평균 위험도</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">
                  {formatScore(summaryAvgRisk)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <MessageBanner success={resolved.success} error={resolved.error} />

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <FilterChip href="/rankings" active={!regionCode && !categoryId}>
                전체
              </FilterChip>
              <FilterChip href="/signals" active={false}>
                시그널 보기
              </FilterChip>
              <FilterChip href="/watchlist" active={false}>
                관심목록
              </FilterChip>
            </div>

            <div className="text-sm text-slate-500">
              {regionCode ? (
                <span>
                  지역 필터 <span className="font-medium text-slate-900">{regionCode}</span>
                </span>
              ) : (
                <span>지역 전체</span>
              )}

              {categoryId ? (
                <span className="ml-3">
                  업종 ID <span className="font-medium text-slate-900">{categoryId}</span>
                </span>
              ) : (
                <span className="ml-3">업종 전체</span>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-sm text-slate-500">
                  <th className="px-5 py-4 font-medium">순위</th>
                  <th className="px-5 py-4 font-medium">지역 · 업종</th>
                  <th className="px-5 py-4 font-medium">위험도</th>
                  <th className="px-5 py-4 font-medium">7일 폐업률</th>
                  <th className="px-5 py-4 font-medium">7일 개업률</th>
                  <th className="px-5 py-4 font-medium">7일 순증감</th>
                  <th className="px-5 py-4 font-medium">7일 변화</th>
                  <th className="px-5 py-4 font-medium">사업장 수</th>
                  <th className="px-5 py-4 font-medium">기준일</th>
                  <th className="px-5 py-4 text-right font-medium">관심</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-16 text-center text-sm text-slate-500">
                      표시할 랭킹 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => {
                    const rank = (page - 1) * PAGE_SIZE + index + 1;
                    const watchKey = `${row.region_code}:${row.category_id}`;
                    const watchlistId = watchlistMap.get(watchKey);
                    const isWatching = Boolean(watchlistId);
                    const next = buildQueryString({
                      regionCode,
                      categoryId,
                      page,
                    });
                    const detailHref = `/regions/${encodeURIComponent(row.region_code)}/${row.category_id}`;

                    return (
                      <tr
                        key={`${row.region_code}-${row.category_id}-${rank}`}
                        className="border-b border-slate-100 align-top last:border-b-0"
                      >
                        <td className="px-5 py-5">
                          <div className="text-base font-semibold text-slate-950">{rank}</div>
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex flex-col gap-2">
                            <Link
                              href={detailHref}
                              className="text-base font-semibold tracking-tight text-slate-950 transition hover:text-slate-700"
                            >
                              {row.region_name ?? row.region_code} · {row.category_name ?? row.category_id}
                            </Link>

                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={detailHref}
                                className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
                              >
                                상세 보기
                              </Link>

                              <Link
                                href={`/signals?regionCode=${encodeURIComponent(
                                  row.region_code,
                                )}&categoryId=${row.category_id}`}
                                className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
                              >
                                관련 시그널
                              </Link>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${riskTone(
                              row.risk_score,
                            )}`}
                          >
                            {formatScore(row.risk_score)}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-sm font-medium text-slate-900">
                          {formatPercent(row.close_rate_7d)}
                        </td>

                        <td className="px-5 py-5 text-sm font-medium text-slate-900">
                          {formatPercent(row.open_rate_7d)}
                        </td>

                        <td className="px-5 py-5">
                          <span className={`text-sm font-semibold ${deltaTone(row.net_change_7d)}`}>
                            {formatSigned(row.net_change_7d, 0)}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <span className={`text-sm font-semibold ${deltaTone(row.risk_delta_7d)}`}>
                            {formatSigned(row.risk_delta_7d, 1)}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-sm text-slate-700">
                          {formatNumber(row.business_count)}
                        </td>

                        <td className="px-5 py-5 text-sm text-slate-700">
                          {formatDate(row.score_date)}
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex justify-end">
                            <form action={mutateWatchlistAction}>
                              <input type="hidden" name="user_id" value={String(userId)} />
                              <input type="hidden" name="region_code" value={row.region_code} />
                              <input type="hidden" name="category_id" value={String(row.category_id)} />
                              <input type="hidden" name="intent" value={isWatching ? "remove" : "add"} />
                              {watchlistId ? (
                                <input
                                  type="hidden"
                                  name="watchlist_id"
                                  value={String(watchlistId)}
                                />
                              ) : null}
                              <input type="hidden" name="next" value={`/rankings${next}`} />
                              <button
                                type="submit"
                                className={[
                                  "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition",
                                  isWatching
                                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                    : "bg-slate-950 text-white hover:bg-slate-800",
                                ].join(" ")}
                              >
                                {isWatching ? "저장됨" : "추가"}
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex items-center justify-between gap-3">
          <Link
            href={page > 1 ? `/rankings${prevHref}` : "#"}
            className={[
              "inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition",
              page > 1
                ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "cursor-default border border-slate-100 bg-slate-100 text-slate-400",
            ].join(" ")}
          >
            이전
          </Link>

          <div className="text-sm text-slate-500">
            페이지 <span className="font-medium text-slate-900">{page}</span>
          </div>

          <Link
            href={rows.length === PAGE_SIZE ? `/rankings${nextHref}` : "#"}
            className={[
              "inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition",
              rows.length === PAGE_SIZE
                ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "cursor-default border border-slate-100 bg-slate-100 text-slate-400",
            ].join(" ")}
          >
            다음
          </Link>
        </section>
      </div>
    </main>
  );
}