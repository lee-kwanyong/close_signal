import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  generateRiskScoresAction,
  generateSignalsAction,
  generateSbizMetricsAction,
} from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type RunRow = {
  id?: string | number | null;
  status?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
  fetched_count?: number | null;
  ingested_count?: number | null;
  error_message?: string | null;
};

type RiskScoreRow = {
  score_date?: string | null;
  region_name?: string | null;
  category_name?: string | null;
  risk_score?: number | null;
  risk_grade?: string | null;

  sales_basis?: "estimated" | "actual" | null;
  sales_change_7d?: number | null;
  sales_change_30d?: number | null;
  sales_change_mom?: number | null;
  sales_change_yoy?: number | null;
  sales_trend_status?:
    | "sharp_drop"
    | "drop"
    | "flat"
    | "rise"
    | "sharp_rise"
    | "rebound"
    | null;

  top_cause_1?: string | null;
  top_cause_2?: string | null;
  top_cause_3?: string | null;
  cause_summary?: string | null;

  recommended_action_now?: string | null;
  recommended_action_week?: string | null;
  recommended_action_watch?: string | null;

  personal_priority_score?: number | null;
  personal_priority_label?: "now" | "soon" | "watch" | null;
};

type RiskSignalRow = {
  id?: string | number | null;
  score_date?: string | null;
  signal_date?: string | null;
  region_name?: string | null;
  category_name?: string | null;
  signal_type?: string | null;
  signal_title?: string | null;
  signal_summary?: string | null;
  risk_score?: number | null;
  risk_grade?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("ko-KR").format(value ?? 0);
}

function formatScore(value: number | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(1) : "0.0";
}

