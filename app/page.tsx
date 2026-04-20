import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type DashboardSummary = {
  latest_score_date: string | null;
  region_count: number | null;
  category_count: number | null;
  ranking_count: number | null;
  signal_count: number | null;
  avg_base_score: number | null;
  avg_adjusted_score: number | null;
};

type TopRankingRow = {
  region_code: string;
  category_id: number;
  category_name: string | null;
  score_date: string | null;
  base_score: number | null;
  adjusted_score: number | null;
  risk_grade: string | null;
  signal_count: number | null;
  open_prev_30d: number | null;
  close_prev_30d: number | null;
  net_prev_30d: number | null;
  churn_prev_30d: number | null;
  survival_prev_12m: number | null;
  national_survival_avg_12m: number | null;
  national_churn_avg_30d: number | null;
};

type SignalRow = {
  id: number;
  signal_date: string | null;
  region_code: string | null;
  category_id: number | null;
  category_name: string | null;
  signal_type: string | null;
  signal_strength: number | null;
  title: string | null;
  description: string | null;
  evidence: unknown;
  created_at: string | null;
};

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("ko-KR").format(Number(value));
}

function formatScore(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(digits);
}

function riskTone(grade?: string | null) {
  const value = String(grade || "").toLowerCase();

  if (value === "critical") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (value === "high") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (value === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function signalTone(strength?: number | null) {
  const value = Number(strength || 0);

  if (value >= 80) return "border-red-200 bg-red-50 text-red-700";
  if (value >= 60) return "border-orange-200 bg-orange-50 text-orange-700";
  if (value >= 40) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function gradeLabel(value?: string | null) {
  const v = String(value || "").toLowerCase();
  if (v === "critical") return "치명";
  if (v === "high") return "높음";
  if (v === "medium") return "주의";
  if (v === "low") return "안정";
  return value || "-";
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
      {sub ? <div className="mt-2 text-sm leading-6 text-slate-500">{sub}</div> : null}
    </div>
  );
}

function SectionTitle({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description?: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>

      {href && cta ? (
        <Link
          href={href}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
        >
          {cta}
        </Link>
      ) : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
      {text}
    </div>
  );
}

export default async function HomePage() {
  const supabase = await createClient();

  const [summaryRes, topRankingsRes, signalsRes] = await Promise.all([
    supabase.rpc("get_dashboard_summary"),
    supabase.rpc("get_top_risk_rankings", { p_limit: 8 }),
    supabase.rpc("get_risk_signals_feed", {
      p_region_code: null,
      p_category_id: null,
      p_limit: 6,
      p_offset: 0,
    }),
  ]);

  const summary = ((summaryRes.data || [])[0] || null) as DashboardSummary | null;
  const topRankings = (topRankingsRes.data || []) as TopRankingRow[];
  const signals = (signalsRes.data || []) as SignalRow[];

  return (
    <main className="page-shell py-8">
      <section className="overflow-hidden rounded-[32px] border border-sky-100 bg-white shadow-[0_24px_80px_rgba(56,189,248,0.08)]">
        <div className="grid gap-8 px-6 py-7 sm:px-8 sm:py-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-10">
          <div>
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
              Franchise HQ Intelligence
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-[44px] lg:leading-[1.08]">
              프렌차이즈 본사를 위한
              <br />
              출점·운영·부진점포 데이터 허브
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              어디에 가맹점을 내면 좋은지, 어떤 점포가 왜 힘든지, 어느 지역에 인구와
              1인가구가 몰리는지를 한 화면에서 보고 바로 의사결정할 수 있게 만듭니다.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/hq"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-sky-500 px-5 text-sm font-semibold text-white transition hover:bg-sky-600"
              >
                본사운영 대시보드
              </Link>
              <Link
                href="/hq/sites"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                출점 후보 검토
              </Link>
              <Link
                href="/hq/stores"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                위험 점포 관리
              </Link>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: "출점 인텔리전스",
                  desc: "상권 성장·경쟁·인구 구조로 신규 입지 추천",
                },
                {
                  title: "부진 점포 진단",
                  desc: "왜 힘든지 이유와 액션 우선순위 제공",
                },
                {
                  title: "지역 인구 변화",
                  desc: "인구 집중·1인가구 증가·유입 흐름 감지",
                },
                {
                  title: "API 판매 구조",
                  desc: "본사 내부 시스템과 바로 연결 가능한 데이터 레이어",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-sky-100 bg-sky-50/60 p-4"
                >
                  <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 self-start">
            <div className="rounded-[28px] border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                HQ QUICK START
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                오늘 바로 보는 핵심 화면
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  {
                    href: "/hq",
                    title: "본사운영",
                    desc: "위험 점포·출점 후보·성장 지역을 한 번에",
                  },
                  {
                    href: "/hq/regions",
                    title: "지역 레이더",
                    desc: "인구 증가·감소 지역과 상권 열기 확인",
                  },
                  {
                    href: "/hq/actions",
                    title: "회생 액션 보드",
                    desc: "점포별 실행 과제와 진행 상태 관리",
                  },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-2xl border border-white bg-white/80 px-4 py-4 transition hover:border-sky-200 hover:bg-sky-50"
                  >
                    <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-500">{item.desc}</div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                DATA SNAPSHOT
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    최신 기준일
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">
                    {summary?.latest_score_date || "-"}
                  </div>
                </div>

                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-sky-700">
                    위험 랭킹
                  </div>
                  <div className="mt-1 text-lg font-semibold text-sky-700">
                    {formatNumber(summary?.ranking_count)}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    지역 수
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">
                    {formatNumber(summary?.region_count)}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    시그널 수
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">
                    {formatNumber(summary?.signal_count)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="최신 점수 기준일" value={summary?.latest_score_date || "-"} />
        <KpiCard label="지역 수" value={formatNumber(summary?.region_count)} />
        <KpiCard label="카테고리 수" value={formatNumber(summary?.category_count)} />
        <KpiCard label="랭킹 건수" value={formatNumber(summary?.ranking_count)} />
        <KpiCard label="신호 건수" value={formatNumber(summary?.signal_count)} />
        <KpiCard
          label="평균 Adjusted Score"
          value={formatScore(summary?.avg_adjusted_score)}
          sub={`Base ${formatScore(summary?.avg_base_score)}`}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="상위 위험 랭킹"
            description="기존 리스크 랭킹도 남겨두되, 이제는 본사 의사결정 데이터의 하위 모듈로 보이게 정리합니다."
            href="/rankings"
            cta="전체 보기"
          />

          {topRankings.length === 0 ? (
            <EmptyState text="표시할 랭킹 데이터가 없습니다." />
          ) : (
            <div className="grid gap-4">
              {topRankings.map((row, index) => (
                <Link
                  key={`${row.region_code}-${row.category_id}`}
                  href={`/regions/${row.region_code}/${row.category_id}`}
                  className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 transition hover:border-sky-200 hover:bg-sky-50/70"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-700 shadow-sm">
                          {index + 1}
                        </span>
                        <strong className="text-base font-semibold text-slate-950 sm:text-lg">
                          {row.region_code} · {row.category_name || `카테고리 ${row.category_id}`}
                        </strong>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${riskTone(
                            row.risk_grade,
                          )}`}
                        >
                          {gradeLabel(row.risk_grade)}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-slate-500">
                        기준일 {row.score_date || "-"} · 시그널 {formatNumber(row.signal_count)}건
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:min-w-[260px]">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          Adjusted
                        </div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">
                          {formatScore(row.adjusted_score)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          Base
                        </div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">
                          {formatScore(row.base_score)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          폐업(30d)
                        </div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">
                          {formatNumber(row.close_prev_30d)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          Churn(30d)
                        </div>
                        <div className="mt-1 text-lg font-semibold text-slate-950">
                          {formatScore(row.churn_prev_30d)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="최신 상권 변화 신호"
            description="기존 signals도 HQ 언어로 연결해 계속 활용합니다."
            href="/signals"
            cta="전체 보기"
          />

          {signals.length === 0 ? (
            <EmptyState text="표시할 시그널이 없습니다." />
          ) : (
            <div className="grid gap-4">
              {signals.map((signal) => (
                <Link
                  key={signal.id}
                  href={`/regions/${signal.region_code}/${signal.category_id}`}
                  className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 transition hover:border-sky-200 hover:bg-sky-50/70"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${signalTone(
                        signal.signal_strength,
                      )}`}
                    >
                      강도 {signal.signal_strength ?? 0}
                    </span>
                    <span className="text-xs text-slate-500">{signal.signal_date || "-"}</span>
                  </div>

                  <div className="mt-3 text-base font-semibold leading-7 text-slate-950">
                    {signal.title || "제목 없음"}
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    {signal.region_code || "-"} ·{" "}
                    {signal.category_name || `카테고리 ${signal.category_id || "-"}`} ·{" "}
                    {signal.signal_type || "-"}
                  </div>

                  <div className="mt-3 text-sm leading-6 text-slate-600">
                    {signal.description || "설명 없음"}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <SectionTitle
          title="빠른 이동"
          description="본사 상품 구조로 바로 진입할 수 있게 홈에서 길을 열어둡니다."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              href: "/hq",
              title: "본사운영 대시보드",
              desc: "브랜드 전체 포트폴리오와 핵심 요약",
            },
            {
              href: "/hq/sites",
              title: "출점 후보 검토",
              desc: "어디에 차리면 좋을지, 경쟁은 어떤지",
            },
            {
              href: "/hq/regions",
              title: "지역 성장 레이더",
              desc: "인구·유동·상권열기 기반 성장/감소 지역",
            },
            {
              href: "/hq/actions",
              title: "회생 액션 보드",
              desc: "왜 힘든지와 무엇을 해야 하는지",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 transition hover:border-sky-200 hover:bg-sky-50"
            >
              <div className="text-lg font-semibold tracking-tight text-slate-950">
                {item.title}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-500">{item.desc}</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}