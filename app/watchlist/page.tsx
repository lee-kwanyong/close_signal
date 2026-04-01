import Link from "next/link";
import { mutateWatchlistAction } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { getInternalUserId } from "@/lib/auth/get-internal-user";

type SearchParams = Promise<{
  region?: string;
  categoryId?: string;
}>;

type WatchlistRow = {
  id: number;
  region_code: string;
  region_name: string | null;
  category_id: number;
  category_name: string | null;
  created_at: string | null;
};

type RankingRow = {
  region_code?: string | null;
  region_name?: string | null;
  category_id?: number | string | null;
  category_name?: string | null;
  risk_score?: number | null;
  risk_grade?: string | null;
  business_count?: number | null;
  closed_count?: number | null;
  closure_rate?: number | null;
};

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Number(value).toFixed(1)}%`;
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

function gradeTone(grade?: string | null) {
  const value = String(grade || "").toLowerCase();

  if (value === "critical") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (value === "high") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (value === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await searchParams;

  const supabase = await createClient();
  const userId = await getInternalUserId();

  const [{ data: watchlistData, error: watchlistError }, { data: rankingData }] =
    await Promise.all([
      userId
        ? supabase.rpc("get_my_watchlists", { p_user_id: userId })
        : Promise.resolve({ data: [], error: null }),
      supabase.rpc("get_risk_rankings", {
        p_limit: 12,
        p_offset: 0,
        p_region_code: null,
        p_category_id: null,
      }),
    ]);

  const watchlists: WatchlistRow[] = Array.isArray(watchlistData)
    ? watchlistData.map((row: any) => ({
        id: Number(row.id),
        region_code: String(row.region_code),
        region_name: row.region_name ? String(row.region_name) : null,
        category_id: Number(row.category_id),
        category_name: row.category_name ? String(row.category_name) : null,
        created_at: row.created_at ? String(row.created_at) : null,
      }))
    : [];

  const rankings: RankingRow[] = Array.isArray(rankingData) ? rankingData : [];

  const existingKeys = new Set(
    watchlists.map((item) => `${item.region_code}:${item.category_id}`)
  );

  const suggestions = rankings
    .filter((row) => {
      const regionCode = String(row.region_code || "");
      const categoryId = Number(row.category_id || 0);
      if (!regionCode || !categoryId) return false;
      return !existingKeys.has(`${regionCode}:${categoryId}`);
    })
    .slice(0, 8);

  return (
    <main className="page-shell py-8">
      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-7 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
              Watchlist
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              관심목록
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              계속 추적할 지역·업종 조합을 저장하고, 위험 신호 변화가 있는지 빠르게 확인합니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-300">
                저장 항목
              </div>
              <div className="mt-2 text-lg font-semibold">
                {formatNumber(watchlists.length)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-300">
                추천 후보
              </div>
              <div className="mt-2 text-lg font-semibold">
                {formatNumber(suggestions.length)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {!userId ? (
        <section className="mt-6 rounded-[28px] border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            로그인 후 관심목록을 사용할 수 있습니다.
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            저장한 지역·업종 조합을 계속 추적하려면 먼저 로그인하세요.
          </p>
          <div className="mt-6">
            <Link
              href="/auth/login"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              로그인
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">저장된 관심목록</h2>
                <p className="mt-1 text-sm text-slate-500">
                  추적 중인 지역·업종 조합입니다.
                </p>
              </div>
            </div>

            {watchlistError ? (
              <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
                관심목록을 불러오지 못했습니다.
              </div>
            ) : watchlists.length === 0 ? (
              <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-500">
                  0
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-950">
                  아직 저장한 관심목록이 없습니다.
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  랭킹이나 시그널 페이지에서 지역·업종 조합을 저장해보세요.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {watchlists.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                            관심목록
                          </span>
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                            저장일 {formatDate(item.created_at)}
                          </span>
                        </div>

                        <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                          {item.region_name || item.region_code} ·{" "}
                          {item.category_name || item.category_id}
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                          지역 코드 {item.region_code} / 업종 ID {item.category_id}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/regions/${item.region_code}/${item.category_id}`}
                          className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          상세 보기
                        </Link>

                        <form action={mutateWatchlistAction}>
                          <input type="hidden" name="intent" value="remove" />
                          <input type="hidden" name="watchlist_id" value={item.id} />
                          <button
                            type="submit"
                            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            제거
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">추천 추가 대상</h2>
                <p className="mt-1 text-sm text-slate-500">
                  현재 랭킹 기준으로 우선 검토할 만한 조합입니다.
                </p>
              </div>

              <Link
                href="/rankings"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                랭킹 보기
              </Link>
            </div>

            {suggestions.length === 0 ? (
              <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-sm text-slate-500">추가로 추천할 항목이 없습니다.</p>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {suggestions.map((row, index) => {
                  const regionCode = String(row.region_code || "");
                  const categoryId = Number(row.category_id || 0);

                  return (
                    <article
                      key={`${regionCode}-${categoryId}-${index}`}
                      className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${gradeTone(
                            row.risk_grade
                          )}`}
                        >
                          {String(row.risk_grade || "unknown").toUpperCase()}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                          위험 점수 {formatNumber(row.risk_score)}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-semibold text-slate-950">
                        {row.region_name || row.region_code || "-"} ·{" "}
                        {row.category_name || row.category_id || "-"}
                      </h3>

                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                          <div className="text-xs text-slate-400">사업장 수</div>
                          <div className="mt-1 text-base font-semibold text-slate-950">
                            {formatNumber(row.business_count)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                          <div className="text-xs text-slate-400">폐업 수</div>
                          <div className="mt-1 text-base font-semibold text-slate-950">
                            {formatNumber(row.closed_count)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                          <div className="text-xs text-slate-400">폐업률</div>
                          <div className="mt-1 text-base font-semibold text-slate-950">
                            {formatPercent(row.closure_rate)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={`/regions/${regionCode}/${categoryId}`}
                          className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          상세 보기
                        </Link>

                        <form action={mutateWatchlistAction}>
                          <input type="hidden" name="intent" value="add" />
                          <input type="hidden" name="region_code" value={regionCode} />
                          <input type="hidden" name="category_id" value={categoryId} />
                          <button
                            type="submit"
                            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            관심목록 추가
                          </button>
                        </form>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}