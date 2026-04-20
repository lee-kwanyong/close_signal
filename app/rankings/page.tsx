import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { mutateWatchlistAction } from "@/app/watchlist/actions";

type SearchParams = Promise<{
  regionCode?: string;
  categoryId?: string;
  page?: string;
  sort?: string;
  pressureGrade?: string;
  success?: string;
  error?: string;
}>;

type IntegratedDistributionRow = {
  total_rows: number | null;
  avg_integrated_signal_score: number | null;
  critical_count: number | null;
  high_count: number | null;
  medium_count: number | null;
  low_count: number | null;
};

type IntegratedRegionAggregateRow = {
  canonical_region_name: string | null;
  pressure_grade: string | null;
  avg_national_share_pct: number | null;
  avg_yoy_closed_delta_pct: number | null;
  avg_adjusted_score: number | null;
  avg_integrated_signal_score: number | null;
  max_integrated_signal_score: number | null;
  row_count: number | null;
  critical_count: number | null;
  high_count: number | null;
  medium_count: number | null;
  low_count: number | null;
};

type IntegratedTopRow = {
  region_code: string | null;
  region_name: string | null;
  category_id: number | null;
  category_name: string | null;
  score_month: string | null;
  adjusted_score: number | null;
  risk_grade: string | null;
  closure_region_code: string | null;
  closure_region_name: string | null;
  pressure_grade: string | null;
  national_share_pct: number | null;
  yoy_closed_delta_pct: number | null;
  close_rate_pct: number | null;
  operating_yoy_change_pct: number | null;
  net_change: number | null;
  integrated_signal_score: number | null;
};

