import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    regionCode: string;
    categoryId: string;
  }>;
};

type DetailRow = {
  region_code: string;
  region_name: string;
  category_id: number;
  category_name: string;
  score_date: string;
  risk_score: number | null;
  risk_grade: string | null;
  business_count: number | null;
  open_count_7d: number | null;
  close_count_7d: number | null;
  pause_count_7d: number | null;
  resume_count_7d: number | null;
  close_rate_7d: number | null;
  open_rate_7d: number | null;
  pause_rate_7d: number | null;
  resume_rate_7d: number | null;
  net_change_7d: number | null;
  close_count_30d: number | null;
  open_count_30d: number | null;
  pause_count_30d: number | null;
  resume_count_30d: number | null;
  close_rate_30d: number | null;
  open_rate_30d: number | null;
  pause_rate_30d: number | null;
  resume_rate_30d: number | null;
  net_change_30d: number | null;
  risk_delta_7d: number | null;
  risk_delta_30d: number | null;
};

type SignalRow = {
  id?: number | string;
  signal_date?: string;
  score_date?: string;
  signal_type?: string | null;
  signal_level?: string | null;
  title?: string | null;
  message?: string | null;
  region_code?: string;
  region_name?: string | null;
  category_id?: number;
  category_name?: string | null;
  risk_score?: number | null;
};

type WatchlistStatusRow = {
  is_watching: boolean | null;
  watchlist_id: number | null;
};

const USER_ID = 1;

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "-";
  return `${value.toFixed(digits)}%`;
}

function formatScore(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "-";
  return value.toFixed(digits);
}

