import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { addWatchlistAction } from "@/app/watchlist/actions";

export const dynamic = "force-dynamic";

type RiskScoreRow = {
  score_date?: string | null;
  region_code?: string | null;
  region_name?: string | null;
  category_id?: number | null;
  category_code?: string | null;
  category_name?: string | null;

  business_count?: number | null;
  signal_count?: number | null;
  risk_score?: number | null;
  risk_grade?: string | null;

  sales_change_7d?: number | null;
  sales_change_30d?: number | null;
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
  id?: number | null;
  region_code?: string | null;
  region_name?: string | null;
  category_id?: number | null;
  category_code?: string | null;
  category_name?: string | null;
  signal_type?: string | null;
  signal_title?: string | null;
  signal_summary?: string | null;
  risk_score?: number | null;
  created_at?: string | null;
};

type RegionAggregate = {
  regionCode: string;
  regionName: string;
  rowCount: number;
  totalBusinessCount: number;
  totalSignalCount: number;
  avgRisk: number;
  avgSales30d: number;
  nowCount: number;
  soonCount: number;
  dropCount: number;
  riseCount: number;
  topCauseMap: Map<string, number>;
  categories: RiskScoreRow[];
  latestSignal: RiskSignalRow | null;
};

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
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

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("ko-KR").format(num(value));
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

function formatScore(value?: number | null) {
  return num(value).toFixed(1);
}

function formatSignedPercent(value?: number | null) {
  const n = num(value);
  if (n > 0) return `+${n.toFixed(1)}%`;
  if (n < 0) return `${n.toFixed(1)}%`;
  return "0.0%";
}

function average(sum: number, count: number) {
  return count > 0 ? sum / count : 0;
}

function priorityLabel(value?: string | null) {
  if (value === "now") return "즉시";
  if (value === "soon") return "곧";
  return "관찰";
}

function priorityTone(value?: string | null) {
  if (value === "now") return "border-rose-200 bg-rose-50 text-rose-700";
  if (value === "soon") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function trendLabel(value?: string | null) {
  if (value === "sharp_drop") return "급락";
  if (value === "drop") return "하락";
  if (value === "flat") return "보합";
  if (value === "rise") return "상승";
  if (value === "sharp_rise") return "급상승";
  if (value === "rebound") return "반등";
  return "-";
}

function trendTone(value?: string | null) {
  if (value === "sharp_drop") return "border-rose-200 bg-rose-50 text-rose-700";
  if (value === "drop") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "flat") return "border-slate-200 bg-slate-50 text-slate-700";
  if (value === "rise") return "border-sky-200 bg-sky-50 text-sky-700";
  if (value === "sharp_rise") return "border-violet-200 bg-violet-50 text-violet-700";
  if (value === "rebound") return "border-sky-300 bg-sky-100 text-sky-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function riskTone(score: number) {
  if (score >= 80) return "border-rose-200 bg-rose-50 text-rose-700";
  if (score >= 60) return "border-amber-200 bg-amber-50 text-amber-700";
  if (score >= 40) return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function riskLabel(score: number) {
  if (score >= 80) return "즉시 개입";
  if (score >= 60) return "집중 관찰";
  if (score >= 40) return "추세 확인";
  return "정기 관찰";
}

function signalTypeLabel(signalType?: string | null) {
  const value = String(signalType || "").toLowerCase();

  if (value === "sales_drop_alert") return "매출 하락";
  if (value === "sales_growth_alert") return "매출 상승";
  if (value === "sales_rebound_alert") return "반등 조짐";
  if (value === "sales_overheat_alert") return "매출 과열";
  if (value.includes("rapid_drop")) return "급감";
  if (value.includes("monthly_decline")) return "전월 감소";
  if (value.includes("yoy_decline")) return "전년동월 감소";
  if (value.includes("growth_overheat")) return "과열 주의";
  if (value.includes("high")) return "고위험";

  return "관찰";
}

function summarizeRegion(region: RegionAggregate) {
  if (region.avgRisk >= 80) {
    return "이 지역은 업종 전반의 위험도가 높아 우선 개입 순서를 빠르게 잡는 편이 좋습니다.";
  }
  if (region.nowCount > 0 && region.dropCount >= region.riseCount) {
    return "즉시 우선 업종과 하락 업종이 함께 보여 먼저 점검할 가치가 큰 지역입니다.";
  }
  if (region.riseCount > region.dropCount && region.avgSales30d > 0) {
    return "상승 조짐이 보이지만 과열과 지속 가능성을 함께 봐야 하는 지역입니다.";
  }
  return "현재는 관찰 중심으로 업종별 차이를 비교해 보는 편이 좋습니다.";
}

function topCauseLabels(map: Map<string, number>) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);
}

