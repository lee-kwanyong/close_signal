import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type DistributionRow = {
  total_rows: number | null;
  avg_integrated_signal_score: number | null;
  critical_count: number | null;
  high_count: number | null;
  medium_count: number | null;
  low_count: number | null;
};

type RegionAggregateRow = {
  region_code: string | null;
  region_name: string | null;
  score_month: string | null;
  avg_adjusted_score: number | null;
  avg_integrated_signal_score: number | null;
  max_integrated_signal_score: number | null;
  row_count: number | null;
  critical_count: number | null;
  high_count: number | null;
  national_share_pct_avg: number | null;
  yoy_closed_delta_pct_avg: number | null;
};

type TopRow = {
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

type GapRow = {
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

function topIdentity(row: TopRow) {
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

function dedupeTopRows(rows: TopRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = topIdentity(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getDistribution(client: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data } = await client
      .from("v_integrated_risk_distribution_current")
      .select("*")
      .limit(1)
      .maybeSingle();

    return (data ?? null) as DistributionRow | null;
  } catch {
    return null;
  }
}

async function getRegionAggregates(client: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data } = await client
      .from("v_integrated_risk_region_aggregates_current")
      .select("*")
      .order("avg_integrated_signal_score", { ascending: false })
      .limit(8);

    return (data ?? []) as RegionAggregateRow[];
  } catch {
    return [] as RegionAggregateRow[];
  }
}

async function getTopRows(client: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data } = await client
      .from("v_integrated_risk_top_current")
      .select("*")
      .order("integrated_signal_score", { ascending: false })
      .limit(10);

    return (data ?? []) as TopRow[];
  } catch {
    return [] as TopRow[];
  }
}

async function getGapRows(client: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data } = await client
      .from("v_integrated_risk_join_gaps_current")
      .select("*")
      .limit(12);

    return (data ?? []) as GapRow[];
  } catch {
    return [] as GapRow[];
  }
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
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="text-xs font-semibold text-slate-600">{title}</div>
      <div className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  href,
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-lg font-black tracking-[-0.03em] text-slate-950">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
        </div>

        {href ? (
          <Link
            href={href}
            className="inline-flex h-9 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            전체 보기
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  );
}