function formatSigned(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "-";
  if (value > 0) return `+${value.toFixed(digits)}`;
  if (value < 0) return value.toFixed(digits);
  return `0.${"0".repeat(digits)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function riskTone(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "bg-slate-100 text-slate-600 border-slate-200";
  }
  if (score >= 80) return "bg-red-50 text-red-700 border-red-200";
  if (score >= 65) return "bg-amber-50 text-amber-700 border-amber-200";
  if (score >= 45) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function signalTone(level?: string | null) {
  const v = (level || "").toLowerCase();
  if (v.includes("critical") || v.includes("high")) {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (v.includes("medium")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function miniBarWidth(value: number | null | undefined, max: number) {
  if (!value || max <= 0) return "0%";
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return `${pct}%`;
}

async function getDetail(regionCode: string, categoryId: number) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_region_category_detail_named", {
    p_region_code: regionCode,
    p_category_id: categoryId,
  });

  if (error) {
    console.error("get_region_category_detail_named error", error);
    return null;
  }

  const row = Array.isArray(data) ? (data[0] as DetailRow | undefined) : null;
  return row ?? null;
}

async function getSignals(regionCode: string, categoryId: number) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_risk_signals_feed", {
    p_region_code: regionCode,
    p_category_id: categoryId,
    p_limit: 10,
  });

  if (error) {
    console.error("get_risk_signals_feed error", error);
    return [] as SignalRow[];
  }

  return (data ?? []) as SignalRow[];
}

async function getWatchStatus(regionCode: string, categoryId: number) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_watchlist_status", {
    p_user_id: USER_ID,
    p_region_code: regionCode,
    p_category_id: categoryId,
  });

  if (error) {
    console.error("get_watchlist_status error", error);
    return {
      is_watching: false,
      watchlist_id: null,
    } satisfies WatchlistStatusRow;
  }

  const row = Array.isArray(data)
    ? (data[0] as WatchlistStatusRow | undefined)
    : null;

  return {
    is_watching: row?.is_watching ?? false,
    watchlist_id: row?.watchlist_id ?? null,
  } satisfies WatchlistStatusRow;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-sm text-slate-500">{sub}</div> : null}
    </div>
  );
}

function DeltaPill({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  const positive = (value ?? 0) > 0;
  const negative = (value ?? 0) < 0;

  return (
    <div
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium",
        positive
          ? "border-red-200 bg-red-50 text-red-700"
          : negative
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      <span className="mr-2 text-slate-500">{label}</span>
      <span>{formatSigned(value)}</span>
    </div>
  );
}

export default async function RegionCategoryDetailPage({ params }: PageProps) {
  const { regionCode, categoryId } = await params;
  const numericCategoryId = Number(categoryId);

  if (!regionCode || Number.isNaN(numericCategoryId)) {
    notFound();
  }

  const [detail, signals, watchStatus] = await Promise.all([
    getDetail(regionCode, numericCategoryId),
    getSignals(regionCode, numericCategoryId),
    getWatchStatus(regionCode, numericCategoryId),
  ]);

  if (!detail) {
    notFound();
  }

  const max7d = Math.max(
    detail.open_count_7d ?? 0,
    detail.close_count_7d ?? 0,
    detail.pause_count_7d ?? 0,
    detail.resume_count_7d ?? 0,
    1
  );

  const max30d = Math.max(
    detail.open_count_30d ?? 0,
    detail.close_count_30d ?? 0,
    detail.pause_count_30d ?? 0,
    detail.resume_count_30d ?? 0,
    1
  );

  const isWatching = !!watchStatus.is_watching;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Link
                  href="/rankings"
                  className="text-sm text-slate-500 transition hover:text-slate-900"
                >
                  랭킹
                </Link>
                <span className="text-slate-300">/</span>
                <Link
                  href="/signals"
                  className="text-sm text-slate-500 transition hover:text-slate-900"
                >
                  시그널
                </Link>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {detail.region_name} · {detail.category_name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium",
                    riskTone(detail.risk_score),
                  ].join(" ")}
                >
                  위험도 {formatScore(detail.risk_score)}
                </span>

                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
                  기준일 {formatDate(detail.score_date)}
                </span>

                {detail.risk_grade ? (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
                    등급 {detail.risk_grade}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <form action="/watchlist/actions" method="post">
                <input type="hidden" name="region_code" value={detail.region_code} />
                <input
                  type="hidden"
                  name="category_id"
                  value={String(detail.category_id)}
                />
                <input type="hidden" name="user_id" value={String(USER_ID)} />
                <input
                  type="hidden"
                  name="intent"
                  value={isWatching ? "remove" : "add"}
                />
                {watchStatus.watchlist_id ? (
                  <input
                    type="hidden"
                    name="watchlist_id"
                    value={String(watchStatus.watchlist_id)}
                  />
                ) : null}
                <button
                  type="submit"
                  className={[
                    "inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition",
                    isWatching
                      ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      : "bg-slate-950 text-white hover:bg-slate-800",
                  ].join(" ")}
                >
                  {isWatching ? "관심목록 해제" : "관심목록 추가"}
                </button>
              </form>

              <Link
                href="/watchlist"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                관심목록 보기
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <DeltaPill label="7일 변화" value={detail.risk_delta_7d} />
            <DeltaPill label="30일 변화" value={detail.risk_delta_30d} />
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="전체 사업장 수"
            value={formatNumber(detail.business_count)}
          />
          <StatCard
            label="7일 폐업률"
            value={formatPercent(detail.close_rate_7d)}
            sub={`폐업 ${formatNumber(detail.close_count_7d)} / 개업 ${formatNumber(
              detail.open_count_7d
            )}`}
          />
          <StatCard
            label="30일 폐업률"
            value={formatPercent(detail.close_rate_30d)}
            sub={`폐업 ${formatNumber(detail.close_count_30d)} / 개업 ${formatNumber(
              detail.open_count_30d
            )}`}
          />
          <StatCard
            label="7일 순증감"
            value={formatSigned(detail.net_change_7d, 0)}
            sub={`30일 순증감 ${formatSigned(detail.net_change_30d, 0)}`}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">최근 7일 이벤트 분포</h2>
              <p className="mt-1 text-sm text-slate-500">
                개업·폐업·휴업·재개 이벤트 수를 비교합니다.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: "개업",
                  value: detail.open_count_7d,
                  tone: "bg-emerald-500",
                },
                {
                  label: "폐업",
                  value: detail.close_count_7d,
                  tone: "bg-red-500",
                },
                {
                  label: "휴업",
                  value: detail.pause_count_7d,
                  tone: "bg-amber-500",
                },
                {
                  label: "재개",
                  value: detail.resume_count_7d,
                  tone: "bg-sky-500",
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="text-slate-500">
                      {formatNumber(item.value)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.tone}`}
                      style={{ width: miniBarWidth(item.value, max7d) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">최근 30일 이벤트 분포</h2>
              <p className="mt-1 text-sm text-slate-500">
                한 달 기준으로 이벤트 강도를 비교합니다.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: "개업",
                  value: detail.open_count_30d,
                  tone: "bg-emerald-500",
                },
                {
                  label: "폐업",
                  value: detail.close_count_30d,
                  tone: "bg-red-500",
                },
                {
                  label: "휴업",
                  value: detail.pause_count_30d,
                  tone: "bg-amber-500",
                },
                {
                  label: "재개",
                  value: detail.resume_count_30d,
                  tone: "bg-sky-500",
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="text-slate-500">
                      {formatNumber(item.value)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.tone}`}
                      style={{ width: miniBarWidth(item.value, max30d) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">비율 지표</h2>
              <p className="mt-1 text-sm text-slate-500">
                7일·30일 기준의 주요 이벤트 비율입니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                {
                  label: "7일 폐업률",
                  value: formatPercent(detail.close_rate_7d),
                },
                {
                  label: "7일 개업률",
                  value: formatPercent(detail.open_rate_7d),
                },
                {
                  label: "7일 휴업률",
                  value: formatPercent(detail.pause_rate_7d),
                },
                {
                  label: "7일 재개률",
                  value: formatPercent(detail.resume_rate_7d),
                },
                {
                  label: "30일 폐업률",
                  value: formatPercent(detail.close_rate_30d),
                },
                {
                  label: "30일 개업률",
                  value: formatPercent(detail.open_rate_30d),
                },
                {
                  label: "30일 휴업률",
                  value: formatPercent(detail.pause_rate_30d),
                },
                {
                  label: "30일 재개률",
                  value: formatPercent(detail.resume_rate_30d),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="text-sm text-slate-500">{item.label}</div>
                  <div className="mt-2 text-xl font-semibold text-slate-950">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">요약 해석</h2>
              <p className="mt-1 text-sm text-slate-500">
                현재 수치를 빠르게 해석할 수 있도록 정리했습니다.
              </p>
            </div>

            <div className="space-y-3 text-sm leading-6 text-slate-700">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                현재 위험도는{" "}
                <span className="font-semibold text-slate-950">
                  {formatScore(detail.risk_score)}
                </span>
                점이며, 최근 7일 변화는{" "}
                <span className="font-semibold text-slate-950">
                  {formatSigned(detail.risk_delta_7d)}
                </span>
                입니다.
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                최근 7일 기준 폐업{" "}
                <span className="font-semibold text-slate-950">
                  {formatNumber(detail.close_count_7d)}
                </span>
                건, 개업{" "}
                <span className="font-semibold text-slate-950">
                  {formatNumber(detail.open_count_7d)}
                </span>
                건으로 순증감은{" "}
                <span className="font-semibold text-slate-950">
                  {formatSigned(detail.net_change_7d, 0)}
                </span>
                입니다.
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                최근 30일 폐업률은{" "}
                <span className="font-semibold text-slate-950">
                  {formatPercent(detail.close_rate_30d)}
                </span>
                이고, 전체 사업장 수는{" "}
                <span className="font-semibold text-slate-950">
                  {formatNumber(detail.business_count)}
                </span>
                개입니다.
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">관련 시그널</h2>
              <p className="mt-1 text-sm text-slate-500">
                해당 지역·업종에 연결된 최신 시그널입니다.
              </p>
            </div>

            <Link
              href={`/signals?regionCode=${encodeURIComponent(
                detail.region_code
              )}&categoryId=${detail.category_id}`}
              className="text-sm font-medium text-slate-700 transition hover:text-slate-950"
            >
              전체 시그널 보기
            </Link>
          </div>

          {signals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              표시할 시그널이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {signals.map((signal, index) => {
                const signalKey =
                  signal.id ??
                  `${signal.signal_date ?? signal.score_date ?? "unknown"}-${index}`;

                return (
                  <div
                    key={signalKey}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={[
                              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                              signalTone(signal.signal_level),
                            ].join(" ")}
                          >
                            {signal.signal_level || "signal"}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(signal.signal_date || signal.score_date)}
                          </span>
                        </div>

                        <h3 className="mt-2 text-base font-semibold text-slate-950">
                          {signal.title || "시그널"}
                        </h3>

                        {signal.message ? (
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {signal.message}
                          </p>
                        ) : null}
                      </div>

                      {signal.risk_score !== null && signal.risk_score !== undefined ? (
                        <div
                          className={[
                            "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium",
                            riskTone(signal.risk_score),
                          ].join(" ")}
                        >
                          위험도 {formatScore(signal.risk_score)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}