function categoryPathValue(row: RiskScoreRow) {
  return String(row.category_id ?? row.category_code ?? row.category_name ?? "");
}

function sortCategoryRows(a: RiskScoreRow, b: RiskScoreRow) {
  const priorityOrder = (value?: string | null) => {
    if (value === "now") return 3;
    if (value === "soon") return 2;
    return 1;
  };

  const priorityDiff =
    priorityOrder(b.personal_priority_label) - priorityOrder(a.personal_priority_label);
  if (priorityDiff !== 0) return priorityDiff;

  const riskDiff = num(b.risk_score) - num(a.risk_score);
  if (riskDiff !== 0) return riskDiff;

  return num(a.sales_change_30d) - num(b.sales_change_30d);
}

const shellClass = "mx-auto max-w-7xl px-4 sm:px-6";
const surfaceCard =
  "rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.05)]";
const primaryButton =
  "inline-flex h-11 items-center justify-center rounded-2xl border border-[#0B5CAB] bg-[#0B5CAB] px-5 text-sm font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298]";
const secondaryButton =
  "inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-5 text-sm font-semibold text-[#0B5CAB] transition hover:border-sky-300 hover:bg-sky-100";

function KpiCard({
  label,
  value,
  description,
  tone = "default",
}: {
  label: string;
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
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-[1.5rem] border p-5 ${toneClass}`}>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">{value}</div>
      <div className="mt-2 text-xs leading-6 text-slate-600">{description}</div>
    </div>
  );
}

function StatBox({
  label,
  value,
  valueClassName = "text-slate-950",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className={`mt-1 text-sm font-bold ${valueClassName}`}>{value}</div>
    </div>
  );
}

export default async function RegionsPage() {
  const supabase = await supabaseServer();

  const [scoresRes, signalsRes] = await Promise.all([
    supabase.from("risk_scores").select("*").order("score_date", { ascending: false }).limit(10000),
    supabase
      .from("risk_signals")
      .select("*")
      .order("signal_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(4000),
  ]);

  const rows = (scoresRes.data ?? []) as RiskScoreRow[];
  const signals = (signalsRes.data ?? []) as RiskSignalRow[];

  const latestScoreDate =
    rows
      .map((row) => row.score_date)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => (a < b ? 1 : -1))[0] ?? null;

  const latestRows = latestScoreDate
    ? rows.filter((row) => row.score_date === latestScoreDate)
    : rows;

  const latestSignalMap = new Map<string, RiskSignalRow>();
  for (const signal of signals) {
    const code = text(signal.region_code);
    if (!code) continue;
    if (!latestSignalMap.has(code)) {
      latestSignalMap.set(code, signal);
    }
  }

  const regionMap = new Map<string, RegionAggregate>();

  for (const row of latestRows) {
    const regionCode = text(row.region_code);
    if (!regionCode) continue;

    const current =
      regionMap.get(regionCode) ??
      ({
        regionCode,
        regionName: text(row.region_name, regionCode),
        rowCount: 0,
        totalBusinessCount: 0,
        totalSignalCount: 0,
        avgRisk: 0,
        avgSales30d: 0,
        nowCount: 0,
        soonCount: 0,
        dropCount: 0,
        riseCount: 0,
        topCauseMap: new Map<string, number>(),
        categories: [],
        latestSignal: latestSignalMap.get(regionCode) ?? null,
      } satisfies RegionAggregate);

    current.rowCount += 1;
    current.totalBusinessCount += num(row.business_count);
    current.totalSignalCount += num(row.signal_count);
    current.avgRisk += num(row.risk_score);
    current.avgSales30d += num(row.sales_change_30d);

    if (row.personal_priority_label === "now") current.nowCount += 1;
    if (row.personal_priority_label === "soon") current.soonCount += 1;
    if (row.sales_trend_status === "drop" || row.sales_trend_status === "sharp_drop") {
      current.dropCount += 1;
    }
    if (
      row.sales_trend_status === "rise" ||
      row.sales_trend_status === "sharp_rise" ||
      row.sales_trend_status === "rebound"
    ) {
      current.riseCount += 1;
    }

    for (const cause of [row.top_cause_1, row.top_cause_2, row.top_cause_3]) {
      const label = formatCause(cause);
      if (!label) continue;
      current.topCauseMap.set(label, (current.topCauseMap.get(label) ?? 0) + 1);
    }

    current.categories.push(row);
    regionMap.set(regionCode, current);
  }

  const regions = Array.from(regionMap.values())
    .map((region) => ({
      ...region,
      avgRisk: average(region.avgRisk, region.rowCount),
      avgSales30d: average(region.avgSales30d, region.rowCount),
      categories: region.categories.sort(sortCategoryRows),
    }))
    .sort((a, b) => {
      if (b.avgRisk !== a.avgRisk) return b.avgRisk - a.avgRisk;
      if (b.nowCount !== a.nowCount) return b.nowCount - a.nowCount;
      return b.totalBusinessCount - a.totalBusinessCount;
    });

  const totalBusinesses = regions.reduce((sum, region) => sum + region.totalBusinessCount, 0);
  const avgRisk = regions.length
    ? regions.reduce((sum, region) => sum + region.avgRisk, 0) / regions.length
    : 0;
  const urgentRegions = regions.filter((region) => region.avgRisk >= 80 || region.nowCount > 0).length;
  const activeSignalRegions = regions.filter((region) => region.latestSignal).length;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className={`${shellClass} pb-14 pt-6`}>
        <div className="space-y-6">
          <section className={surfaceCard}>
            <div className="bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_46%,#ffffff_100%)] px-6 py-6 sm:px-8">
              <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                <div className="min-w-0">
                  <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                    Region Hub
                  </div>

                  <h1 className="mt-5 text-[32px] font-black tracking-[-0.05em] text-slate-950 sm:text-[46px]">
                    지역 허브
                  </h1>

                  <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
                    지역 단위로 업종 흐름을 비교하고, 바로 지역 상세와 업종 상세로 들어가
                    발견 → 해석 → 다음 연결 흐름을 이어갈 수 있게 정리했습니다.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href="/rankings" className={primaryButton}>
                      위험 랭킹 보기
                    </Link>
                    <Link href="/signals" className={secondaryButton}>
                      최근 시그널 보기
                    </Link>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                    Region Snapshot
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <KpiCard
                      label="지역 수"
                      value={formatNumber(regions.length)}
                      description="최신 기준 집계된 지역 수"
                      tone="info"
                    />
                    <KpiCard
                      label="즉시 점검"
                      value={formatNumber(urgentRegions)}
                      description="평균 위험 높거나 즉시 우선 업종 있는 지역"
                      tone={urgentRegions > 0 ? "warning" : "default"}
                    />
                    <KpiCard
                      label="평균 위험"
                      value={formatScore(avgRisk)}
                      description={`기준일 ${formatDate(latestScoreDate)}`}
                    />
                    <KpiCard
                      label="총 사업체"
                      value={formatNumber(totalBusinesses)}
                      description={`시그널 연결 지역 ${formatNumber(activeSignalRegions)}곳`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {regions.length === 0 ? (
            <section className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
              <div className="text-xl font-black tracking-[-0.03em] text-slate-950">
                지역 데이터가 없습니다
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                아직 집계된 지역 위험 정보가 없습니다.
              </p>
            </section>
          ) : (
            <section className="space-y-4">
              {regions.map((region, index) => {
                const topCategories = region.categories.slice(0, 3);
                const causes = topCauseLabels(region.topCauseMap);

                return (
                  <article
                    key={region.regionCode}
                    className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
                  >
                    <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#fcfdff_0%,#f7fbff_100%)] px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          #{index + 1}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${riskTone(
                            region.avgRisk,
                          )}`}
                        >
                          {riskLabel(region.avgRisk)}
                        </span>
                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          기준일 {formatDate(latestScoreDate)}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1.1fr)_340px]">
                      <div className="min-w-0">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h2 className="text-[28px] font-black tracking-[-0.04em] text-slate-950">
                              {region.regionName}
                            </h2>
                            <p className="mt-2 text-sm leading-7 text-slate-600">
                              {summarizeRegion(region)}
                            </p>
                          </div>

                          <div
                            className={`rounded-[1.25rem] border px-4 py-4 text-center ${riskTone(
                              region.avgRisk,
                            )}`}
                          >
                            <div className="text-[10px] uppercase tracking-[0.14em] opacity-80">
                              avg risk
                            </div>
                            <div className="mt-1 text-[34px] font-black tracking-[-0.05em]">
                              {formatScore(region.avgRisk)}
                            </div>
                            <div className="mt-0.5 text-[11px] opacity-90">
                              {riskLabel(region.avgRisk)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                          <StatBox label="사업체" value={formatNumber(region.totalBusinessCount)} />
                          <StatBox label="시그널" value={formatNumber(region.totalSignalCount)} />
                          <StatBox label="즉시" value={formatNumber(region.nowCount)} />
                          <StatBox
                            label="30d 변화"
                            value={formatSignedPercent(region.avgSales30d)}
                            valueClassName={
                              region.avgSales30d > 0
                                ? "text-[#0B5CAB]"
                                : region.avgSales30d < 0
                                  ? "text-rose-700"
                                  : "text-slate-950"
                            }
                          />
                        </div>

                        {causes.length > 0 ? (
                          <div className="mt-5 flex flex-wrap gap-2">
                            {causes.map((cause) => (
                              <span
                                key={cause}
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700"
                              >
                                {cause}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          {topCategories.map((category) => {
                            const pathValue = categoryPathValue(category);
                            const detailHref = `/regions/${encodeURIComponent(region.regionCode)}/${encodeURIComponent(pathValue)}`;

                            return (
                              <div
                                key={`${region.regionCode}-${pathValue}`}
                                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priorityTone(
                                      category.personal_priority_label,
                                    )}`}
                                  >
                                    {priorityLabel(category.personal_priority_label)}
                                  </span>
                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${trendTone(
                                      category.sales_trend_status,
                                    )}`}
                                  >
                                    {trendLabel(category.sales_trend_status)}
                                  </span>
                                </div>

                                <div className="mt-3 text-base font-black tracking-[-0.02em] text-slate-950">
                                  {category.category_name || pathValue}
                                </div>

                                <div className="mt-2 text-sm leading-7 text-slate-600">
                                  위험 {formatScore(category.risk_score)}점 · 30일 매출 {formatSignedPercent(category.sales_change_30d)}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Link href={detailHref} className={secondaryButton}>
                                    업종 상세
                                  </Link>

                                  {category.category_id != null ? (
                                    <form action={addWatchlistAction}>
                                      <input type="hidden" name="region_code" value={region.regionCode} />
                                      <input type="hidden" name="category_id" value={String(category.category_id)} />
                                      <input type="hidden" name="return_to" value="/regions" />
                                      <button type="submit" className={primaryButton}>
                                        관심 저장
                                      </button>
                                    </form>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                          <div className="text-sm font-semibold text-slate-900">최근 시그널</div>

                          {region.latestSignal ? (
                            <>
                              <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                {signalTypeLabel(region.latestSignal.signal_type)}
                              </div>

                              <div className="mt-3 text-base font-black tracking-[-0.02em] text-slate-950">
                                {text(region.latestSignal.signal_title) || "최근 신호"}
                              </div>

                              <p className="mt-2 text-sm leading-7 text-slate-600">
                                {text(region.latestSignal.signal_summary) || "설명 없음"}
                              </p>

                              <div className="mt-3 text-sm text-slate-500">
                                {formatDate(region.latestSignal.created_at)}
                              </div>
                            </>
                          ) : (
                            <p className="mt-3 text-sm leading-7 text-slate-500">
                              최근 연결 시그널이 없습니다.
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/regions/${encodeURIComponent(region.regionCode)}`}
                            className={primaryButton}
                          >
                            지역 상세
                          </Link>

                          <Link
                            href={`/community/region/${encodeURIComponent(region.regionCode)}`}
                            className={secondaryButton}
                          >
                            지역 커뮤니티
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function formatCause(value?: string | null) {
  return String(value || "").trim();
}