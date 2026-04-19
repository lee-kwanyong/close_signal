import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildMonitorPrefillHref } from "@/lib/monitors/prefill-link";
import {
  buildCommunityWriteHref,
  presentRiskSignal,
  type RawRiskSignalRow,
} from "@/lib/close-signal/intel/presenter";

export const dynamic = "force-dynamic";

type ActionBand = "intake_now" | "review_today" | "watch" | "archive";

type SearchParams = Promise<{
  q?: string | string[] | undefined;
  band?: string | string[] | undefined;
}>;

type SignalRow = RawRiskSignalRow & {
  signal_id?: string | number | null;
  score?: number | null;
  grade?: string | null;
  type?: string | null;
};

type PresentedSignal = ReturnType<typeof presentRiskSignal>;

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function pickFirst(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function text(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function nullableText(...values: unknown[]) {
  const value = text(...values);
  return value || null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatScore(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return String(Math.round(value));
}

function formatDate(value?: string | null) {
  if (!value) return "날짜 없음";

  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function formatRelativeDate(value?: string | null) {
  if (!value) return "기록 없음";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diff <= 0) return "오늘";
  if (diff === 1) return "1일 전";
  if (diff < 7) return `${diff}일 전`;
  return formatDate(value);
}

function scoreTone(score: number | null | undefined) {
  if (score == null || !Number.isFinite(score)) {
    return "border-sky-200 bg-white text-slate-600";
  }
  if (score >= 80) return "border-rose-200 bg-rose-50 text-rose-700";
  if (score >= 60) return "border-amber-200 bg-amber-50 text-amber-700";
  if (score >= 40) return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
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

function suggestedStage(riskGrade?: string | null, signalType?: string | null) {
  const grade = String(riskGrade || "").trim().toLowerCase();
  const type = String(signalType || "").trim().toLowerCase();

  if (grade === "critical") return "urgent";
  if (grade === "high") return "urgent";
  if (type.includes("closure") || type.includes("rapid_drop")) return "urgent";
  if (grade === "moderate") return "caution";
  return "observe";
}

function loginAwareHref(href: string, isLoggedIn: boolean) {
  return isLoggedIn ? href : `/auth/login?next=${encodeURIComponent(href)}`;
}

function buildUrl(query: string, band: ActionBand | "all") {
  const params = new URLSearchParams();

  if (query.trim()) params.set("q", query.trim());
  if (band !== "all") params.set("band", band);

  const qs = params.toString();
  return qs ? `/signals?${qs}` : "/signals";
}

function buildRegionHref(signal: PresentedSignal) {
  if (!signal.regionCode || !signal.categoryId) return null;
  return `/regions/${encodeURIComponent(signal.regionCode)}/${encodeURIComponent(
    String(signal.categoryId),
  )}`;
}

function inferActionBand(signal: PresentedSignal): ActionBand {
  const score = signal.riskScore ?? 0;
  const grade = String(signal.riskGrade || "").toLowerCase();
  const type = String(signal.signalType || "").toLowerCase();
  const closeRiskCount = signal.closeRiskCount ?? 0;

  if (
    score >= 80 ||
    grade === "critical" ||
    (grade === "high" && closeRiskCount > 0) ||
    type.includes("closure") ||
    type.includes("rapid_drop")
  ) {
    return "intake_now";
  }

  if (
    score >= 60 ||
    grade === "high" ||
    type.includes("high") ||
    type.includes("decline") ||
    type.includes("shrink")
  ) {
    return "review_today";
  }

  if (
    score >= 40 ||
    grade === "moderate" ||
    type.includes("overheat") ||
    type.includes("alert")
  ) {
    return "watch";
  }

  return "archive";
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
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "archive":
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function includesQuery(signal: PresentedSignal, query: string) {
  if (!query.trim()) return true;

  const haystack = [
    signal.title,
    signal.summary,
    signal.why,
    signal.action,
    signal.regionName,
    signal.categoryName,
    signal.signalTypeLabel,
    signal.riskGradeLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}

function compareSignals(a: PresentedSignal, b: PresentedSignal) {
  const bandGap = bandRank(inferActionBand(a)) - bandRank(inferActionBand(b));
  if (bandGap !== 0) return bandGap;

  const scoreGap = (b.riskScore ?? -1) - (a.riskScore ?? -1);
  if (scoreGap !== 0) return scoreGap;

  const closeRiskGap = (b.closeRiskCount ?? -1) - (a.closeRiskCount ?? -1);
  if (closeRiskGap !== 0) return closeRiskGap;

  const aTime = new Date(a.createdAt ?? a.signalDate ?? a.scoreDate ?? 0).getTime();
  const bTime = new Date(b.createdAt ?? b.signalDate ?? b.scoreDate ?? 0).getTime();

  return bTime - aTime;
}

function normalizeSignal(row: SignalRow): PresentedSignal {
  try {
    return presentRiskSignal(row);
  } catch {
    return presentRiskSignal({
      id: nullableText(row.id, row.signal_id) ?? `${Math.random()}`,
      signal_type: nullableText(row.signal_type, row.type),
      type: nullableText(row.type, row.signal_type),
      title: nullableText(row.title),
      summary: nullableText(row.summary),
      description: nullableText(row.description),
      region_code: nullableText(row.region_code),
      region_name: nullableText(row.region_name),
      category_id: nullableText(row.category_id),
      category_name: nullableText(row.category_name),
      query: nullableText((row as Record<string, unknown>).query),
      keyword: nullableText((row as Record<string, unknown>).keyword),
      reason: nullableText((row as Record<string, unknown>).reason),
      stage: nullableText((row as Record<string, unknown>).stage),
      source: nullableText((row as Record<string, unknown>).source),
      risk_score: row.risk_score ?? row.score ?? null,
      risk_grade: nullableText(row.risk_grade, row.grade),
      grade: nullableText(row.grade, row.risk_grade),
      created_at: nullableText(row.created_at),
      updated_at: nullableText(row.updated_at),
      signal_date: nullableText(row.signal_date),
      score_date: nullableText(row.score_date),
      business_count: row.business_count ?? null,
      close_risk_count: row.close_risk_count ?? null,
    } as RawRiskSignalRow);
  }
}

async function getSignals(client: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const candidates = [
    async () =>
      client.from("risk_signals").select("*").order("created_at", { ascending: false }).limit(80),

    async () =>
      client
        .from("risk_signal_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(80),

    async () =>
      client
        .from("business_health_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(80),
  ];

  for (const run of candidates) {
    try {
      const result = await run();
      if (!result.error && Array.isArray(result.data)) {
        return result.data as SignalRow[];
      }
    } catch {
      continue;
    }
  }

  return [];
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
      className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition ${
        active
          ? "border-sky-600 bg-sky-600 text-white"
          : "border-sky-200 bg-white text-sky-700 hover:border-sky-300 hover:bg-sky-50"
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
  tone?: "default" | "danger" | "warning" | "info";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : tone === "info"
          ? "border-sky-200 bg-sky-50"
          : "border-sky-200 bg-white";

  return (
    <div className={`rounded-[24px] border p-4 shadow-sm ${toneClass}`}>
      <div className="text-xs font-semibold text-slate-600">{title}</div>
      <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
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
  const selectedBand = normalizeBand(pickFirst(resolvedSearchParams.band, "all"));

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = await getSignals(supabase);

  const signals = asArray(rows).map(normalizeSignal).sort(compareSignals);

  const filtered = signals.filter((signal) => {
    const band = inferActionBand(signal);
    const matchedBand = selectedBand === "all" ? true : band === selectedBand;
    return matchedBand && includesQuery(signal, query);
  });

  const intakeNowCount = signals.filter((signal) => inferActionBand(signal) === "intake_now").length;
  const reviewTodayCount = signals.filter((signal) => inferActionBand(signal) === "review_today").length;
  const highRiskCount = signals.filter((signal) => {
    const grade = String(signal.riskGrade || "").toLowerCase();
    return grade === "high" || grade === "critical" || (signal.riskScore ?? 0) >= 70;
  }).length;
  const regionCount = new Set(signals.map((signal) => signal.regionCode).filter(Boolean)).size;

  const spotlight = filtered.slice(0, 5);
  const isLoggedIn = Boolean(user);

  return (
 <main className="min-h-screen bg-sky-50 text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="space-y-5">
          <section className="rounded-[28px] border border-sky-100 bg-sky-50 p-5 shadow-[0_12px_30px_rgba(14,165,233,0.08)] sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                  Close Signal · Discovery Inbox
                </div>
                <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">
                  바로 인테이크할 신호를 먼저 봅니다
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  설명보다 운영 우선순위가 먼저 보이도록 시그널 인박스를 다시 정리했습니다.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/monitors"
                  className="inline-flex h-10 items-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                >
                  모니터 보기
                </Link>
                <Link
                  href="/rankings"
                  className="inline-flex h-10 items-center rounded-2xl border border-sky-600 bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  랭킹 보기
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="바로 인테이크"
                value={formatNumber(intakeNowCount)}
                description="즉시 모니터 등록 검토"
                tone={intakeNowCount > 0 ? "danger" : "default"}
              />
              <MetricCard
                title="오늘 검토"
                value={formatNumber(reviewTodayCount)}
                description="오늘 안에 확인할 신호"
                tone={reviewTodayCount > 0 ? "warning" : "default"}
              />
              <MetricCard
                title="고위험"
                value={formatNumber(highRiskCount)}
                description="고위험 또는 70점 이상"
                tone={highRiskCount > 0 ? "info" : "default"}
              />
              <MetricCard
                title="연결 지역"
                value={formatNumber(regionCount)}
                description="현재 신호가 걸린 지역 수"
              />
            </div>
          </section>

          <section className="rounded-[28px] border border-sky-100 bg-sky-50 p-4 shadow-[0_12px_30px_rgba(14,165,233,0.08)] sm:p-5">
            <form method="get" className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 xl:flex-row">
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="지역, 업종, 제목, 사유로 검색"
                  className="h-11 min-w-0 flex-1 rounded-2xl border border-sky-200 bg-white px-4 text-sm outline-none placeholder:text-slate-400 focus:border-sky-400"
                />

                {selectedBand !== "all" ? <input type="hidden" name="band" value={selectedBand} /> : null}

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  검색 적용
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <FilterLink active={selectedBand === "all"} href={buildUrl(query, "all")} label={`전체 ${signals.length}`} />
                <FilterLink
                  active={selectedBand === "intake_now"}
                  href={buildUrl(query, "intake_now")}
                  label={`바로 인테이크 ${intakeNowCount}`}
                />
                <FilterLink
                  active={selectedBand === "review_today"}
                  href={buildUrl(query, "review_today")}
                  label={`오늘 검토 ${reviewTodayCount}`}
                />
                <FilterLink
                  active={selectedBand === "watch"}
                  href={buildUrl(query, "watch")}
                  label={`관찰 ${signals.filter((item) => inferActionBand(item) === "watch").length}`}
                />
                <FilterLink
                  active={selectedBand === "archive"}
                  href={buildUrl(query, "archive")}
                  label={`보관 ${signals.filter((item) => inferActionBand(item) === "archive").length}`}
                />
              </div>
            </form>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-[28px] border border-sky-100 bg-sky-50 p-4 shadow-[0_12px_30px_rgba(14,165,233,0.08)] sm:p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                    Action Queue
                  </div>
                  <div className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">
                    지금 처리할 신호
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  필터 결과 {formatNumber(filtered.length)}개 / 전체 {formatNumber(signals.length)}개
                </div>
              </div>

              <div className="space-y-3">
                {filtered.length > 0 ? (
                  filtered.map((signal) => {
                    const band = inferActionBand(signal);
                    const intakeHref = loginAwareHref(
                      buildMonitorPrefillHref({
                        from: "signals",
                        businessName: signal.title,
                        regionCode: signal.regionCode ?? undefined,
                        regionName: signal.regionName ?? undefined,
                        categoryId: signal.categoryId ?? undefined,
                        categoryName: signal.categoryName ?? undefined,
                        query: `${signal.regionName} ${signal.categoryName}`.trim(),
                        trendKeywords: [
                          signal.regionName,
                          signal.categoryName,
                          signal.signalTypeLabel,
                          signal.title,
                        ].filter(Boolean) as string[],
                        stage: suggestedStage(signal.riskGrade, signal.signalType),
                        reason: signal.signalType || signal.riskGrade || undefined,
                        score: signal.riskScore ?? undefined,
                      }),
                      isLoggedIn,
                    );

                    const communityHref = loginAwareHref(buildCommunityWriteHref(signal), isLoggedIn);
                    const regionHref = buildRegionHref(signal);

                    return (
                      <article
                        key={String(signal.id)}
                        className="rounded-[22px] border border-sky-100 bg-white p-4 transition hover:border-sky-300 hover:bg-sky-50/40"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${bandTone(band)}`}
                              >
                                {bandLabel(band)}
                              </span>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${signal.signalTypeTone}`}
                              >
                                {signal.signalTypeLabel}
                              </span>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${signal.riskGradeTone}`}
                              >
                                {signal.riskGradeLabel}
                              </span>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${signal.revenueTone}`}
                              >
                                {signal.revenueLabel}
                              </span>

                              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                                {formatRelativeDate(signal.createdAt || signal.signalDate || signal.scoreDate)}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950 sm:text-xl">
                                {signal.title}
                              </h2>

                              <span
                                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${scoreTone(
                                  signal.riskScore,
                                )}`}
                              >
                                위험점수 {formatScore(signal.riskScore)}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1">
                                {signal.regionName}
                              </span>
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1">
                                {signal.categoryName}
                              </span>
                              {signal.businessCount != null ? (
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1">
                                  전체 {formatNumber(signal.businessCount)}개
                                </span>
                              ) : null}
                              {signal.closeRiskCount != null ? (
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1">
                                  위험 {formatNumber(signal.closeRiskCount)}개
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-3 text-sm leading-6 text-slate-700">{signal.why || signal.summary}</p>

                            <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-slate-700">
                              <span className="font-semibold text-sky-700">추천 액션</span>
                              <span className="ml-2">{signal.action}</span>
                            </div>

                            {signal.personalization ? (
                              <p className="mt-2 text-sm leading-6 text-slate-500">
                                {signal.personalization}
                              </p>
                            ) : null}
                          </div>

                          <div className="grid grid-cols-2 gap-2 xl:w-[248px] xl:grid-cols-1">
                            <Link
                              href={`/signals/${encodeURIComponent(String(signal.id))}`}
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-sky-50"
                            >
                              상세 보기
                            </Link>

                            <Link
                              href={intakeHref}
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-sky-600 bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
                            >
                              모니터 인테이크
                            </Link>

                            <Link
                              href={communityHref}
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"
                            >
                              커뮤니티 연결
                            </Link>

                            {regionHref ? (
                              <Link
                                href={regionHref}
                                className="inline-flex h-10 items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-sky-50"
                              >
                                지역 보기
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
                  <div className="rounded-[22px] border border-dashed border-sky-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
                    현재 조건에 맞는 시그널이 없습니다.
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-[28px] border border-sky-100 bg-sky-50 p-5 shadow-[0_12px_30px_rgba(14,165,233,0.08)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                  Intake Rules
                </div>
                <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">
                  지금 보는 기준
                </h2>

                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                    바로 인테이크: 고위험, 급감, 폐업 급증, 마지막 기회 성격의 신호
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    오늘 검토: 60점 이상 또는 감소 계열 경고 신호
                  </div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                    관찰: 설명은 남기되 당장 등록보다 추적 가치가 큰 신호
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-sky-100 bg-sky-50 p-5 shadow-[0_12px_30px_rgba(14,165,233,0.08)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                  Spotlight
                </div>
                <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">
                  상위 인박스
                </h2>

                <div className="mt-4 space-y-3">
                  {spotlight.length > 0 ? (
                    spotlight.map((signal) => (
                      <div
                        key={`spotlight-${String(signal.id)}`}
                        className="rounded-2xl border border-sky-100 bg-white px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-slate-950">
                              {signal.title}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {signal.regionName} · {signal.categoryName}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${scoreTone(
                              signal.riskScore,
                            )}`}
                          >
                            {formatScore(signal.riskScore)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-sky-200 bg-white px-4 py-8 text-sm text-slate-500">
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