function formatSignedPercent(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0.0%";
  if (n > 0) return `+${n.toFixed(1)}%`;
  if (n < 0) return `${n.toFixed(1)}%`;
  return "0.0%";
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function statusLabel(status: string | null | undefined) {
  if (!status) return "알 수 없음";
  if (status === "success") return "정상";
  if (status === "running" || status === "processing") return "수집중";
  if (status === "queued") return "대기";
  if (status === "failed" || status === "error") return "오류";
  if (status === "retry") return "재시도";
  return status;
}

function priorityLabel(value: string | null | undefined) {
  if (value === "now") return "즉시";
  if (value === "soon") return "곧";
  return "관찰";
}

function priorityTone(value: string | null | undefined) {
  if (value === "now") return "border-red-200 bg-red-50 text-red-700";
  if (value === "soon") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function trendLabel(value: string | null | undefined) {
  if (value === "sharp_drop") return "급락";
  if (value === "drop") return "하락";
  if (value === "flat") return "보합";
  if (value === "rise") return "상승";
  if (value === "sharp_rise") return "급상승";
  if (value === "rebound") return "반등";
  return "-";
}

function signalTypeLabel(value: string | null | undefined) {
  switch (value) {
    case "monthly_decline_alert":
      return "전월 감소";
    case "yoy_decline_alert":
      return "전년동월 감소";
    case "rapid_drop_alert":
      return "급감";
    case "growth_overheat_alert":
      return "과열 주의";
    case "sales_drop_alert":
      return "매출 하락";
    case "sales_growth_alert":
      return "매출 상승";
    case "sales_rebound_alert":
      return "반등 조짐";
    case "sales_overheat_alert":
      return "매출 과열";
    case "high_risk_alert":
    default:
      return "고위험";
  }
}

function signalTypeTone(value: string | null | undefined) {
  switch (value) {
    case "rapid_drop_alert":
    case "sales_drop_alert":
      return "border-red-200 bg-red-50 text-red-700";
    case "monthly_decline_alert":
    case "yoy_decline_alert":
    case "high_risk_alert":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "growth_overheat_alert":
    case "sales_overheat_alert":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "sales_growth_alert":
    case "sales_rebound_alert":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function safeMetaString(
  meta: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = meta?.[key];
  return typeof value === "string" ? value : "";
}

function safeText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "-";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default async function AdminCollectionPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = (await searchParams) || {};
  const successMessage = one(params.success);
  const errorMessage = one(params.error);

  const supabase = supabaseAdmin();

  const [
    riskScoresCountRes,
    riskSignalsCountRes,
    businessesCountRes,
    ntsCountRes,
    latestScoreDateRes,
    latestSignalDateRes,
    sourceRunsRes,
    sbizLatestDateRes,
    sbizCountRes,
  ] = await Promise.all([
    supabase.from("risk_scores").select("*", { count: "exact", head: true }),
    supabase.from("risk_signals").select("*", { count: "exact", head: true }),
    supabase.from("businesses").select("*", { count: "exact", head: true }),
    supabase
      .schema("nts")
      .from("business_status_100_living_industries")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("risk_scores")
      .select("score_date")
      .order("score_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("risk_signals")
      .select("score_date, signal_date")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("source_runs")
      .select(
        "id, status, started_at, finished_at, created_at, fetched_count, ingested_count, error_message"
      )
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("sbiz_region_category_metrics")
      .select("score_date")
      .order("score_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sbiz_region_category_metrics")
      .select("*", { count: "exact", head: true }),
  ]);

  const riskScoresCount = riskScoresCountRes.count ?? 0;
  const riskSignalsCount = riskSignalsCountRes.count ?? 0;
  const businessesCount = businessesCountRes.count ?? 0;
  const ntsCount = ntsCountRes.count ?? 0;
  const sbizMetricsCount = sbizCountRes.count ?? 0;

  const latestScoreDate = latestScoreDateRes.data?.score_date ?? null;
  const latestSignalDate = latestSignalDateRes.data?.score_date ?? null;
  const latestSbizDate = sbizLatestDateRes.data?.score_date ?? null;

  const runs = (sourceRunsRes.data ?? []) as RunRow[];
  const latestRun = runs[0] ?? null;

  const [latestRiskRowsRes, recentSignalsRes] = await Promise.all([
    latestScoreDate
      ? supabase
          .from("risk_scores")
          .select("*")
          .eq("score_date", latestScoreDate)
          .limit(5000)
      : Promise.resolve({ data: [] }),
    supabase
      .from("risk_signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const latestRiskRows = (latestRiskRowsRes.data ?? []) as RiskScoreRow[];
  const recentSignals = (recentSignalsRes.data ?? []) as RiskSignalRow[];

  const avgRisk = average(latestRiskRows.map((row) => num(row.risk_score)));
  const salesRows = latestRiskRows.filter(
    (row) => row.sales_change_30d !== null && row.sales_change_30d !== undefined
  );
  const avgSales30d = average(salesRows.map((row) => num(row.sales_change_30d)));
  const dropCount = latestRiskRows.filter((row) =>
    ["sharp_drop", "drop"].includes(String(row.sales_trend_status || ""))
  ).length;
  const riseCount = latestRiskRows.filter((row) =>
    ["rise", "sharp_rise"].includes(String(row.sales_trend_status || ""))
  ).length;
  const reboundCount = latestRiskRows.filter(
    (row) => row.sales_trend_status === "rebound"
  ).length;
  const priorityNowCount = latestRiskRows.filter(
    (row) => row.personal_priority_label === "now"
  ).length;

  const topCauseMap = new Map<string, number>();
  for (const row of latestRiskRows) {
    for (const cause of [row.top_cause_1, row.top_cause_2, row.top_cause_3]) {
      const label = String(cause || "").trim();
      if (!label) continue;
      topCauseMap.set(label, (topCauseMap.get(label) ?? 0) + 1);
    }
  }

  const topCauseEntries = Array.from(topCauseMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const topCards = [
    {
      label: "NTS 적재 행 수",
      value: formatNumber(ntsCount),
      sub: "nts.business_status_100_living_industries",
    },
    {
      label: "정규 사업체",
      value: formatNumber(businessesCount),
      sub: "businesses",
    },
    {
      label: "점수 계산 건수",
      value: formatNumber(riskScoresCount),
      sub: "risk_scores",
    },
    {
      label: "시그널 건수",
      value: formatNumber(riskSignalsCount),
      sub: "risk_signals",
    },
    {
      label: "sbiz metrics 건수",
      value: formatNumber(sbizMetricsCount),
      sub: "sbiz_region_category_metrics",
    },
    {
      label: "즉시 우선순위",
      value: formatNumber(priorityNowCount),
      sub: "personal_priority_label = now",
    },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                운영
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Collection 운영 현황
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                NTS 적재 데이터 기준으로 risk_scores를 만들고, 그 점수 위에 매출
                흐름·원인·행동·개인화 우선순위를 얹습니다. 그 다음 risk_signals를
                생성하고, sbiz 보조 인텔을 함께 연결합니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <form action={generateRiskScoresAction}>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  risk_scores 생성
                </button>
              </form>

              <form action={generateSignalsAction}>
                <button
                  type="submit"
                  className="rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  risk_signals 생성
                </button>
              </form>

              <form action={generateSbizMetricsAction}>
                <button
                  type="submit"
                  className="rounded-xl border border-violet-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                >
                  sbiz metrics 생성
                </button>
              </form>

              <Link
                href="/signals"
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                시그널 보기
              </Link>

              <Link
                href="/rankings"
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                랭킹 보기
              </Link>
            </div>
          </div>

          {successMessage ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {successMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {topCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="text-sm font-medium text-slate-500">
                {card.label}
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-950">
                {card.value}
              </div>
              <div className="mt-1 text-sm text-slate-500">{card.sub}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-medium text-slate-500">
              최신 score_date
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-950">
              {latestScoreDate || "-"}
            </div>
            <div className="mt-1 text-sm text-slate-500">risk_scores 기준</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-medium text-slate-500">
              최신 signal 기준일
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-950">
              {latestSignalDate || "-"}
            </div>
            <div className="mt-1 text-sm text-slate-500">risk_signals 기준</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-medium text-slate-500">
              최신 sbiz metrics 기준일
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-950">
              {latestSbizDate || "-"}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              sbiz_region_category_metrics 기준
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-medium text-slate-500">
              평균 위험점수
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-950">
              {formatScore(avgRisk)}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              latest risk_scores
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-medium text-slate-500">
              평균 매출 30일 흐름
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-950">
              {formatSignedPercent(avgSales30d)}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              estimated / actual mixed
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-bold text-slate-950">생성 순서</h2>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">
                  1. risk_scores 생성
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  NTS 월별 사업체 집계 기준으로 위험 점수를 만들고, 매출 흐름·상위
                  원인·행동·개인화 우선순위를 함께 계산합니다.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">
                  2. risk_signals 생성
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  감소, 급감, 과열뿐 아니라 매출 하락·상승·반등·과열 신호까지
                  생성합니다.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">
                  3. sbiz metrics 생성
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  보조 인텔 지표로 상권 밀집도, 경쟁압력, 신선도, 노출 강도를
                  함께 봅니다.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                메인 위험도는 <strong>NTS</strong> 기준으로 만들고, sbiz는{" "}
                <strong>보조 인텔 레이어</strong>로 사용합니다.
              </div>
            </div>

            <h3 className="mt-8 text-lg font-bold text-slate-950">
              최신 위험 해석 요약
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="text-sm text-red-700">매출 하락 구간</div>
                <div className="mt-1 text-2xl font-bold text-red-900">
                  {formatNumber(dropCount)}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-sm text-emerald-700">매출 상승 구간</div>
                <div className="mt-1 text-2xl font-bold text-emerald-900">
                  {formatNumber(riseCount)}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm text-amber-700">반등 조짐</div>
                <div className="mt-1 text-2xl font-bold text-amber-900">
                  {formatNumber(reboundCount)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm text-slate-500">최근 source_runs 상태</div>
                <div className="mt-1 text-xl font-bold text-slate-950">
                  {statusLabel(latestRun?.status)}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {formatDateTime(
                    latestRun?.finished_at ||
                      latestRun?.started_at ||
                      latestRun?.created_at
                  )}
                </div>
              </div>
            </div>

            <h3 className="mt-8 text-lg font-bold text-slate-950">
              상위 원인 분포
            </h3>

            <div className="mt-4 flex flex-wrap gap-2">
              {topCauseEntries.length > 0 ? (
                topCauseEntries.map(([label, count]) => (
                  <div
                    key={label}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                  >
                    {label} · {count}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                  아직 상위 원인 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  최근 생성된 시그널
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  risk_signals 최신 12건 미리보기
                </p>
              </div>

              <Link
                href="/signals"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                전체 보기
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {recentSignals.length > 0 ? (
                recentSignals.map((row) => {
                  const cause1 = safeMetaString(row.metadata, "top_cause_1");
                  const actionNow = safeMetaString(
                    row.metadata,
                    "recommended_action_now"
                  );
                  const priority = safeMetaString(
                    row.metadata,
                    "personal_priority_label"
                  );
                  const sales30d = num(row.metadata?.sales_change_30d);

                  return (
                    <div
                      key={String(row.id)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-900">
                          {safeText(row.region_name)} · {safeText(row.category_name)}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <div
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${signalTypeTone(
                              row.signal_type
                            )}`}
                          >
                            {signalTypeLabel(row.signal_type)}
                          </div>

                          <div
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityTone(
                              priority
                            )}`}
                          >
                            {priorityLabel(priority)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 text-base font-bold text-slate-950">
                        {row.signal_title || "-"}
                      </div>

                      <div className="mt-2 text-sm leading-6 text-slate-600">
                        {row.signal_summary || "-"}
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <div className="text-[11px] text-slate-500">
                            최근 30일 매출
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {formatSignedPercent(sales30d)}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <div className="text-[11px] text-slate-500">상위 원인</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {cause1 || "-"}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <div className="text-[11px] text-slate-500">즉시 조치</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900 line-clamp-2">
                            {actionNow || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-slate-600">
                        점수 {formatNumber(row.risk_score)} · 등급 {row.risk_grade || "-"} · 기준일{" "}
                        {formatDate(row.score_date)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  아직 생성된 시그널이 없습니다. 먼저 risk_scores를 만들고, 그 다음
                  risk_signals를 생성하세요.
                </div>
              )}
            </div>

            <h3 className="mt-8 text-lg font-bold text-slate-950">
              최근 수집 실행 이력
            </h3>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[1.1fr_0.7fr_0.7fr_0.7fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                <div>시간</div>
                <div>상태</div>
                <div>Fetched</div>
                <div>Ingested</div>
              </div>

              {runs.length > 0 ? (
                runs.map((run, index) => (
                  <div
                    key={`${run.id ?? index}`}
                    className="grid grid-cols-[1.1fr_0.7fr_0.7fr_0.7fr] gap-4 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
                  >
                    <div className="text-slate-600">
                      {formatDateTime(
                        run.finished_at || run.started_at || run.created_at
                      )}
                    </div>
                    <div className="font-medium text-slate-900">
                      {statusLabel(run.status)}
                    </div>
                    <div className="text-slate-700">
                      {formatNumber(run.fetched_count ?? 0)}
                    </div>
                    <div className="text-slate-700">
                      {formatNumber(run.ingested_count ?? 0)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-slate-500">
                  아직 표시할 실행 이력이 없습니다.
                </div>
              )}
            </div>

            {latestRun?.error_message ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="text-sm font-medium text-rose-700">
                  최근 오류 메시지
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-rose-800">
                  {latestRun.error_message}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}