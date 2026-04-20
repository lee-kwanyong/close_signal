import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

function num(value: number | null | undefined, fallback = 0) {
  return value === null || value === undefined || Number.isNaN(value)
    ? fallback
    : Number(value);
}

function text(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
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

function formatMonth(value: string | null | undefined) {
  if (!value) return "-";

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[1]}.${match[2]}.${match[3]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
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

function integratedTone(score: number | null | undefined) {
  const n = num(score, 0);

  if (score == null || !Number.isFinite(score)) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  if (n >= 80) return "border-red-200 bg-red-50 text-red-700";
  if (n >= 65) return "border-orange-200 bg-orange-50 text-orange-700";
  if (n >= 45) return "border-amber-200 bg-amber-50 text-amber-700";
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

function pressureLabel(grade: string | null | undefined) {
  const value = String(grade || "").toLowerCase();

  if (value === "critical") return "치명";
  if (value === "high") return "높음";
  if (value === "moderate") return "주의";
  if (value === "observe") return "관찰";
  return "미연결";
}

function integratedLabel(score: number | null | undefined) {
  const n = num(score, 0);

  if (score == null) return "미정";
  if (n >= 80) return "치명";
  if (n >= 65) return "높음";
  if (n >= 45) return "주의";
  return "관찰";
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
      {sub ? <div className="mt-2 text-sm leading-6 text-slate-500">{sub}</div> : null}
    </div>
  );
}

function Panel({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>

        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="text-sm font-medium text-sky-700 transition hover:text-sky-800"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  );
}

async function getDistribution() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_integrated_risk_distribution_current")
    .select("*")
    .limit(1)
    .maybeSingle();

  return (data ?? null) as IntegratedDistributionRow | null;
}

async function getRegionAggregates() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_integrated_risk_region_aggregates_current")
    .select("*")
    .order("avg_integrated_signal_score", { ascending: false })
    .order("max_integrated_signal_score", { ascending: false })
    .limit(8);

  return (data ?? []) as IntegratedRegionAggregateRow[];
}

async function getTopRows() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_integrated_risk_top_current")
    .select("*")
    .order("integrated_signal_score", { ascending: false })
    .order("adjusted_score", { ascending: false })
    .limit(8);

  return (data ?? []) as IntegratedTopRow[];
}

async function getGapRows() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_integrated_risk_join_gaps_current")
    .select("*")
    .order("region_code", { ascending: true })
    .order("category_id", { ascending: true })
    .limit(20);

  return (data ?? []) as IntegratedGapRow[];
}

