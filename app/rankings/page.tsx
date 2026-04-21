import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { mutateWatchlistAction } from "@/app/watchlist/actions";

type SearchParams = Promise<{
  regionCode?: string;
  categoryId?: string;
  page?: string;
  sort?: string;
  success?: string;
  error?: string;
}>;

type IntegratedRankingRow = {
  snapshot_date: string | null;
  region_code: string;
  region_name: string | null;
  category_id: number;
  category_name: string | null;
  smallbiz_risk_score: number | null;
  smallbiz_close_rate_7d: number | null;
  smallbiz_close_rate_30d: number | null;
  smallbiz_open_rate_7d: number | null;
  smallbiz_open_rate_30d: number | null;
  smallbiz_net_change_7d: number | null;
  smallbiz_net_change_30d: number | null;
  smallbiz_risk_delta_7d: number | null;
  smallbiz_risk_delta_30d: number | null;
  kosis_pressure_score: number | null;
  kosis_pressure_grade: string | null;
  kosis_pressure_label: string | null;
  kosis_closed_total: number | null;
  kosis_national_share_pct: number | null;
  kosis_yoy_closed_delta_pct: number | null;
  nts_business_score: number | null;
  nts_label: string | null;
  integrated_market_score: number | null;
  integrated_final_score: number | null;
  integrated_severity: string | null;
  reason_codes: string[] | null;
  summary_text: string | null;
  recovery_direction: string | null;
};

type WatchlistRow = {
  watchlist_id: number;
  region_code: string;
  category_id: number;
};

const PAGE_SIZE = 20;

function num(value: number | null | undefined, fallback = 0) {
  return value === null || value === undefined || Number.isNaN(value)
    ? fallback
    : Number(value);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatScore(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "-";
  return Number(value).toFixed(digits);
}

function buildQueryString(params: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    q.set(key, String(value));
  });

  const str = q.toString();
  return str ? `?${str}` : "";
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function getMessageText(success?: string, error?: string) {
  if (success === "added") return "관심목록에 추가되었습니다.";
  if (success === "removed") return "관심목록에서 제거되었습니다.";
  if (error === "missing_required_fields") return "필수 값이 누락되었습니다.";
  if (error === "watchlist_lookup_failed") return "관심 상태 조회에 실패했습니다.";
  if (error === "watchlist_not_found") return "관심목록 항목을 찾지 못했습니다.";
  if (error === "remove_failed") return "관심목록 해제에 실패했습니다.";
  if (error === "add_failed") return "관심목록 추가에 실패했습니다.";
  if (error === "invalid_user") return "사용자 확인에 실패했습니다.";
  return "";
}

