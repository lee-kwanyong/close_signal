import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type IntegratedRow = {
  snapshot_date: string | null;
  region_code: string;
  region_name: string | null;
  category_id: number;
  category_name: string | null;
  smallbiz_risk_score: number | null;
  kosis_pressure_score: number | null;
  kosis_pressure_grade: string | null;
  nts_business_score: number | null;
  integrated_market_score: number | null;
  integrated_final_score: number | null;
  summary_text: string | null;
  reason_codes: string[] | null;
};

type SignalRow = {
  id?: number | string;
  signal_date?: string | null;
  score_date?: string | null;
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

function num(value: number | null | undefined, fallback = 0) {
  return value === null || value === undefined || Number.isNaN(value)
    ? fallback
    : Number(value);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatScore(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "-";
  return Number(value).toFixed(digits);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}.${mm}.${dd}.`;
}

function scoreTone(score: number | null | undefined) {
  const n = num(score, 0);

  if (score === null || score === undefined) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  if (n >= 80) return "border-red-200 bg-red-50 text-red-700";
  if (n >= 65) return "border-amber-200 bg-amber-50 text-amber-700";
  if (n >= 45) return "border-yellow-200 bg-yellow-50 text-yellow-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function signalTone(level?: string | null) {
  const v = String(level || "").toLowerCase();
  if (v.includes("critical") || v.includes("high")) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (v.includes("medium") || v.includes("moderate")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function humanReason(code: string) {
  switch (code) {
    case "external_closure_pressure_high":
      return "외부폐업압력 높음";
    case "external_closure_pressure_moderate":
      return "외부폐업압력 주의";
    case "live_closure_rate_rising":
      return "폐업가속";
    case "net_business_decline":
      return "순감소";
    case "close_open_ratio_unfavorable":
      return "폐업/개업비 악화";
    case "competition_density_high":
      return "경쟁과밀";
    case "nts_business_weak":
      return "NTS 약화";
    case "nts_business_moderate":
      return "NTS 경계";
    case "market_risk_high":
      return "시장위험 높음";
    default:
      return code;
  }
}

async function getLatestSnapshotDate() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("integrated_region_category_baselines")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.snapshot_date ?? null;
}

async function getIntegratedRows(snapshotDate: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("integrated_region_category_baselines")
    .select("*")
    .eq("snapshot_date", snapshotDate)
    .order("integrated_final_score", { ascending: false })
    .limit(200);

  return (data ?? []) as IntegratedRow[];
}

async function getSignals() {
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_risk_signals_feed", {
    p_region_code: null,
    p_category_id: null,
    p_limit: 6,
    p_offset: 0,
  });

  return (data ?? []) as SignalRow[];
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
  children: React.ReactNode;
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

export default async function HomePage() {
  const latestSnapshotDate = await getLatestSnapshotDate();
  const [rows, signals] = await Promise.all([
    latestSnapshotDate ? getIntegratedRows(latestSnapshotDate) : Promise.resolve([] as IntegratedRow[]),
    getSignals(),
  ]);

  const topRows = rows.slice(0, 8);

  const avgIntegrated =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + num(row.integrated_final_score, 0), 0) / rows.length
      : null;

  const avgMarket =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + num(row.integrated_market_score, 0), 0) / rows.length
      : null;

  const externalCriticalCount = rows.filter(
    (row) => String(row.kosis_pressure_grade || "").toLowerCase() === "critical",
  ).length;

  const ntsWarningCount = rows.filter((row) => num(row.nts_business_score, 0) >= 50).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-2 text-sm font-medium text-sky-700">INTEGRATED DASHBOARD</div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                통합 위험관리 대시보드
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                KOSIS 외부 폐업압력, 소상공인 흐름, 국세청/NTS 사업장 체력을 통합해
                현재 위험과 회복 방향을 데이터 중심으로 봅니다.
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
                시그널 보기
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
            label="기준일"
            value={latestSnapshotDate ? formatDate(latestSnapshotDate) : "-"}
          />
          <StatCard
            label="통합 평균위험"
            value={formatScore(avgIntegrated, 1)}
          />
          <StatCard
            label="시장 평균위험"
            value={formatScore(avgMarket, 1)}
          />
          <StatCard
            label="경고 현황"
            value={`외부 ${formatNumber(externalCriticalCount)}`}
            sub={`NTS 경고 ${formatNumber(ntsWarningCount)}`}
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel
            title="상위 통합 위험 랭킹"
            description="지금 가장 먼저 관리해야 할 지역·업종입니다."
            actionHref="/rankings"
            actionLabel="전체 보기"
          >
            {topRows.length === 0 ? (
              <EmptyState text="표시할 통합 랭킹이 없습니다." />
            ) : (
              <div className="grid gap-3">
                {topRows.map((row, index) => (
                  <Link
                    key={`${row.region_code}-${row.category_id}-${row.snapshot_date}`}
                    href={`/regions/${row.region_code}/${row.category_id}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-200 hover:bg-sky-50/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-sky-600 px-2 text-xs font-bold text-white">
                            {index + 1}
                          </span>
                          <strong className="text-base font-semibold text-slate-950">
                            {row.region_name ?? row.region_code} · {row.category_name ?? row.category_id}
                          </strong>
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${scoreTone(
                              row.integrated_final_score,
                            )}`}
                          >
                            통합 {formatScore(row.integrated_final_score, 0)}
                          </span>
                        </div>

                        <div className="text-sm leading-6 text-slate-600">
                          {row.summary_text || "-"}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {(row.reason_codes ?? []).slice(0, 3).map((code) => (
                            <span
                              key={`${row.region_code}-${row.category_id}-${code}`}
                              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                            >
                              {humanReason(code)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid min-w-[220px] grid-cols-2 gap-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            시장위험
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {formatScore(row.integrated_market_score, 0)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            NTS
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {formatScore(row.nts_business_score, 0)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            외부폐업
                          </div>
                          <div className="mt-1 text-lg font-semibold text-slate-950">
                            {formatScore(row.kosis_pressure_score, 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="최신 위험 신호"
            description="최근 감지된 시그널입니다."
            actionHref="/signals"
            actionLabel="전체 보기"
          >
            {signals.length === 0 ? (
              <EmptyState text="표시할 위험 신호가 없습니다." />
            ) : (
              <div className="grid gap-3">
                {signals.map((signal) => (
                  <Link
                    key={String(signal.id ?? `${signal.signal_date}-${signal.category_id}`)}
                    href={`/regions/${signal.region_code}/${signal.category_id}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-200 hover:bg-sky-50/40"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${signalTone(
                          signal.signal_level,
                        )}`}
                      >
                        {signal.signal_level || "signal"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDate(signal.signal_date || signal.score_date)}
                      </span>
                    </div>

                    <div className="text-base font-semibold text-slate-950">
                      {signal.title || "시그널"}
                    </div>

                    {signal.message ? (
                      <div className="mt-2 text-sm leading-6 text-slate-600">
                        {signal.message}
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </section>
      </div>
    </main>
  );
}