export default async function HomePage() {
  const [distribution, regionAggregates, topRows, gapRows] = await Promise.all([
    getDistribution(),
    getRegionAggregates(),
    getTopRows(),
    getGapRows(),
  ]);

  const mediumPlusCount =
    num(distribution?.critical_count) +
    num(distribution?.high_count) +
    num(distribution?.medium_count);

  const gapRegionNames = Array.from(
    new Set(
      gapRows
        .map((row) => text(row.region_name) || normalizeRegionCode(row.region_code))
        .filter(Boolean),
    ),
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-2 text-sm font-medium text-sky-700">INTEGRATED RISK DASHBOARD</div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                통합 위험시그널 대시보드
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                내부 위험점수와 외부 폐업압력을 함께 반영한 현재 운영형 위험 대시보드입니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/rankings"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-sky-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              >
                통합 랭킹 보기
              </Link>
              <Link
                href="/signals"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                시그널 인박스 보기
              </Link>
              <Link
                href="/watchlist"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                관심목록 보기
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="전체 행 수"
            value={formatNumber(distribution?.total_rows)}
            sub="현재 통합 위험 랭킹 대상 수"
          />
          <StatCard
            label="평균 통합위험"
            value={formatScore(distribution?.avg_integrated_signal_score, 2)}
            sub="전체 평균 통합 위험 점수"
          />
          <StatCard
            label="중간 이상"
            value={formatNumber(mediumPlusCount)}
            sub="critical + high + medium"
          />
          <StatCard
            label="조인 누락"
            value={formatNumber(gapRows.length)}
            sub={gapRows.length > 0 ? gapRegionNames.join(", ") : "없음"}
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel
            title="상위 통합 위험 랭킹"
            description="지금 먼저 봐야 할 지역·업종입니다."
            actionHref="/rankings"
            actionLabel="전체 보기"
          >
            {topRows.length === 0 ? (
              <EmptyState text="표시할 통합 위험 랭킹이 없습니다." />
            ) : (
              <div className="grid gap-3">
                {topRows.map((row, index) => {
                  const regionCode = normalizeRegionCode(row.region_code);
                  const categoryId = row.category_id != null ? Number(row.category_id) : null;
                  const href =
                    regionCode && categoryId != null
                      ? `/regions/${encodeURIComponent(regionCode)}/${encodeURIComponent(
                          String(categoryId),
                        )}#db-insight`
                      : "/rankings";

                  return (
                    <Link
                      key={`${regionCode}-${String(row.category_id)}-${row.score_month}`}
                      href={href}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-200 hover:bg-sky-50/40"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-sky-600 px-2 text-xs font-bold text-white">
                              {index + 1}
                            </span>
                            <strong className="text-base font-semibold text-slate-950">
                              {row.region_name ?? regionCode} · {row.category_name ?? row.category_id}
                            </strong>
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${integratedTone(
                                row.integrated_signal_score,
                              )}`}
                            >
                              {integratedLabel(row.integrated_signal_score)} ·{" "}
                              {formatScore(row.integrated_signal_score, 1)}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                              기준월 {formatMonth(row.score_month)}
                            </span>
                            <span
                              className={`rounded-full border px-3 py-1 font-medium ${pressureTone(
                                row.pressure_grade,
                              )}`}
                            >
                              {pressureLabel(row.pressure_grade)}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                              전국 비중 {formatPercent(row.national_share_pct, 4)}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                              전년 폐업증감 {formatPercent(row.yoy_closed_delta_pct, 4)}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                              순증감 {formatNumber(row.net_change)}
                            </span>
                          </div>
                        </div>

                        <div className="grid min-w-[220px] grid-cols-2 gap-2">
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">
                              통합위험
                            </div>
                            <div className="mt-1 text-lg font-semibold text-slate-950">
                              {formatScore(row.integrated_signal_score, 1)}
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">
                              내부위험
                            </div>
                            <div className="mt-1 text-lg font-semibold text-slate-950">
                              {formatScore(row.adjusted_score, 1)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel
            title="지역 집계 요약"
            description="지역별 평균 통합위험과 외부 폐업압력 수준입니다."
            actionHref="/rankings"
            actionLabel="전체 보기"
          >
            {regionAggregates.length === 0 ? (
              <EmptyState text="표시할 지역 집계가 없습니다." />
            ) : (
              <div className="grid gap-3">
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
                        {pressureLabel(row.pressure_grade)}
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
          </Panel>
        </section>

        <section className="mt-6">
          <Panel
            title="조인 누락 항목"
            description="외부 폐업압력이 아직 연결되지 않은 항목입니다."
          >
            {gapRows.length === 0 ? (
              <EmptyState text="현재 조인 누락 항목이 없습니다." />
            ) : (
              <div className="grid gap-3">
                {gapRows.map((row) => (
                  <div
                    key={`${normalizeRegionCode(row.region_code)}-${String(row.category_id)}-${row.score_month}`}
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-950">
                          {row.region_name ?? normalizeRegionCode(row.region_code)} ·{" "}
                          {row.category_name ?? row.category_id}
                        </div>
                        <div className="mt-1 text-sm text-amber-800">
                          기준월 {formatMonth(row.score_month)} / 내부위험{" "}
                          {formatScore(row.adjusted_score, 1)} / 통합위험{" "}
                          {formatScore(row.integrated_signal_score, 1)}
                        </div>
                      </div>

                      <span className="inline-flex h-8 items-center rounded-full border border-amber-300 bg-white px-3 text-xs font-medium text-amber-800">
                        외부 미연결
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>
      </div>
    </main>
  );
}