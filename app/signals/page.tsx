import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buildMonitorPrefillHref } from "@/lib/monitors/prefill-link";

export const dynamic = "force-dynamic";

type ActionBand = "intake_now" | "review_today" | "watch" | "archive";

type SearchParams = Promise<{
  q?: string | string[] | undefined;
  band?: string | string[] | undefined;
  regionCode?: string | string[] | undefined;
  pressureGrade?: string | string[] | undefined;
}>;

type IntegratedDistributionRow = {
  total_rows: number | null;
  avg_integrated_signal_score: number | null;
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

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function pickFirst(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function text(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "";
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function num(value: number | null | undefined, fallback = 0) {
  return value === null || value === undefined || Number.isNaN(value)
    ? fallback
    : Number(value);
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatScore(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "-";
  return Number(value).toFixed(digits);
}

function formatPercent(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${Number(value).toFixed(digits)}%`;
}

function formatRelativeMonth(value?: string | null) {
  if (!value) return "기준월 없음";

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[1]}.${match[2]}.${match[3]}`;
  return String(value);
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

function integratedLabel(score: number | null | undefined) {
  const n = num(score, 0);
  if (score == null) return "미정";
  if (n >= 80) return "치명";
  if (n >= 65) return "높음";
  if (n >= 45) return "주의";
  return "관찰";
}

function pressureLabel(grade: string | null | undefined) {
  const value = String(grade || "").toLowerCase();
  if (value === "critical") return "외부 치명";
  if (value === "high") return "외부 높음";
  if (value === "moderate") return "외부 주의";
  if (value === "observe") return "외부 관찰";
  return "외부 미연결";
}

function internalLabel(grade: string | null | undefined) {
  const value = String(grade || "").toLowerCase();
  if (value === "critical") return "내부 치명";
  if (value === "high") return "내부 높음";
  if (value === "medium") return "내부 주의";
  if (value === "low") return "내부 관찰";
  return "내부 미정";
}

function statusTone(score: number | null | undefined) {
  const n = num(score, 0);
  if (score == null || !Number.isFinite(score)) {
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
  if (value === "observe") return "border-sky-200 bg-[#F2FAFF] text-[#0A6FD6]";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function internalTone(score: number | null | undefined) {
  const n = num(score, 0);
  if (score == null || !Number.isFinite(score)) {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }
  if (n >= 80) return "border-rose-200 bg-rose-50 text-rose-700";
  if (n >= 60) return "border-orange-200 bg-orange-50 text-orange-700";
  if (n >= 40) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-[#F2FAFF] text-[#0A6FD6]";
}

function normalizeBand(value?: string): ActionBand | "all" {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (
    normalized === "intake_now" ||
    normalized === "review_today" ||
    normalized === "watch" ||
    normalized === "archive"
  ) {
    return normalized;
  }

  return "all";
}

function inferActionBand(row: IntegratedTopRow): ActionBand {
  const integrated = num(row.integrated_signal_score, 0);
  const adjusted = num(row.adjusted_score, 0);
  const pressure = String(row.pressure_grade || "").toLowerCase();

  if (
    integrated >= 45 ||
    (pressure === "critical" && adjusted >= 20) ||
    (pressure === "critical" && integrated >= 30)
  ) {
    return "intake_now";
  }

  if (
    integrated >= 30 ||
    adjusted >= 25 ||
    pressure === "high" ||
    (pressure === "critical" && adjusted >= 12)
  ) {
    return "review_today";
  }

  if (
    integrated >= 15 ||
    adjusted >= 12 ||
    pressure === "moderate" ||
    pressure === "observe"
  ) {
    return "watch";
  }

  return "archive";
}

function bandLabel(band: ActionBand) {
  switch (band) {
    case "intake_now":
      return "바로 인테이크";
    case "review_today":
      return "오늘 검토";
    case "watch":
      return "관찰";
    case "archive":
      return "보관";
  }
}

function bandTone(band: ActionBand) {
  switch (band) {
    case "intake_now":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "review_today":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "watch":
      return "border-sky-200 bg-[#F2FAFF] text-[#0A6FD6]";
    case "archive":
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function includesQuery(row: IntegratedTopRow, query: string) {
  if (!query.trim()) return true;

  const haystack = [
    row.region_name,
    row.category_name,
    row.risk_grade,
    row.pressure_grade,
    row.closure_region_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}

function bandRank(band: ActionBand) {
  switch (band) {
    case "intake_now":
      return 0;
    case "review_today":
      return 1;
    case "watch":
      return 2;
    case "archive":
      return 3;
  }
}

function compareRows(a: IntegratedTopRow, b: IntegratedTopRow) {
  const bandGap = bandRank(inferActionBand(a)) - bandRank(inferActionBand(b));
  if (bandGap !== 0) return bandGap;

  const integratedGap = num(b.integrated_signal_score, -1) - num(a.integrated_signal_score, -1);
  if (integratedGap !== 0) return integratedGap;

  const adjustedGap = num(b.adjusted_score, -1) - num(a.adjusted_score, -1);
  if (adjustedGap !== 0) return adjustedGap;

  return String(a.region_code || "").localeCompare(String(b.region_code || ""));
}

function signalIdentity(row: IntegratedTopRow) {
  return [
    normalizeRegionCode(row.region_code),
    String(row.category_id ?? ""),
    row.score_month ?? "",
    row.pressure_grade ?? "",
    row.risk_grade ?? "",
    row.integrated_signal_score ?? "",
    row.adjusted_score ?? "",
    row.net_change ?? "",
  ].join("|");
}

function dedupeTopRows(rows: IntegratedTopRow[]) {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = signalIdentity(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function loginAwareHref(href: string, isLoggedIn: boolean) {
  return isLoggedIn ? href : `/auth/login?next=${encodeURIComponent(href)}`;
}

function buildUrl(query: string, band: ActionBand | "all", regionCode?: string, pressureGrade?: string) {
  const params = new URLSearchParams();

  if (query.trim()) params.set("q", query.trim());
  if (band !== "all") params.set("band", band);
  if (text(regionCode)) params.set("regionCode", text(regionCode));
  if (text(pressureGrade)) params.set("pressureGrade", text(pressureGrade));

  const qs = params.toString();
  return qs ? `/signals?${qs}` : "/signals";
}

function buildRegionHref(row: IntegratedTopRow) {
  const regionCode = normalizeRegionCode(row.region_code);
  const categoryId = row.category_id;

  if (!regionCode || categoryId == null) return null;
  return `/regions/${encodeURIComponent(regionCode)}/${encodeURIComponent(String(categoryId))}#db-insight`;
}

function suggestedStage(row: IntegratedTopRow) {
  const integrated = num(row.integrated_signal_score, 0);
  if (integrated >= 45) return "urgent";
  if (integrated >= 30) return "caution";
  return "observe";
}

async function getDistribution(client: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data } = await client
      .from("v_integrated_risk_distribution_current")
      .select("*")
      .limit(1)
      .maybeSingle();

    return (data ?? null) as IntegratedDistributionRow | null;
  } catch {
    return null;
  }
}

async function getTopRows(
  client: Awaited<ReturnType<typeof createClient>>,
  params: {
    regionCode?: string;
    pressureGrade?: string;
  },
) {
  try {
    let query = client
      .from("v_integrated_risk_top_current")
      .select("*")
      .limit(80);

    if (params.regionCode) {
      query = query.in("region_code", candidateRegionCodes(params.regionCode));
    }

    if (params.pressureGrade) {
      query = query.eq("pressure_grade", params.pressureGrade);
    }

    const { data } = await query;
    return (data ?? []) as IntegratedTopRow[];
  } catch {
    return [] as IntegratedTopRow[];
  }
}

async function getGapRows(
  client: Awaited<ReturnType<typeof createClient>>,
  regionCode?: string,
) {
  try {
    let query = client
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

function FilterLink({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold transition ${
        active
          ? "border-[#169BF4] bg-[#169BF4] text-white"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}

function MetricCard({
  title,
  value,
  description,
  tone = "default",
}: {
  title: string;
  value: string;
  description: string;
  tone?: "default" | "danger" | "warning" | "observe";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : tone === "observe"
          ? "border-sky-200 bg-[#F2FAFF]"
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-2xl border p-3 shadow-sm ${toneClass}`}>
      <div className="text-[11px] font-semibold text-slate-600">{title}</div>
      <div className="mt-1.5 text-2xl font-black tracking-[-0.04em] text-slate-950">{value}</div>
      <div className="mt-1 text-[11px] leading-5 text-slate-500">{description}</div>
    </div>
  );
}

function SmallStateCard({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: string;
  tone?: "default" | "danger" | "warning" | "observe";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : tone === "observe"
          ? "border-sky-200 bg-[#F2FAFF]"
          : "border-slate-200 bg-white";

  const textClass =
    tone === "observe"
      ? "text-[#0A6FD6]"
      : tone === "danger"
        ? "text-rose-700"
        : tone === "warning"
          ? "text-amber-700"
          : "text-slate-900";

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <div className="text-[10px] font-semibold text-slate-500">{title}</div>
      <div className={`mt-1 text-sm font-bold ${textClass}`}>{value}</div>
    </div>
  );
}

export default async function SignalsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = pickFirst(resolvedSearchParams.q, "");
  const regionCode = pickFirst(resolvedSearchParams.regionCode, "");
  const pressureGrade = pickFirst(resolvedSearchParams.pressureGrade, "");
  const selectedBand = normalizeBand(pickFirst(resolvedSearchParams.band, "all"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [summary, rows, gapRows] = await Promise.all([
    getDistribution(supabase),
    getTopRows(supabase, {
      regionCode: regionCode || undefined,
      pressureGrade: pressureGrade || undefined,
    }),
    getGapRows(supabase, regionCode || undefined),
  ]);

  const normalizedRows = asArray(rows).sort(compareRows);
  const dedupedRows = dedupeTopRows(normalizedRows);

  const filtered = dedupedRows.filter((row) => {
    const band = inferActionBand(row);
    const matchedBand = selectedBand === "all" ? true : band === selectedBand;
    return matchedBand && includesQuery(row, query);
  });

  const intakeNowCount = dedupedRows.filter((row) => inferActionBand(row) === "intake_now").length;
  const reviewTodayCount = dedupedRows.filter((row) => inferActionBand(row) === "review_today").length;
  const watchCount = dedupedRows.filter((row) => inferActionBand(row) === "watch").length;
  const archiveCount = dedupedRows.filter((row) => inferActionBand(row) === "archive").length;
  const spotlight = filtered.slice(0, 5);
  const isLoggedIn = Boolean(user);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="space-y-4">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0A6FD6]">
                  Signals Inbox
                </div>
                <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-950 sm:text-3xl">
                  위험 신호 인박스
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  실행할 신호만 남기고, 통합 위험/내부 위험/외부 압력만 보이게 단순화했습니다.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/monitors"
                  className="inline-flex h-9 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  모니터 보기
                </Link>
                <Link
                  href="/rankings"
                  className="inline-flex h-9 items-center rounded-xl bg-[#169BF4] px-3 text-sm font-semibold text-white transition hover:bg-[#0A84E0]"
                >
                  랭킹 보기
                </Link>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="치명/즉시"
                value={formatNumber(intakeNowCount)}
                description="즉시 개입 우선"
                tone="danger"
              />
              <MetricCard
                title="주의/검토"
                value={formatNumber(reviewTodayCount)}
                description="오늘 안에 검토"
                tone="warning"
              />
              <MetricCard
                title="전체 신호"
                value={formatNumber(summary?.total_rows)}
                description="현재 통합 신호 대상"
              />
              <MetricCard
                title="조인 누락"
                value={formatNumber(gapRows.length)}
                description="외부 압력 연결 상태"
                tone="observe"
              />
            </div>
          </section>

          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
            <form method="get" className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5 xl:flex-row">
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="지역, 업종, 위험등급, 외부압력으로 검색"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none placeholder:text-slate-400 focus:border-[#169BF4]"
                />

                {selectedBand !== "all" ? <input type="hidden" name="band" value={selectedBand} /> : null}
                {text(regionCode) ? <input type="hidden" name="regionCode" value={regionCode} /> : null}
                {text(pressureGrade) ? (
                  <input type="hidden" name="pressureGrade" value={pressureGrade} />
                ) : null}

                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#169BF4] px-4 text-sm font-semibold text-white transition hover:bg-[#0A84E0]"
                >
                  검색 적용
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <FilterLink
                  active={selectedBand === "all"}
                  href={buildUrl(query, "all", regionCode, pressureGrade)}
                  label={`전체 ${dedupedRows.length}`}
                />
                <FilterLink
                  active={selectedBand === "intake_now"}
                  href={buildUrl(query, "intake_now", regionCode, pressureGrade)}
                  label={`즉시 ${intakeNowCount}`}
                />
                <FilterLink
                  active={selectedBand === "review_today"}
                  href={buildUrl(query, "review_today", regionCode, pressureGrade)}
                  label={`검토 ${reviewTodayCount}`}
                />
                <FilterLink
                  active={selectedBand === "watch"}
                  href={buildUrl(query, "watch", regionCode, pressureGrade)}
                  label={`관찰 ${watchCount}`}
                />
                <FilterLink
                  active={selectedBand === "archive"}
                  href={buildUrl(query, "archive", regionCode, pressureGrade)}
                  label={`보관 ${archiveCount}`}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <FilterLink
                  active={!pressureGrade}
                  href={buildUrl(query, selectedBand, regionCode, "")}
                  label="외부압력 전체"
                />
                <FilterLink
                  active={pressureGrade === "critical"}
                  href={buildUrl(query, selectedBand, regionCode, "critical")}
                  label="외부 치명"
                />
                <FilterLink
                  active={pressureGrade === "high"}
                  href={buildUrl(query, selectedBand, regionCode, "high")}
                  label="외부 높음"
                />
                <FilterLink
                  active={pressureGrade === "observe"}
                  href={buildUrl(query, selectedBand, regionCode, "observe")}
                  label="외부 관찰"
                />
              </div>
            </form>
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0A6FD6]">
                    Action Queue
                  </div>
                  <div className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">
                    지금 처리할 신호
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  필터 결과 {formatNumber(filtered.length)}개
                </div>
              </div>

              <div className="space-y-3">
                {filtered.length > 0 ? (
                  filtered.map((row, index) => {
                    const band = inferActionBand(row);
                    const normalizedRegionCode = normalizeRegionCode(row.region_code);
                    const categoryId = row.category_id != null ? Number(row.category_id) : null;
                    const regionHref = buildRegionHref(row);

                    const intakeHref = loginAwareHref(
                      buildMonitorPrefillHref({
                        from: "integrated_signals",
                        businessName: `${row.region_name ?? normalizedRegionCode} ${row.category_name ?? row.category_id}`,
                        regionCode: normalizedRegionCode || undefined,
                        regionName: row.region_name ?? undefined,
                        categoryId: categoryId ?? undefined,
                        categoryName: row.category_name ?? undefined,
                        query: `${row.region_name ?? ""} ${row.category_name ?? ""}`.trim(),
                        trendKeywords: [
                          row.region_name,
                          row.category_name,
                          row.pressure_grade,
                          row.risk_grade,
                        ].filter(Boolean) as string[],
                        stage: suggestedStage(row),
                        reason: `${pressureLabel(row.pressure_grade)} / ${internalLabel(row.risk_grade)}`,
                        score: row.integrated_signal_score ?? undefined,
                        note: [
                          `기준월: ${row.score_month ?? "-"}`,
                          `통합위험: ${formatScore(row.integrated_signal_score, 1)}`,
                          `내부위험: ${formatScore(row.adjusted_score, 1)}`,
                          `외부압력: ${pressureLabel(row.pressure_grade)}`,
                          `전국비중: ${formatPercent(row.national_share_pct, 4)}`,
                          `전년폐업증감: ${formatPercent(row.yoy_closed_delta_pct, 4)}`,
                          `순증감: ${formatNumber(row.net_change)}`,
                        ].join(" / "),
                      }),
                      isLoggedIn,
                    );

                    return (
                      <article
                        key={`${signalIdentity(row)}-${index}`}
                        className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 transition hover:border-[#BFE3FF] hover:bg-white"
                      >
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-bold ${bandTone(
                                  band,
                                )}`}
                              >
                                {bandLabel(band)}
                              </span>
                              <span
                                className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-bold ${statusTone(
                                  row.integrated_signal_score,
                                )}`}
                              >
                                {integratedLabel(row.integrated_signal_score)}
                              </span>
                              <span
                                className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-bold ${internalTone(
                                  row.adjusted_score,
                                )}`}
                              >
                                {internalLabel(row.risk_grade)}
                              </span>
                              <span
                                className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-bold ${pressureTone(
                                  row.pressure_grade,
                                )}`}
                              >
                                {pressureLabel(row.pressure_grade)}
                              </span>
                              <span className="inline-flex h-7 items-center rounded-full border border-slate-300 bg-white px-2.5 text-[10px] font-medium text-slate-500">
                                {formatRelativeMonth(row.score_month)}
                              </span>
                            </div>

                            <div className="mt-2">
                              <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">
                                {row.region_name ?? normalizedRegionCode} · {row.category_name ?? row.category_id}
                              </h2>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                              <SmallStateCard
                                title="통합 위험"
                                value={formatScore(row.integrated_signal_score, 1)}
                                tone={num(row.integrated_signal_score, 0) >= 65 ? "danger" : num(row.integrated_signal_score, 0) >= 45 ? "warning" : "observe"}
                              />
                              <SmallStateCard
                                title="내부 위험"
                                value={formatScore(row.adjusted_score, 1)}
                                tone={num(row.adjusted_score, 0) >= 60 ? "danger" : num(row.adjusted_score, 0) >= 40 ? "warning" : "observe"}
                              />
                              <SmallStateCard
                                title="외부 압력"
                                value={pressureLabel(row.pressure_grade)}
                                tone={String(row.pressure_grade || "").toLowerCase() === "critical" ? "danger" : String(row.pressure_grade || "").toLowerCase() === "high" || String(row.pressure_grade || "").toLowerCase() === "moderate" ? "warning" : "observe"}
                              />
                              <SmallStateCard
                                title="기준월"
                                value={formatRelativeMonth(row.score_month)}
                              />
                            </div>

                            <div className="mt-2 grid gap-2 sm:grid-cols-3">
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
                                <div className="text-[10px] font-semibold text-slate-500">전국 비중</div>
                                <div className="mt-1 font-bold text-slate-800">
                                  {formatPercent(row.national_share_pct, 4)}
                                </div>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
                                <div className="text-[10px] font-semibold text-slate-500">전년 폐업증감</div>
                                <div className="mt-1 font-bold text-slate-800">
                                  {formatPercent(row.yoy_closed_delta_pct, 4)}
                                </div>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
                                <div className="text-[10px] font-semibold text-slate-500">순증감</div>
                                <div className="mt-1 font-bold text-slate-800">
                                  {formatNumber(row.net_change)}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 xl:w-[220px] xl:grid-cols-1">
                            {regionHref ? (
                              <Link
                                href={regionHref}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                상세 보기
                              </Link>
                            ) : (
                              <div className="hidden xl:block" />
                            )}

                            <Link
                              href={intakeHref}
                              className="inline-flex h-9 items-center justify-center rounded-xl bg-[#169BF4] px-3 text-sm font-semibold text-white transition hover:bg-[#0A84E0]"
                            >
                              모니터 인테이크
                            </Link>

                            <Link
                              href="/rankings"
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              랭킹으로 이동
                            </Link>

                            {regionHref ? (
                              <Link
                                href={`/signals?regionCode=${encodeURIComponent(normalizedRegionCode)}`}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                같은 지역만 보기
                              </Link>
                            ) : (
                              <div className="hidden xl:block" />
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-5 py-9 text-center text-sm text-slate-500">
                    현재 조건에 맞는 신호가 없습니다.
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0A6FD6]">
                  Intake Rules
                </div>
                <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">
                  지금 보는 기준
                </h2>

                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                    치명: 통합 위험이 높아 바로 개입이 필요한 항목
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                    주의: 오늘 안에 검토해야 할 항목
                  </div>
                  <div className="rounded-xl border border-sky-200 bg-[#F2FAFF] px-3 py-2.5 text-[#0A6FD6]">
                    관찰: 추세 확인이 필요한 항목
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0A6FD6]">
                  Data Status
                </div>
                <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">
                  외부 압력 연결 상태
                </h2>

                <div className="mt-3 rounded-xl border border-sky-200 bg-[#F2FAFF] px-3 py-3">
                  <div className="text-xs font-semibold text-[#0A6FD6]">조인 누락</div>
                  <div className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
                    {formatNumber(gapRows.length)}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    외부 폐업압력 연결 누락 행 수
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0A6FD6]">
                  Spotlight
                </div>
                <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">
                  상위 신호
                </h2>

                <div className="mt-3 space-y-2">
                  {spotlight.length > 0 ? (
                    spotlight.map((row, index) => (
                      <div
                        key={`spotlight-${signalIdentity(row)}-${index}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-slate-950">
                              {row.region_name ?? row.region_code} · {row.category_name ?? row.category_id}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {pressureLabel(row.pressure_grade)} / {internalLabel(row.risk_grade)}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(
                              row.integrated_signal_score,
                            )}`}
                          >
                            {formatScore(row.integrated_signal_score, 1)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-sm text-slate-500">
                      노출할 신호가 없습니다.
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}