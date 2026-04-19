import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { removeWatchlistAction } from "./actions";

export const dynamic = "force-dynamic";

type WatchlistRow = {
  id?: number | string;
  region_code?: string | null;
  region_name?: string | null;
  category_id?: number | string | null;
  category_name?: string | null;
  risk_score?: number | null;
  risk_grade?: string | null;
  signal_count?: number | null;
  created_at?: string | null;
};

type RiskScoreRow = {
  score_date?: string | null;
  region_code?: string | null;
  region_name?: string | null;
  category_id?: number | null;
  category_code?: string | null;
  category_name?: string | null;
  business_count?: number | null;
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

type SignalRow = {
  region_code?: string | null;
  category_id?: number | null;
  category_code?: string | null;
  category_name?: string | null;
  signal_type?: string | null;
  signal_title?: string | null;
  signal_summary?: string | null;
  risk_score?: number | null;
  created_at?: string | null;
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

function formatNumber(value: number | null | undefined) {
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

function watchlistKey(regionCode?: string | null, categoryId?: string | number | null) {
  return `${String(regionCode || "")}::${String(categoryId || "")}`;
}

function gradeLabel(value?: string | null) {
  const grade = String(value || "").toLowerCase();
  if (grade === "high") return "고위험";
  if (grade === "medium") return "주의";
  return "관찰";
}

function gradeTone(value?: string | null) {
  const grade = String(value || "").toLowerCase();
  if (grade === "high") return "border-rose-200 bg-rose-50 text-rose-700";
  if (grade === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function priorityLabel(value?: string | null) {
  if (value === "now") return "즉시";
  if (value === "soon") return "곧";
  return "관찰";
}

function priorityTone(value?: string | null) {
  if (value === "now") return "border-rose-200 bg-rose-50 text-rose-700";
  if (value === "soon") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
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
  if (value === "rise") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "sharp_rise") return "border-violet-200 bg-violet-50 text-violet-700";
  if (value === "rebound") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function signalTypeLabel(value?: string | null) {
  const raw = String(value || "").toLowerCase();

  if (raw === "growth_overheat_alert") return "급증 과열";
  if (raw === "monthly_decline_alert") return "전월 감소";
  if (raw === "rapid_drop_alert") return "급감";
  if (raw === "yoy_decline_alert") return "전년동월 감소";
  if (raw === "sales_drop_alert") return "매출 하락";
  if (raw === "sales_growth_alert") return "매출 상승";
  if (raw === "sales_rebound_alert") return "반등 조짐";
  if (raw === "sales_overheat_alert") return "매출 과열";
  if (raw === "high_risk_alert") return "고위험";

  return value || "기타";
}

function scoreTone(score: number) {
  if (score >= 80) return "border-rose-200 bg-rose-50 text-rose-700";
  if (score >= 60) return "border-amber-200 bg-amber-50 text-amber-700";
  if (score >= 40) return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function riskSummary(score: number) {
  if (score >= 80) return "즉시 개입 우선";
  if (score >= 60) return "집중 관찰 및 행동 연결";
  if (score >= 40) return "추세 확인 필요";
  return "정기 관찰";
}

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
    <div className={`rounded-[26px] border p-5 ${toneClass}`}>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">{value}</div>
      <div className="mt-2 text-xs leading-6 text-slate-600">{description}</div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default async function WatchlistPage() {
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("v_watchlist_status")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as WatchlistRow[];

  const latestScoreDateRes = await supabase
    .from("risk_scores")
    .select("score_date")
    .order("score_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestScoreDate = latestScoreDateRes.data?.score_date ?? null;

  const regionCodes = Array.from(
    new Set(rows.map((row) => String(row.region_code || "").trim()).filter(Boolean)),
  );

  const [latestScoresRes, latestSignalsRes] = await Promise.all([
    latestScoreDate && regionCodes.length > 0
      ? supabase
          .from("risk_scores")
          .select("*")
          .eq("score_date", latestScoreDate)
          .in("region_code", regionCodes)
          .limit(10000)
      : Promise.resolve({ data: [] as RiskScoreRow[] }),
    latestScoreDate && regionCodes.length > 0
      ? supabase
          .from("risk_signals")
          .select("*")
          .eq("score_date", latestScoreDate)
          .in("region_code", regionCodes)
          .limit(5000)
      : Promise.resolve({ data: [] as SignalRow[] }),
  ]);

  const latestScores = (latestScoresRes.data ?? []) as RiskScoreRow[];
  const latestSignals = (latestSignalsRes.data ?? []) as SignalRow[];

  const scoreMap = new Map<string, RiskScoreRow>();
  for (const row of latestScores) {
    scoreMap.set(watchlistKey(row.region_code, row.category_id), row);
  }

  const signalMap = new Map<string, SignalRow[]>();
  for (const row of latestSignals) {
    const key = watchlistKey(row.region_code, row.category_id);
    const current = signalMap.get(key) ?? [];
    current.push(row);
    signalMap.set(key, current);
  }

  const urgentCount = rows.filter((row) => {
    const enriched = scoreMap.get(watchlistKey(row.region_code, row.category_id));
    const score = num(enriched?.risk_score ?? row.risk_score);
    return score >= 80;
  }).length;

  const actionCount = rows.filter((row) => {
    const enriched = scoreMap.get(watchlistKey(row.region_code, row.category_id));
    const score = num(enriched?.risk_score ?? row.risk_score);
    return score >= 60 && score < 80;
  }).length;

  const avgScore =
    rows.length > 0
      ? rows.reduce((sum, row) => {
          const enriched = scoreMap.get(watchlistKey(row.region_code, row.category_id));
          return sum + num(enriched?.risk_score ?? row.risk_score);
        }, 0) / rows.length
      : 0;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.06)]">
          <div className="bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_46%,#ffffff_100%)] px-6 py-6 sm:px-8">
            <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Watchlist Queue
                </div>

                <h1 className="mt-5 text-[32px] font-black tracking-[-0.05em] text-slate-950 sm:text-[46px]">
                  관심 조합 관리
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
                  저장한 지역·업종 조합을 단순 목록이 아니라 운영 대기열처럼 정리했습니다.
                  위험도, 최근 매출 변화, 상위 원인, 즉시 행동 기준을 함께 보고 바로 상세
                  화면으로 들어갈 수 있습니다.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/rankings"
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#0B5CAB] bg-[#0B5CAB] px-5 text-sm font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298]"
                  >
                    위험 랭킹 보기
                  </Link>
                  <Link
                    href="/signals"
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    최근 시그널 보기
                  </Link>
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  Watchlist Snapshot
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <KpiCard
                    label="전체 조합"
                    value={formatNumber(rows.length)}
                    description="저장된 관심 지역·업종 수"
                    tone="info"
                  />
                  <KpiCard
                    label="즉시 개입"
                    value={formatNumber(urgentCount)}
                    description="80점 이상 관심 조합"
                    tone={urgentCount > 0 ? "danger" : "default"}
                  />
                  <KpiCard
                    label="집중 관찰"
                    value={formatNumber(actionCount)}
                    description="60점 이상 80점 미만"
                    tone={actionCount > 0 ? "warning" : "default"}
                  />
                  <KpiCard
                    label="평균 위험"
                    value={avgScore ? avgScore.toFixed(1) : "0.0"}
                    description="관심 조합 평균 위험 점수"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {rows.length === 0 ? (
          <section className="rounded-[32px] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
            <div className="text-xl font-black tracking-[-0.03em] text-slate-950">
              아직 관심목록이 없습니다
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              먼저 랭킹이나 지역·업종 상세에서 관심 있는 조합을 저장해 보세요.
            </p>
            <div className="mt-6">
              <Link
                href="/rankings"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#0B5CAB] bg-[#0B5CAB] px-5 text-sm font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298]"
              >
                위험 랭킹으로 이동
              </Link>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            {rows.map((row, index) => {
              const key = watchlistKey(row.region_code, row.category_id);
              const enriched = scoreMap.get(key);
              const relatedSignals = (signalMap.get(key) ?? []).sort((a, b) => {
                return (
                  new Date(b.created_at || "").getTime() -
                  new Date(a.created_at || "").getTime()
                );
              });

              const riskScore = num(enriched?.risk_score ?? row.risk_score);
              const riskGrade = text(enriched?.risk_grade ?? row.risk_grade) || "low";
              const sales30d = enriched?.sales_change_30d ?? 0;
              const sales7d = enriched?.sales_change_7d ?? 0;
              const trend = enriched?.sales_trend_status ?? "flat";
              const priority = enriched?.personal_priority_label ?? "watch";
              const causeSummary = text(enriched?.cause_summary) || "요약 원인이 없습니다.";
              const causes = [
                text(enriched?.top_cause_1),
                text(enriched?.top_cause_2),
                text(enriched?.top_cause_3),
              ].filter(Boolean);

              const actionNow = text(enriched?.recommended_action_now) || "즉시 액션 없음";
              const actionWeek =
                text(enriched?.recommended_action_week) || "이번 주 액션 없음";
              const watchAction =
                text(enriched?.recommended_action_watch) || "관찰 액션 없음";
              const latestSignal = relatedSignals[0] ?? null;

              const regionName = text(row.region_name, enriched?.region_name, row.region_code) || "-";
              const categoryName =
                text(row.category_name, enriched?.category_name, row.category_id) || "-";
              const detailHref = `/regions/${encodeURIComponent(
                String(row.region_code || ""),
              )}/${encodeURIComponent(String(row.category_id || ""))}`;

              return (
                <article
                  key={`${row.id ?? index}`}
                  className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
                >
                  <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#fcfdff_0%,#f7fbff_100%)] px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        #{index + 1}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${gradeTone(
                          riskGrade,
                        )}`}
                      >
                        {gradeLabel(riskGrade)}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${priorityTone(
                          priority,
                        )}`}
                      >
                        {priorityLabel(priority)}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${trendTone(
                          trend,
                        )}`}
                      >
                        {trendLabel(trend)}
                      </span>
                      {latestSignal?.signal_type ? (
                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          최근 {signalTypeLabel(latestSignal.signal_type)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1.15fr)_340px]">
                    <div className="min-w-0">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-[28px] font-black tracking-[-0.04em] text-slate-950">
                            {regionName}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            {categoryName} · 저장일 {formatDate(row.created_at)}
                          </div>
                        </div>

                        <div
                          className={`rounded-[22px] border px-4 py-4 text-center ${scoreTone(
                            riskScore,
                          )}`}
                        >
                          <div className="text-[10px] uppercase tracking-[0.14em] opacity-80">
                            risk score
                          </div>
                          <div className="mt-1 text-[34px] font-black tracking-[-0.05em]">
                            {formatScore(riskScore)}
                          </div>
                          <div className="mt-0.5 text-[11px] opacity-90">
                            {riskSummary(riskScore)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <InfoBox label="시그널 수" value={formatNumber(row.signal_count ?? relatedSignals.length)} />
                        <InfoBox label="최근 30일 매출" value={formatSignedPercent(sales30d)} />
                        <InfoBox label="최근 7일 매출" value={formatSignedPercent(sales7d)} />
                        <InfoBox
                          label="우선순위"
                          value={`${priorityLabel(priority)} / ${trendLabel(trend)}`}
                        />
                      </div>

                      <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          상위 원인
                        </div>

                        {causes.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {causes.map((cause) => (
                              <span
                                key={cause}
                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700"
                              >
                                {cause}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <p className="mt-3 text-sm leading-7 text-slate-600">{causeSummary}</p>
                      </div>

                      <div className="mt-5 grid gap-3 lg:grid-cols-3">
                        <ActionPanel
                          title="지금 바로"
                          tone="danger"
                          body={actionNow}
                        />
                        <ActionPanel
                          title="이번 주"
                          tone="warning"
                          body={actionWeek}
                        />
                        <ActionPanel
                          title="관찰"
                          tone="info"
                          body={watchAction}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
                        <div className="text-sm font-semibold text-slate-900">최근 시그널</div>

                        {latestSignal ? (
                          <>
                            <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                              {signalTypeLabel(latestSignal.signal_type)}
                            </div>

                            <div className="mt-3 text-base font-black tracking-[-0.02em] text-slate-950">
                              {text(latestSignal.signal_title) || "최근 신호"}
                            </div>

                            <p className="mt-2 text-sm leading-7 text-slate-600">
                              {text(latestSignal.signal_summary) || "설명 없음"}
                            </p>

                            <div className="mt-3 text-xs text-slate-500">
                              {formatDate(latestSignal.created_at)}
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
                          href={detailHref}
                          className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#0B5CAB] bg-[#0B5CAB] px-4 text-sm font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298]"
                        >
                          상세 보기
                        </Link>

                        <Link
                          href="/signals"
                          className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-[#0B5CAB] transition hover:border-sky-300 hover:bg-sky-100"
                        >
                          시그널 더 보기
                        </Link>

                        <form action={removeWatchlistAction}>
                          <input type="hidden" name="watchlist_id" value={String(row.id ?? "")} />
                          <input type="hidden" name="return_to" value="/watchlist" />
                          <input type="hidden" name="region_code" value={String(row.region_code ?? "")} />
                          <input type="hidden" name="category_id" value={String(row.category_id ?? "")} />
                          <button
                            type="submit"
                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            관심 해제
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function ActionPanel({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "danger" | "warning" | "info";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-sky-200 bg-sky-50 text-sky-900";

  const titleClass =
    tone === "danger"
      ? "text-rose-700"
      : tone === "warning"
        ? "text-amber-700"
        : "text-sky-700";

  return (
    <div className={`rounded-[24px] border p-4 ${toneClass}`}>
      <div className={`text-xs font-semibold uppercase tracking-[0.14em] ${titleClass}`}>
        {title}
      </div>
      <div className="mt-2 text-sm leading-7">{body}</div>
    </div>
  );
}