export default async function HomePage() {
  const supabase = await createClient();

  const [distribution, regionAggregates, rawTopRows, gapRows] = await Promise.all([
    getDistribution(supabase),
    getRegionAggregates(supabase),
    getTopRows(supabase),
    getGapRows(supabase),
  ]);

  const topRows = dedupeTopRows(asArray(rawTopRows)).slice(0, 5);
  const regionCount = new Set(
    regionAggregates.map((row) => normalizeRegionCode(row.region_code)).filter(Boolean),
  ).size;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="space-y-4">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0A6FD6]">
                  Close Signal Dashboard
                </div>
                <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-950 sm:text-3xl">
                  통합 위험 대시보드
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  지금 위험한 지역·업종이 먼저 보이도록 정리했습니다.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/rankings"
                  className="inline-flex h-9 items-center rounded-xl bg-[#169BF4] px-3 text-sm font-semibold text-white transition hover:bg-[#0A84E0]"
                >
                  위험 랭킹
                </Link>
                <Link
                  href="/signals"
                  className="inline-flex h-9 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  신호 인박스
                </Link>
                <Link
                  href="/watchlist"
                  className="inline-flex h-9 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  관심목록
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="전체 위험 행"
              value={formatNumber(distribution?.total_rows)}
              description="현재 통합 위험 대상"
            />
            <MetricCard
              title="치명"
              value={formatNumber(distribution?.critical_count)}
              description="가장 먼저 개입해야 할 구간"
              tone="danger"
            />
            <MetricCard
              title="주의"
              value={formatNumber(distribution?.medium_count)}
              description="추가 악화 전 점검 대상"
              tone="warning"
            />
            <MetricCard
              title="조인 누락"
              value={formatNumber(gapRows.length)}
              description="외부 압력 연결 상태"
              tone="observe"
            />
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <SectionCard
                title="상위 위험 순위"
                subtitle="가장 먼저 봐야 할 상위 위험 조합"
                href="/rankings"
              >
                {topRows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                    표시할 위험 순위가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topRows.map((row, index) => {
                      const regionCode = normalizeRegionCode(row.region_code);
                      const detailHref =
                        regionCode && row.category_id != null
                          ? `/regions/${encodeURIComponent(regionCode)}/${encodeURIComponent(
                              String(row.category_id),
                            )}#db-insight`
                          : "/rankings";

                      return (
                        <article
                          key={`${topIdentity(row)}-${index}`}
                          className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 transition hover:border-[#BFE3FF] hover:bg-white"
                        >
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex h-7 items-center rounded-full border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700">
                                  #{index + 1}
                                </span>
                                <span
                                  className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-bold ${statusTone(
                                    row.integrated_signal_score,
                                  )}`}
                                >
                                  {integratedLabel(row.integrated_signal_score)}
                                </span>
                                <span
                                  className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-bold ${pressureTone(
                                    row.pressure_grade,
                                  )}`}
                                >
                                  {pressureLabel(row.pressure_grade)}
                                </span>
                              </div>

                              <div className="mt-2">
                                <Link
                                  href={detailHref}
                                  className="text-lg font-black tracking-[-0.03em] text-slate-950 transition hover:text-[#0A6FD6]"
                                >
                                  {row.region_name ?? regionCode} · {row.category_name ?? row.category_id}
                                </Link>
                              </div>

                              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                                  <div className="text-[10px] font-semibold text-rose-700">통합 위험</div>
                                  <div className="mt-1 font-bold text-rose-700">
                                    {formatScore(row.integrated_signal_score, 1)}
                                  </div>
                                </div>
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                                  <div className="text-[10px] font-semibold text-amber-700">내부 위험</div>
                                  <div className="mt-1 font-bold text-amber-700">
                                    {formatScore(row.adjusted_score, 1)}
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                  <div className="text-[10px] font-semibold text-slate-500">전국 비중</div>
                                  <div className="mt-1 font-bold text-slate-800">
                                    {formatPercent(row.national_share_pct, 4)}
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                  <div className="text-[10px] font-semibold text-slate-500">전년 폐업증감</div>
                                  <div className="mt-1 font-bold text-slate-800">
                                    {formatPercent(row.yoy_closed_delta_pct, 4)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 xl:w-[180px] xl:grid-cols-1">
                              <Link
                                href={detailHref}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                상세 보기
                              </Link>
                              <Link
                                href="/signals"
                                className="inline-flex h-9 items-center justify-center rounded-xl bg-[#169BF4] px-3 text-sm font-semibold text-white transition hover:bg-[#0A84E0]"
                              >
                                신호 보기
                              </Link>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="지역별 위험 요약"
                subtitle={`현재 집계 지역 ${formatNumber(regionCount)}곳`}
                href="/rankings"
              >
                {regionAggregates.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                    표시할 지역 집계가 없습니다.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {regionAggregates.map((row, index) => (
                      <div
                        key={`${normalizeRegionCode(row.region_code)}-${index}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-black text-slate-950">
                            {row.region_name ?? row.region_code}
                          </div>
                          <span
                            className={`inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-bold ${statusTone(
                              row.avg_integrated_signal_score,
                            )}`}
                          >
                            {integratedLabel(row.avg_integrated_signal_score)}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                          <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                            <div className="text-[10px] font-semibold text-slate-500">평균 위험</div>
                            <div className="mt-1 font-bold text-slate-800">
                              {formatScore(row.avg_integrated_signal_score, 1)}
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                            <div className="text-[10px] font-semibold text-slate-500">최대 위험</div>
                            <div className="mt-1 font-bold text-slate-800">
                              {formatScore(row.max_integrated_signal_score, 1)}
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                            <div className="text-[10px] font-semibold text-slate-500">행 수</div>
                            <div className="mt-1 font-bold text-slate-800">
                              {formatNumber(row.row_count)}
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                            <div className="text-[10px] font-semibold text-slate-500">전년 증감</div>
                            <div className="mt-1 font-bold text-slate-800">
                              {formatPercent(row.yoy_closed_delta_pct_avg, 2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            <aside className="space-y-4">
              <SectionCard title="위험 분포" subtitle="시그니처 블루는 정보성 강조에만 사용합니다.">
                <div className="grid gap-2">
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                    <div className="text-[11px] font-semibold text-rose-700">치명</div>
                    <div className="mt-1 text-xl font-black text-rose-700">
                      {formatNumber(distribution?.critical_count)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5">
                    <div className="text-[11px] font-semibold text-orange-700">높음</div>
                    <div className="mt-1 text-xl font-black text-orange-700">
                      {formatNumber(distribution?.high_count)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <div className="text-[11px] font-semibold text-amber-700">주의</div>
                    <div className="mt-1 text-xl font-black text-amber-700">
                      {formatNumber(distribution?.medium_count)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-sky-200 bg-[#F2FAFF] px-3 py-2.5">
                    <div className="text-[11px] font-semibold text-[#0A6FD6]">관찰</div>
                    <div className="mt-1 text-xl font-black text-[#0A6FD6]">
                      {formatNumber(distribution?.low_count)}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="데이터 상태" subtitle="헤더 시그니처 블루와 맞춘 정보 카드입니다.">
                <div className="rounded-xl border border-sky-200 bg-[#F2FAFF] px-3 py-3">
                  <div className="text-xs font-semibold text-[#0A6FD6]">조인 누락</div>
                  <div className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
                    {formatNumber(gapRows.length)}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    외부 폐업압력 연결 누락 행 수
                  </div>
                </div>
              </SectionCard>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}