function MessageBanner({
  success,
  error,
}: {
  success?: string;
  error?: string;
}) {
  const message = getMessageText(success, error);

  if (!message) return null;

  const tone = success
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";

  return <div className={`rounded-xl border px-4 py-3 text-sm ${tone}`}>{message}</div>;
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex h-9 items-center justify-center rounded-full px-3 text-sm font-semibold transition",
        active
          ? "border border-[#169BF4] bg-[#169BF4] text-white shadow-sm hover:bg-[#0A84E0]"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function scoreTone(score: number | null | undefined) {
  const n = num(score, 0);

  if (score === null || score === undefined) {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }
  if (n >= 80) return "border-rose-200 bg-rose-50 text-rose-700";
  if (n >= 65) return "border-orange-200 bg-orange-50 text-orange-700";
  if (n >= 45) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-[#F2FAFF] text-[#0A6FD6]";
}

function pressureTone(grade: string | null | undefined) {
  const value = String(grade || "").toLowerCase();

  if (value === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (value === "high") return "border-orange-200 bg-orange-50 text-orange-700";
  if (value === "moderate") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-[#F2FAFF] text-[#0A6FD6]";
}

function ntsTone(score: number | null | undefined) {
  const n = num(score, 0);

  if (score === null || score === undefined) {
    return "border-slate-200 bg-slate-50 text-slate-500";
  }
  if (n >= 70) return "border-rose-200 bg-rose-50 text-rose-700";
  if (n >= 50) return "border-orange-200 bg-orange-50 text-orange-700";
  if (n >= 35) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-[#F2FAFF] text-[#0A6FD6]";
}

function severityLabel(severity: string | null | undefined) {
  const value = String(severity || "").toLowerCase();

  if (value === "critical") return "치명";
  if (value === "high") return "높음";
  if (value === "moderate") return "주의";
  return "관찰";
}

function normalizeRegionCode(code?: string | null) {
  const raw = String(code || "").trim().toUpperCase();
  if (!raw) return "";

  const aliasMap: Record<string, string> = {
    "11": "KR-11",
    "26": "KR-26",
    "27": "KR-27",
    "28": "KR-28",
    "29": "KR-29",
    "30": "KR-30",
    "31": "KR-31",
    "36": "KR-36",
    "41": "KR-41",
    "42": "KR-42",
    "43": "KR-43",
    "44": "KR-44",
    "45": "KR-45",
    "46": "KR-46",
    "47": "KR-47",
    "48": "KR-48",
    "50": "KR-50",
    A01: "KR-11",
    A02: "KR-26",
    A03: "KR-41",
    A04: "KR-27",
    A05: "KR-28",
    A06: "KR-29",
    A07: "KR-30",
    A08: "KR-31",
    A09: "KR-36",
    A10: "KR-42",
    A11: "KR-43",
    A12: "KR-44",
    A13: "KR-45",
    A14: "KR-46",
    A15: "KR-47",
    A16: "KR-48",
    A17: "KR-50",
  };

  if (aliasMap[raw]) return aliasMap[raw];
  if (/^KR-\d{2}$/.test(raw)) return raw;
  return raw;
}

function candidateRegionCodes(input?: string | null) {
  const raw = String(input || "").trim();
  if (!raw) return [];

  const normalized = normalizeRegionCode(raw);
  const set = new Set<string>([raw, raw.toUpperCase(), normalized]);

  if (/^KR-\d{2}$/i.test(normalized)) {
    set.add(normalized.slice(3));
  }

  return Array.from(set).filter(Boolean);
}

async function getInternalUserId() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return null;

    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!data?.id) return null;
    return data.id as number;
  } catch {
    return null;
  }
}

async function getWatchlistMap(userId: number | null) {
  if (!userId) return new Map<string, number>();

  try {
    const supabase = await createClient();

    const { data } = await supabase.rpc("get_my_watchlists", {
      p_user_id: userId,
    });

    const map = new Map<string, number>();
    for (const row of (data ?? []) as WatchlistRow[]) {
      map.set(`${row.region_code}:${row.category_id}`, row.watchlist_id);
    }
    return map;
  } catch {
    return new Map<string, number>();
  }
}

async function getIntegratedRankings(params: {
  page: number;
  regionCode?: string;
  categoryId?: number;
  sort?: string;
}) {
  try {
    const supabase = await createClient();
    const offset = (params.page - 1) * PAGE_SIZE;
    const sort = params.sort || "final";

    let query = supabase
      .from("integrated_region_category_baselines")
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);

    if (params.regionCode) {
      query = query.in("region_code", candidateRegionCodes(params.regionCode));
    }

    if (params.categoryId) {
      query = query.eq("category_id", params.categoryId);
    }

    if (sort === "market") {
      query = query
        .order("integrated_market_score", { ascending: false })
        .order("integrated_final_score", { ascending: false });
    } else if (sort === "kosis") {
      query = query
        .order("kosis_pressure_score", { ascending: false })
        .order("integrated_final_score", { ascending: false });
    } else if (sort === "nts") {
      query = query
        .order("nts_business_score", { ascending: false })
        .order("integrated_final_score", { ascending: false });
    } else if (sort === "smallbiz") {
      query = query
        .order("smallbiz_risk_score", { ascending: false })
        .order("integrated_final_score", { ascending: false });
    } else {
      query = query
        .order("integrated_final_score", { ascending: false })
        .order("integrated_market_score", { ascending: false });
    }

    const { data } = await query;
    return (data ?? []) as IntegratedRankingRow[];
  } catch {
    return [] as IntegratedRankingRow[];
  }
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
  const sort = resolved.sort?.trim() || "final";

  const userId = await getInternalUserId();

  const [rows, watchlistMap] = await Promise.all([
    getIntegratedRankings({ page, regionCode, categoryId, sort }),
    getWatchlistMap(userId),
  ]);

  const prevHref = buildQueryString({
    regionCode,
    categoryId,
    sort,
    page: page > 1 ? page - 1 : undefined,
  });

  const nextHref = buildQueryString({
    regionCode,
    categoryId,
    sort,
    page: rows.length === PAGE_SIZE ? page + 1 : undefined,
  });

  const summaryHighRisk = rows.filter((row) => num(row.integrated_final_score, 0) >= 65).length;
  const summaryAvgRisk =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + num(row.integrated_final_score, 0), 0) / rows.length
      : null;

  const externalCriticalCount = rows.filter(
    (row) => String(row.kosis_pressure_grade || "").toLowerCase() === "critical",
  ).length;

  const ntsWarningCount = rows.filter((row) => num(row.nts_business_score, 0) >= 50).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-5 sm:px-4 lg:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-1 text-[11px] font-black tracking-[0.18em] text-[#0A6FD6]">
                INTEGRATED RISK
              </div>
              <h1 className="text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">
                통합 위험 랭킹
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                위험 우선순위가 먼저 보이도록 정리했습니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <MetricCardSmall label="페이지" value={String(page)} />
              <MetricCardSmall label="고위험" value={formatNumber(summaryHighRisk)} tone="danger" />
              <MetricCardSmall label="외부 치명" value={formatNumber(externalCriticalCount)} tone="danger" />
              <MetricCardSmall label="NTS 경고" value={formatNumber(ntsWarningCount)} tone="warning" />
            </div>
          </div>
        </section>

        <MessageBanner success={resolved.success} error={resolved.error} />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <FilterChip
                href={`/rankings${buildQueryString({ regionCode, categoryId, sort: "final" })}`}
                active={sort === "final"}
              >
                통합위험순
              </FilterChip>
              <FilterChip
                href={`/rankings${buildQueryString({ regionCode, categoryId, sort: "market" })}`}
                active={sort === "market"}
              >
                시장위험순
              </FilterChip>
              <FilterChip
                href={`/rankings${buildQueryString({ regionCode, categoryId, sort: "kosis" })}`}
                active={sort === "kosis"}
              >
                외부폐업순
              </FilterChip>
              <FilterChip
                href={`/rankings${buildQueryString({ regionCode, categoryId, sort: "nts" })}`}
                active={sort === "nts"}
              >
                NTS순
              </FilterChip>
              <FilterChip
                href={`/rankings${buildQueryString({ regionCode, categoryId, sort: "smallbiz" })}`}
                active={sort === "smallbiz"}
              >
                소상공인순
              </FilterChip>
            </div>

            <div className="text-sm text-slate-500">
              {regionCode ? (
                <span>
                  지역 <span className="font-medium text-slate-900">{regionCode}</span>
                </span>
              ) : (
                <span>지역 전체</span>
              )}
              {categoryId ? (
                <span className="ml-3">
                  업종 <span className="font-medium text-slate-900">{categoryId}</span>
                </span>
              ) : (
                <span className="ml-3">업종 전체</span>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-14 text-center text-sm text-slate-500">
              표시할 통합 랭킹 데이터가 없습니다.
            </div>
          ) : (
            <div className="grid gap-3">
              {rows.map((row, index) => {
                const rank = (page - 1) * PAGE_SIZE + index + 1;
                const watchKey = `${row.region_code}:${row.category_id}`;
                const watchlistId = watchlistMap.get(watchKey);
                const isWatching = !!watchlistId;

                const next = buildQueryString({
                  regionCode,
                  categoryId,
                  sort,
                  page,
                });

                const detailHref = `/regions/${encodeURIComponent(
                  row.region_code,
                )}/${row.category_id}#db-insight`;

                return (
                  <article
                    key={`${row.region_code}-${row.category_id}-${row.snapshot_date}-${rank}`}
                    className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:border-[#BFE3FF] hover:bg-white"
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-7 items-center rounded-full border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700">
                            #{rank}
                          </span>

                          <span
                            className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-bold ${scoreTone(
                              row.integrated_final_score,
                            )}`}
                          >
                            {severityLabel(row.integrated_severity)}
                          </span>

                          <span
                            className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-bold ${pressureTone(
                              row.kosis_pressure_grade,
                            )}`}
                          >
                            {row.kosis_pressure_label || severityLabel(row.kosis_pressure_grade)}
                          </span>

                          <span
                            className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-bold ${ntsTone(
                              row.nts_business_score,
                            )}`}
                          >
                            {row.nts_label || "없음"}
                          </span>
                        </div>

                        <Link
                          href={detailHref}
                          className="mt-2 block text-lg font-black tracking-[-0.03em] text-slate-950 transition hover:text-[#0A6FD6]"
                        >
                          {row.region_name ?? row.region_code} · {row.category_name ?? row.category_id}
                        </Link>

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>기준월 {row.snapshot_date || "-"}</span>
                          <Link
                            href={detailHref}
                            className="font-semibold text-[#0A6FD6] transition hover:text-[#085CB2]"
                          >
                            상세 보기
                          </Link>
                          <Link
                            href={`/signals?regionCode=${encodeURIComponent(
                              row.region_code,
                            )}&categoryId=${row.category_id}`}
                            className="font-semibold text-[#0A6FD6] transition hover:text-[#085CB2]"
                          >
                            관련 시그널
                          </Link>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-6">
                          <MetricBox
                            label="통합위험"
                            value={`${severityLabel(row.integrated_severity)} · ${formatScore(
                              row.integrated_final_score,
                              0,
                            )}`}
                            tone={scoreTone(row.integrated_final_score)}
                          />
                          <MetricBox
                            label="시장위험"
                            value={formatScore(row.integrated_market_score, 0)}
                          />
                          <MetricBox
                            label="소상공인위험"
                            value={formatScore(row.smallbiz_risk_score, 1)}
                          />
                          <MetricBox
                            label="외부폐업압력"
                            value={`${row.kosis_pressure_label || severityLabel(row.kosis_pressure_grade)} · ${formatScore(
                              row.kosis_pressure_score,
                              0,
                            )}`}
                            tone={pressureTone(row.kosis_pressure_grade)}
                          />
                          <MetricBox
                            label="NTS위험"
                            value={`${row.nts_label || "없음"} · ${formatScore(
                              row.nts_business_score,
                              0,
                            )}`}
                            tone={ntsTone(row.nts_business_score)}
                          />
                          <MetricBox
                            label="전국비중 / 전년증감"
                            value={`${formatScore(row.kosis_national_share_pct, 2)} / ${formatScore(
                              row.kosis_yoy_closed_delta_pct,
                              2,
                            )}`}
                          />
                        </div>
                      </div>

                      <div className="xl:w-[140px] xl:flex-none">
                        <div className="flex xl:justify-end">
                          {userId ? (
                            <form action={mutateWatchlistAction} className="w-full xl:w-auto">
                              <input type="hidden" name="user_id" value={String(userId)} />
                              <input type="hidden" name="region_code" value={row.region_code} />
                              <input
                                type="hidden"
                                name="category_id"
                                value={String(row.category_id)}
                              />
                              <input
                                type="hidden"
                                name="intent"
                                value={isWatching ? "remove" : "add"}
                              />
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
                                  "inline-flex h-10 w-full min-w-[116px] items-center justify-center rounded-xl px-3 text-sm font-semibold transition xl:w-auto",
                                  isWatching
                                    ? "border border-sky-200 bg-[#F2FAFF] text-[#0A6FD6] hover:bg-[#E7F4FF]"
                                    : "bg-[#169BF4] text-white shadow-sm hover:bg-[#0A84E0]",
                                ].join(" ")}
                              >
                                {isWatching ? "저장됨" : "모니터링추가"}
                              </button>
                            </form>
                          ) : (
                            <Link
                              href={`/auth/login?next=${encodeURIComponent(`/rankings${next}`)}`}
                              className="inline-flex h-10 w-full min-w-[116px] items-center justify-center rounded-xl bg-[#169BF4] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0A84E0] xl:w-auto"
                            >
                              모니터링추가
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex items-center justify-between gap-3">
          <Link
            href={page > 1 ? `/rankings${prevHref}` : "#"}
            className={[
              "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition",
              page > 1
                ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                : "cursor-default border border-slate-100 bg-slate-100 text-slate-400",
            ].join(" ")}
          >
            이전
          </Link>

          <div className="text-sm text-slate-500">
            페이지 <span className="font-medium text-slate-900">{page}</span>
            {summaryAvgRisk !== null ? (
              <span className="ml-3">
                평균 통합위험{" "}
                <span className="font-medium text-slate-900">
                  {formatScore(summaryAvgRisk, 1)}
                </span>
              </span>
            ) : null}
          </div>

          <Link
            href={rows.length === PAGE_SIZE ? `/rankings${nextHref}` : "#"}
            className={[
              "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition",
              rows.length === PAGE_SIZE
                ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
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

function MetricCardSmall({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "warning";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-white";

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-black text-slate-950">{value}</div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  tone = "border-slate-200 bg-white text-slate-900",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${tone}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-sm font-bold">{value}</div>
    </div>
  );
}