type IntegratedGapRow = {
  region_code: string | null;
  region_name: string | null;
  category_id: number | null;
  category_name: string | null;
  score_month: string | null;
  adjusted_score: number | null;
  risk_grade: string | null;
  closure_region_code: string | null;
  closure_region_name: string | null;
  pressure_grade: string | null;
  integrated_signal_score: number | null;
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

function text(value: string | null | undefined) {
  const raw = String(value || "").trim();
  return raw.length > 0 ? raw : null;
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatScore(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "-";
  return Number(value).toFixed(digits);
}

function formatPercent(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toFixed(digits)}%`;
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
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

function normalizeRegionCode(code?: string | null) {
  const raw = String(code || "").trim().toUpperCase();
  if (!raw) return "";

  const aliasMap: Record<string, string> = {
    KR: "KR",
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

function canonicalRegionNameFromCode(code?: string | null) {
  const normalized = normalizeRegionCode(code);

  const nameMap: Record<string, string> = {
    KR: "전국",
    "KR-11": "서울",
    "KR-26": "부산",
    "KR-27": "대구",
    "KR-28": "인천",
    "KR-29": "광주",
    "KR-30": "대전",
    "KR-31": "울산",
    "KR-36": "세종",
    "KR-41": "경기",
    "KR-42": "강원",
    "KR-43": "충북",
    "KR-44": "충남",
    "KR-45": "전북",
    "KR-46": "전남",
    "KR-47": "경북",
    "KR-48": "경남",
    "KR-50": "제주",
  };

  return nameMap[normalized] ?? null;
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
    : "border-red-200 bg-red-50 text-red-700";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>{message}</div>;
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
        "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition",
        active
          ? "border border-sky-600 bg-sky-600 text-white shadow-sm hover:bg-sky-700"
          : "border border-sky-100 bg-sky-50 text-sky-700 hover:border-sky-200 hover:bg-sky-100",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function integratedTone(score: number | null | undefined) {
  const n = num(score, 0);

  if (score === null || score === undefined) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  if (n >= 80) return "border-red-200 bg-red-50 text-red-700";
  if (n >= 65) return "border-orange-200 bg-orange-50 text-orange-700";
  if (n >= 45) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function adjustedTone(score: number | null | undefined) {
  const n = num(score, 0);

  if (score === null || score === undefined) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  if (n >= 80) return "border-red-200 bg-red-50 text-red-700";
  if (n >= 60) return "border-orange-200 bg-orange-50 text-orange-700";
  if (n >= 40) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function pressureTone(grade: string | null | undefined) {
  const value = String(grade || "").toLowerCase();

  if (value === "critical") return "border-red-200 bg-red-50 text-red-700";
  if (value === "high") return "border-orange-200 bg-orange-50 text-orange-700";
  if (value === "moderate") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "observe") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-slate-200 bg-slate-100 text-slate-500";
}

function integratedSeverityLabel(score: number | null | undefined) {
  const n = num(score, 0);

  if (score === null || score === undefined) return "미정";
  if (n >= 80) return "치명";
  if (n >= 65) return "높음";
  if (n >= 45) return "주의";
  return "관찰";
}

function riskGradeLabel(grade: string | null | undefined) {
  const value = String(grade || "").toLowerCase();

  if (value === "critical") return "치명";
  if (value === "high") return "높음";
  if (value === "medium") return "주의";
  if (value === "low") return "낮음";
  return "미정";
}

function pressureGradeLabel(grade: string | null | undefined) {
  const value = String(grade || "").toLowerCase();

  if (value === "critical") return "치명";
  if (value === "high") return "높음";
  if (value === "moderate") return "주의";
  if (value === "observe") return "관찰";
  return "미연결";
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
      map.set(`${normalizeRegionCode(row.region_code)}:${row.category_id}`, row.watchlist_id);
    }
    return map;
  } catch {
    return new Map<string, number>();
  }
}

async function getDistribution() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_integrated_risk_distribution_current")
      .select("*")
      .limit(1)
      .maybeSingle();

    return (data ?? null) as IntegratedDistributionRow | null;
  } catch {
    return null;
  }
}

async function getRegionAggregates(regionCode?: string) {
  try {
    const supabase = await createClient();
    const canonicalRegionName = canonicalRegionNameFromCode(regionCode);

    let query = supabase
      .from("v_integrated_risk_region_aggregates_current")
      .select("*")
      .order("avg_integrated_signal_score", { ascending: false })
      .order("max_integrated_signal_score", { ascending: false });

    if (canonicalRegionName) {
      query = query.eq("canonical_region_name", canonicalRegionName);
    }

    const { data } = await query;
    return (data ?? []) as IntegratedRegionAggregateRow[];
  } catch {
    return [] as IntegratedRegionAggregateRow[];
  }
}

async function getGapRows(regionCode?: string) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("v_integrated_risk_join_gaps_current")
      .select("*")
      .order("region_code", { ascending: true })
      .order("category_id", { ascending: true });

    if (regionCode) {
      query = query.in("region_code", candidateRegionCodes(regionCode));
    }

    const { data } = await query;
    return (data ?? []) as IntegratedGapRow[];
  } catch {
    return [] as IntegratedGapRow[];
  }
}

async function getIntegratedTopRows(params: {
  page: number;
  regionCode?: string;
  categoryId?: number;
  sort?: string;
  pressureGrade?: string;
}) {
  try {
    const supabase = await createClient();
    const offset = (params.page - 1) * PAGE_SIZE;
    const sort = params.sort || "integrated";

    let query = supabase
      .from("v_integrated_risk_top_current")
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);

    if (params.regionCode) {
      query = query.in("region_code", candidateRegionCodes(params.regionCode));
    }

    if (params.categoryId) {
      query = query.eq("category_id", params.categoryId);
    }

    if (params.pressureGrade) {
      query = query.eq("pressure_grade", params.pressureGrade);
    }

    if (sort === "adjusted") {
      query = query
        .order("adjusted_score", { ascending: false })
        .order("integrated_signal_score", { ascending: false });
    } else if (sort === "pressure") {
      query = query
        .order("national_share_pct", { ascending: false })
        .order("yoy_closed_delta_pct", { ascending: false })
        .order("integrated_signal_score", { ascending: false });
    } else if (sort === "net") {
      query = query
        .order("net_change", { ascending: false })
        .order("integrated_signal_score", { ascending: false });
    } else {
      query = query
        .order("integrated_signal_score", { ascending: false })
        .order("adjusted_score", { ascending: false });
    }

    const { data } = await query;
    return (data ?? []) as IntegratedTopRow[];
  } catch {
    return [] as IntegratedTopRow[];
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
  const sort = resolved.sort?.trim() || "integrated";
  const pressureGrade = resolved.pressureGrade?.trim() || undefined;

  const userId = await getInternalUserId();

  const [summary, regionAggregates, rows, gapRows, watchlistMap] = await Promise.all([
    getDistribution(),
    getRegionAggregates(regionCode),
    getIntegratedTopRows({ page, regionCode, categoryId, sort, pressureGrade }),
    getGapRows(regionCode),
    getWatchlistMap(userId),
  ]);

  const prevHref = buildQueryString({
    regionCode,
    categoryId,
    sort,
    pressureGrade,
    page: page > 1 ? page - 1 : undefined,
  });

  const nextHref = buildQueryString({
    regionCode,
    categoryId,
    sort,
    pressureGrade,
    page: rows.length === PAGE_SIZE ? page + 1 : undefined,
  });

  const mediumPlusCount =
    num(summary?.critical_count) + num(summary?.high_count) + num(summary?.medium_count);

  const pageAvgIntegrated =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + num(row.integrated_signal_score, 0), 0) / rows.length
      : null;

  const gapRegionNames = Array.from(
    new Set(
      gapRows
        .map((row) => text(row.region_name) ?? normalizeRegionCode(row.region_code))
        .filter(Boolean),
    ),
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 text-sm font-medium text-sky-700">INTEGRATED RISK SIGNAL</div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                통합 위험시그널 랭킹
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                내부 위험점수와 외부 폐업압력을 함께 반영한 운영형 랭킹입니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <div className="text-xs uppercase tracking-wide text-sky-700">전체 행 수</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">
                  {formatNumber(summary?.total_rows)}
                </div>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <div className="text-xs uppercase tracking-wide text-sky-700">평균 통합위험</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">
                  {formatScore(summary?.avg_integrated_signal_score, 2)}
                </div>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <div className="text-xs uppercase tracking-wide text-sky-700">중간 이상</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">
                  {formatNumber(mediumPlusCount)}
                </div>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <div className="text-xs uppercase tracking-wide text-sky-700">조인 누락</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">
                  {formatNumber(gapRows.length)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <MessageBanner success={resolved.success} error={resolved.error} />

        {gapRows.length > 0 ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-semibold text-amber-800">
                  외부 폐업압력 조인 미연결 항목이 남아 있습니다.
                </div>
                <div className="mt-1 text-sm text-amber-700">
                  {gapRegionNames.join(", ")} · 총 {gapRows.length}건
                </div>
              </div>

              <div className="text-sm text-amber-700">
                현재 이 항목들은 외부 폐업압력 없이 내부 위험점수만 반영됩니다.
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <FilterChip
                href={`/rankings${buildQueryString({
                  regionCode,
                  categoryId,
                  sort: "integrated",
                  pressureGrade,
                })}`}
                active={sort === "integrated"}
              >
                통합위험순
              </FilterChip>
              <FilterChip
                href={`/rankings${buildQueryString({
                  regionCode,
                  categoryId,
                  sort: "adjusted",
                  pressureGrade,
                })}`}
                active={sort === "adjusted"}
              >
                내부위험순
              </FilterChip>
              <FilterChip
                href={`/rankings${buildQueryString({
                  regionCode,
                  categoryId,
                  sort: "pressure",
                  pressureGrade,
                })}`}
                active={sort === "pressure"}
              >
                외부압력순
              </FilterChip>
              <FilterChip
                href={`/rankings${buildQueryString({
                  regionCode,
                  categoryId,
                  sort: "net",
                  pressureGrade,
                })}`}
                active={sort === "net"}
              >
                순증감순
              </FilterChip>
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterChip
                href={`/rankings${buildQueryString({
                  regionCode,
                  categoryId,
                  sort,
                })}`}
                active={!pressureGrade}
              >
                압력 전체
              </FilterChip>
              <FilterChip
                href={`/rankings${buildQueryString({
                  regionCode,
                  categoryId,
                  sort,
                  pressureGrade: "critical",
                })}`}
                active={pressureGrade === "critical"}
              >
                외부 치명
              </FilterChip>
              <FilterChip
                href={`/rankings${buildQueryString({
                  regionCode,
                  categoryId,
                  sort,
                  pressureGrade: "high",
                })}`}
                active={pressureGrade === "high"}
              >
                외부 높음
              </FilterChip>
              <FilterChip
                href={`/rankings${buildQueryString({
                  regionCode,
                  categoryId,
                  sort,
                  pressureGrade: "observe",
                })}`}
                active={pressureGrade === "observe"}
              >
                외부 관찰
              </FilterChip>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">지역 집계 요약</div>
              <div className="mt-1 text-sm text-slate-500">
                지역별 평균 통합위험과 외부 폐업압력 수준
              </div>
            </div>
          </div>

          {regionAggregates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              표시할 지역 집계가 없습니다.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {regionAggregates.map((row) => (
                <div
                  key={row.canonical_region_name ?? "unknown"}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-950">
                        {row.canonical_region_name ?? "미분류"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        행 수 {formatNumber(row.row_count)}
                      </div>
                    </div>
                    <span
                      className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium ${pressureTone(
                        row.pressure_grade,
                      )}`}
                    >
                      {pressureGradeLabel(row.pressure_grade)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-slate-500">평균 통합위험</div>
                      <div className="mt-1 font-semibold text-slate-950">
                        {formatScore(row.avg_integrated_signal_score, 2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">최대 통합위험</div>
                      <div className="mt-1 font-semibold text-slate-950">
                        {formatScore(row.max_integrated_signal_score, 1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">전국 비중</div>
                      <div className="mt-1 font-semibold text-slate-950">
                        {formatPercent(row.avg_national_share_pct, 4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">전년 폐업증감</div>
                      <div className="mt-1 font-semibold text-slate-950">
                        {formatPercent(row.avg_yoy_closed_delta_pct, 4)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] table-fixed text-left">
              <colgroup>
                <col style={{ width: "6%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>

              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-sm text-slate-500">
                  <th className="whitespace-nowrap px-4 py-4 font-medium">순위</th>
                  <th className="whitespace-nowrap px-4 py-4 font-medium">지역 · 업종</th>
                  <th className="whitespace-nowrap px-4 py-4 font-medium">통합위험</th>
                  <th className="whitespace-nowrap px-4 py-4 font-medium">내부위험</th>
                  <th className="whitespace-nowrap px-4 py-4 font-medium">외부폐업압력</th>
                  <th className="whitespace-nowrap px-4 py-4 font-medium">전국 비중</th>
                  <th className="whitespace-nowrap px-4 py-4 font-medium">전년 폐업증감</th>
                  <th className="whitespace-nowrap px-4 py-4 font-medium">순증감</th>
                  <th className="whitespace-nowrap px-4 py-4 text-right font-medium">관심</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-16 text-center text-sm text-slate-500"
                    >
                      표시할 통합 위험시그널 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => {
                    const rank = (page - 1) * PAGE_SIZE + index + 1;
                    const normalizedRegionCode = normalizeRegionCode(row.region_code);
                    const categoryIdValue = num(row.category_id, 0);
                    const watchKey = `${normalizedRegionCode}:${categoryIdValue}`;
                    const watchlistId = watchlistMap.get(watchKey);
                    const isWatching = !!watchlistId;

                    const next = buildQueryString({
                      regionCode,
                      categoryId,
                      sort,
                      pressureGrade,
                      page,
                    });

                    const detailHref = `/regions/${encodeURIComponent(
                      normalizedRegionCode,
                    )}/${categoryIdValue}#db-insight`;

                    return (
                      <tr
                        key={`${normalizedRegionCode}-${categoryIdValue}-${row.score_month}-${rank}`}
                        className="border-b border-slate-100 align-top last:border-b-0"
                      >
                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="text-base font-semibold text-slate-950">{rank}</div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="min-w-0">
                            <Link
                              href={detailHref}
                              className="block truncate text-[15px] font-semibold tracking-tight text-slate-950 transition hover:text-sky-700"
                              title={`${row.region_name ?? normalizedRegionCode} · ${row.category_name ?? row.category_id}`}
                            >
                              {row.region_name ?? normalizedRegionCode} · {row.category_name ?? row.category_id}
                            </Link>

                            <div className="mt-2 flex flex-wrap gap-3 text-sm">
                              <span className="text-slate-500">기준월 {row.score_month ?? "-"}</span>
                              <Link
                                href={detailHref}
                                className="font-medium text-sky-700 transition hover:text-sky-800"
                              >
                                상세 보기
                              </Link>
                              <Link
                                href={`/signals?regionCode=${encodeURIComponent(
                                  normalizedRegionCode,
                                )}&categoryId=${categoryIdValue}`}
                                className="font-medium text-sky-700 transition hover:text-sky-800"
                              >
                                관련 시그널
                              </Link>
                            </div>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <span
                            className={`inline-flex h-9 items-center rounded-full border px-3 text-sm font-medium ${integratedTone(
                              row.integrated_signal_score,
                            )}`}
                          >
                            {integratedSeverityLabel(row.integrated_signal_score)} ·{" "}
                            {formatScore(row.integrated_signal_score, 1)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <span
                            className={`inline-flex h-9 items-center rounded-full border px-3 text-sm font-medium ${adjustedTone(
                              row.adjusted_score,
                            )}`}
                          >
                            {riskGradeLabel(row.risk_grade)} · {formatScore(row.adjusted_score, 1)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <span
                            className={`inline-flex h-9 items-center rounded-full border px-3 text-sm font-medium ${pressureTone(
                              row.pressure_grade,
                            )}`}
                          >
                            {pressureGradeLabel(row.pressure_grade)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                          {formatPercent(row.national_share_pct, 4)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                          {formatPercent(row.yoy_closed_delta_pct, 4)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                          {formatNumber(row.net_change)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="flex justify-end">
                            {userId ? (
                              <form action={mutateWatchlistAction}>
                                <input type="hidden" name="user_id" value={String(userId)} />
                                <input type="hidden" name="region_code" value={normalizedRegionCode} />
                                <input
                                  type="hidden"
                                  name="category_id"
                                  value={String(categoryIdValue)}
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
                                    "inline-flex h-10 min-w-[92px] items-center justify-center rounded-xl px-4 text-sm font-medium transition",
                                    isWatching
                                      ? "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                                      : "bg-sky-600 text-white shadow-sm hover:bg-sky-700",
                                  ].join(" ")}
                                >
                                  {isWatching ? "저장됨" : "모니터링추가"}
                                </button>
                              </form>
                            ) : (
                              <Link
                                href={`/auth/login?next=${encodeURIComponent(`/rankings${next}`)}`}
                                className="inline-flex h-10 min-w-[92px] items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
                              >
                                모니터링추가
                              </Link>
                            )}
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
                ? "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                : "cursor-default border border-slate-100 bg-slate-100 text-slate-400",
            ].join(" ")}
          >
            이전
          </Link>

          <div className="text-sm text-slate-500">
            페이지 <span className="font-medium text-slate-900">{page}</span>
            {pageAvgIntegrated !== null ? (
              <span className="ml-3">
                현재 페이지 평균 통합위험{" "}
                <span className="font-medium text-slate-900">
                  {formatScore(pageAvgIntegrated, 1)}
                </span>
              </span>
            ) : null}
          </div>

          <Link
            href={rows.length === PAGE_SIZE ? `/rankings${nextHref}` : "#"}
            className={[
              "inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition",
              rows.length === PAGE_SIZE
                ? "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
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