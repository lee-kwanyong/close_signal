import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mutateWatchlistAction } from "@/app/watchlist/actions";

type PageProps = {
  params: Promise<{
    regionCode: string;
    categoryId: string;
  }>;
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

type IntegratedDetailRow = {
  snapshot_date: string | null;
  region_code: string;
  region_name: string | null;
  category_id: number;
  category_name: string | null;
  smallbiz_risk_score: number | null;
  smallbiz_close_rate_7d: number | null;
  smallbiz_close_rate_30d: number | null;
  smallbiz_open_rate_7d: number | null;
  smallbiz_open_rate_30d: number | null;
  smallbiz_net_change_7d: number | null;
  smallbiz_net_change_30d: number | null;
  smallbiz_risk_delta_7d: number | null;
  smallbiz_risk_delta_30d: number | null;
  kosis_pressure_score: number | null;
  kosis_pressure_grade: string | null;
  kosis_pressure_label: string | null;
  kosis_closed_total: number | null;
  kosis_national_share_pct: number | null;
  kosis_yoy_closed_delta_pct: number | null;
  nts_business_score: number | null;
  nts_label: string | null;
  integrated_market_score: number | null;
  integrated_final_score: number | null;
  integrated_severity: string | null;
  reason_codes: string[] | null;
  summary_text: string | null;
  recovery_direction: string | null;
};

type WatchlistRow = {
  watchlist_id: number;
  region_code: string;
  category_id: number;
};

type SignalRow = {
  id?: number | string;
  signal_date?: string | null;
  score_date?: string | null;
  signal_type?: string | null;
  signal_level?: string | null;
  title?: string | null;
  message?: string | null;
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

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toFixed(digits)}%`;
}

function formatScore(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined) return "-";
  return Number(value).toFixed(digits);
}

function formatSigned(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "-";
  const n = Number(value);
  if (n > 0) return `+${n.toFixed(digits)}`;
  if (n < 0) return n.toFixed(digits);
  return `0.${"0".repeat(digits)}`;
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

function pressureTone(grade: string | null | undefined) {
  const value = String(grade || "").toLowerCase();

  if (value === "critical") return "border-red-200 bg-red-50 text-red-700";
  if (value === "high") return "border-orange-200 bg-orange-50 text-orange-700";
  if (value === "moderate") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function ntsTone(score: number | null | undefined) {
  const n = num(score, 0);

  if (score === null || score === undefined) {
    return "border-slate-200 bg-slate-100 text-slate-500";
  }
  if (n >= 70) return "border-red-200 bg-red-50 text-red-700";
  if (n >= 50) return "border-orange-200 bg-orange-50 text-orange-700";
  if (n >= 35) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function severityLabel(severity: string | null | undefined) {
  const value = String(severity || "").toLowerCase();

  if (value === "critical") return "치명";
  if (value === "high") return "높음";
  if (value === "moderate") return "주의";
  return "관찰";
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

function normalizeRegionCode(code?: string | null) {
  const raw = String(code || "").trim().toUpperCase();
  if (!raw) return "";

  const aliasMap: Record<string, string> = {
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
    "A01": "KR-11",
    "A02": "KR-26",
    "A03": "KR-41",
    "A04": "KR-27",
    "A05": "KR-28",
    "A06": "KR-29",
    "A07": "KR-30",
    "A08": "KR-31",
    "A09": "KR-36",
    "A10": "KR-42",
    "A11": "KR-43",
    "A12": "KR-44",
    "A13": "KR-45",
    "A14": "KR-46",
    "A15": "KR-47",
    "A16": "KR-48",
    "A17": "KR-50",
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

function deriveRiskInterpretation(row: IntegratedDetailRow) {
  const severity = severityLabel(row.integrated_severity);
  const parts: string[] = [];

  parts.push(`현재 통합위험은 ${severity} 단계(${formatScore(row.integrated_final_score, 0)})입니다.`);

  if (num(row.kosis_pressure_score, 0) >= 60) {
    parts.push("외부 폐업압력이 매우 높아 시장 자체가 나쁜 구간입니다.");
  } else if (num(row.kosis_pressure_score, 0) >= 40) {
    parts.push("외부 폐업압력이 주의 단계라 시장 방어가 필요합니다.");
  }

  if (num(row.nts_business_score, 0) >= 50) {
    parts.push("NTS 체력도 약해져 내부 체력 관리가 같이 필요합니다.");
  }

  if (num(row.smallbiz_net_change_7d, 0) < 0) {
    parts.push("최근 7일 순증감이 마이너스라 단기 흐름도 좋지 않습니다.");
  }

  return parts.join(" ");
}

function deriveRecoveryDirection(row: IntegratedDetailRow) {
  if (row.recovery_direction?.trim()) {
    return row.recovery_direction;
  }

  const reasons = row.reason_codes ?? [];
  const actions: string[] = [];

  if (reasons.includes("nts_business_weak") || reasons.includes("nts_business_moderate")) {
    actions.push("고정비·세무 체력 점검");
  }
  if (reasons.includes("external_closure_pressure_high")) {
    actions.push("확장보다 손실 통제");
  }
  if (reasons.includes("live_closure_rate_rising")) {
    actions.push("폐업가속 원인 차단");
  }
  if (reasons.includes("net_business_decline")) {
    actions.push("저효율 영역 정리");
  }
  if (reasons.includes("competition_density_high")) {
    actions.push("차별 포지션 재정의");
  }
  if (reasons.includes("close_open_ratio_unfavorable")) {
    actions.push("신규 유입 전환 개선");
  }

  if (actions.length === 0) {
    return "기본 운영지표 유지 관찰";
  }

  return actions.slice(0, 3).join(" / ");
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
    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
      {sub ? <div className="mt-2 text-sm leading-6 text-slate-500">{sub}</div> : null}
    </div>
  );
}

function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
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

async function getIntegratedDetail(regionCode: string, categoryId: number) {
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from("integrated_region_category_baselines")
      .select("*")
      .in("region_code", candidateRegionCodes(regionCode))
      .eq("category_id", categoryId)
      .order("snapshot_date", { ascending: false })
      .limit(30);

    return (data ?? []) as IntegratedDetailRow[];
  } catch {
    return [] as IntegratedDetailRow[];
  }
}

async function getSignals(regionCode: string, categoryId: number) {
  try {
    const supabase = await createClient();

    const { data } = await supabase.rpc("get_risk_signals_feed", {
      p_region_code: normalizeRegionCode(regionCode),
      p_category_id: categoryId,
      p_limit: 10,
    });

    return (data ?? []) as SignalRow[];
  } catch {
    return [] as SignalRow[];
  }
}

async function getWatchStatus(userId: number | null, regionCode: string, categoryId: number) {
  if (!userId) {
    return {
      isWatching: false,
      watchlistId: null as number | null,
    };
  }

  try {
    const supabase = await createClient();

    const { data } = await supabase.rpc("get_my_watchlists", {
      p_user_id: userId,
    });

    const codes = candidateRegionCodes(regionCode);
    const rows = (data ?? []) as WatchlistRow[];
    const found = rows.find(
      (row) => codes.includes(row.region_code) && Number(row.category_id) === categoryId,
    );

    return {
      isWatching: !!found,
      watchlistId: found?.watchlist_id ?? null,
    };
  } catch {
    return {
      isWatching: false,
      watchlistId: null as number | null,
    };
  }
}

export default async function RegionCategoryDetailPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) || {};

  const regionCode = String(resolvedParams.regionCode || "").trim();
  const categoryId = Number(String(resolvedParams.categoryId || "").trim());

  if (!regionCode || !Number.isFinite(categoryId)) {
    notFound();
  }

  const userId = await getInternalUserId();

  const [rows, signals, watchStatus] = await Promise.all([
    getIntegratedDetail(regionCode, categoryId),
    getSignals(regionCode, categoryId),
    getWatchStatus(userId, regionCode, categoryId),
  ]);

  if (rows.length === 0) {
    notFound();
  }

  const latest = rows[0];
  const currentPath = `/regions/${regionCode}/${categoryId}`;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <MessageBanner
          success={resolvedSearchParams.success}
          error={resolvedSearchParams.error}
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <Link href="/rankings" className="text-sky-700 transition hover:text-sky-800">
                  랭킹
                </Link>
                <span className="text-slate-300">/</span>
                <Link href="/signals" className="text-sky-700 transition hover:text-sky-800">
                  시그널
                </Link>
              </div>

              <div className="mb-2 text-sm font-medium text-sky-700">INTEGRATED DETAIL</div>

              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {latest.region_name ?? latest.region_code} · {latest.category_name ?? latest.category_id}
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                핵심 사유, DB 요약, 기준일은 이 상세 페이지에서 확인합니다.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${scoreTone(
                    latest.integrated_final_score,
                  )}`}
                >
                  통합위험 {formatScore(latest.integrated_final_score, 0)}
                </span>

                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${scoreTone(
                    latest.integrated_market_score,
                  )}`}
                >
                  시장위험 {formatScore(latest.integrated_market_score, 0)}
                </span>

                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
                  기준일 {formatDate(latest.snapshot_date)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {userId ? (
                <form action={mutateWatchlistAction}>
                  <input type="hidden" name="user_id" value={String(userId)} />
                  <input type="hidden" name="region_code" value={latest.region_code} />
                  <input type="hidden" name="category_id" value={String(latest.category_id)} />
                  <input
                    type="hidden"
                    name="intent"
                    value={watchStatus.isWatching ? "remove" : "add"}
                  />
                  {watchStatus.watchlistId ? (
                    <input
                      type="hidden"
                      name="watchlist_id"
                      value={String(watchStatus.watchlistId)}
                    />
                  ) : null}
                  <input type="hidden" name="next" value={currentPath} />
                  <button
                    type="submit"
                    className={[
                      "inline-flex h-11 min-w-[108px] items-center justify-center rounded-xl px-4 text-sm font-medium transition whitespace-nowrap",
                      watchStatus.isWatching
                        ? "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                        : "bg-sky-600 text-white shadow-sm hover:bg-sky-700",
                    ].join(" ")}
                  >
                    {watchStatus.isWatching ? "관심목록 해제" : "관심목록 추가"}
                  </button>
                </form>
              ) : (
                <Link
                  href={`/auth/login?next=${encodeURIComponent(currentPath)}`}
                  className="inline-flex h-11 min-w-[108px] items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
                >
                  로그인 후 저장
                </Link>
              )}

              <Link
                href="/watchlist"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
              >
                관심목록 보기
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="통합 위험"
            value={formatScore(latest.integrated_final_score, 0)}
            sub={`현재 단계 ${severityLabel(latest.integrated_severity)}`}
          />
          <StatCard
            label="시장 위험"
            value={formatScore(latest.integrated_market_score, 0)}
            sub={`소상공인 ${formatScore(latest.smallbiz_risk_score, 1)} / KOSIS ${formatScore(
              latest.kosis_pressure_score,
              0,
            )}`}
          />
          <StatCard
            label="외부 폐업압력"
            value={formatScore(latest.kosis_pressure_score, 0)}
            sub={`전국비중 ${formatPercent(latest.kosis_national_share_pct, 2)} / 전년대비 ${formatSigned(
              latest.kosis_yoy_closed_delta_pct,
              1,
            )}`}
          />
          <StatCard
            label="NTS 사업장 체력"
            value={formatScore(latest.nts_business_score, 0)}
            sub={latest.nts_label || "없음"}
          />
        </section>

        <section
          id="db-insight"
          className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <SectionTitle
            title="랭킹 기준 정보"
            description="랭킹에서 제거한 기준일, 핵심 사유, DB 요약은 여기서 확인합니다."
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr_1.4fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                기준일
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {formatDate(latest.snapshot_date)}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                현재 상세 화면은 가장 최근 스냅샷 기준으로 표시됩니다.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                핵심 사유
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(latest.reason_codes ?? []).length === 0 ? (
                  <span className="text-sm text-slate-400">-</span>
                ) : (
                  (latest.reason_codes ?? []).map((code) => (
                    <span
                      key={`${latest.region_code}-${latest.category_id}-${code}`}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {humanReason(code)}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                DB 요약
              </div>
              <div className="mt-3 text-sm leading-7 text-slate-700">
                {latest.summary_text || "-"}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="통합 해석"
              description="위험 해석과 회복 방향을 함께 봅니다."
            />

            <div className="grid gap-4">
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  위험 해석
                </div>
                <div className="mt-3 text-sm leading-7 text-slate-700">
                  {deriveRiskInterpretation(latest)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  회복 방향
                </div>
                <div className="mt-3 text-sm leading-7 text-slate-700">
                  {deriveRecoveryDirection(latest)}
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="현재 위험 구성"
              description="어떤 축이 위험을 끌어올리는지 바로 봅니다."
            />

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">외부 폐업압력</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${pressureTone(
                      latest.kosis_pressure_grade,
                    )}`}
                  >
                    {(latest.kosis_pressure_label || severityLabel(latest.kosis_pressure_grade))} ·{" "}
                    {formatScore(latest.kosis_pressure_score, 0)}
                  </span>
                </div>
                <div className="text-sm text-slate-500">
                  폐업자 {formatNumber(latest.kosis_closed_total)}명 · 전국비중{" "}
                  {formatPercent(latest.kosis_national_share_pct, 2)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">소상공인 흐름</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${scoreTone(
                      latest.smallbiz_risk_score,
                    )}`}
                  >
                    {formatScore(latest.smallbiz_risk_score, 1)}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-slate-500">
                  <div>7일 폐업률 {formatPercent(latest.smallbiz_close_rate_7d, 1)}</div>
                  <div>30일 폐업률 {formatPercent(latest.smallbiz_close_rate_30d, 1)}</div>
                  <div className={num(latest.smallbiz_net_change_7d, 0) < 0 ? "text-red-600" : "text-slate-500"}>
                    7일 순증감 {formatSigned(latest.smallbiz_net_change_7d, 0)}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">NTS 사업장 체력</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${ntsTone(
                      latest.nts_business_score,
                    )}`}
                  >
                    {(latest.nts_label || "없음")} · {formatScore(latest.nts_business_score, 0)}
                  </span>
                </div>
                <div className="text-sm text-slate-500">
                  세무·체력 약화가 보이면 회복 속도보다 손실 통제가 우선입니다.
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="시계열 변화"
            description="동일 지역·업종의 최근 통합위험 추이를 봅니다."
          />

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-sm text-slate-500">
                  <th className="whitespace-nowrap px-4 py-3 font-medium">기준일</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">통합위험</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">시장위험</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">외부폐업압력</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">NTS위험</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">7일 순증감</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">DB 요약</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={`${row.snapshot_date ?? "row"}-${index}`}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                      {formatDate(row.snapshot_date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${scoreTone(
                          row.integrated_final_score,
                        )}`}
                      >
                        {formatScore(row.integrated_final_score, 0)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${scoreTone(
                          row.integrated_market_score,
                        )}`}
                      >
                        {formatScore(row.integrated_market_score, 0)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${pressureTone(
                          row.kosis_pressure_grade,
                        )}`}
                      >
                        {(row.kosis_pressure_label || severityLabel(row.kosis_pressure_grade))} ·{" "}
                        {formatScore(row.kosis_pressure_score, 0)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${ntsTone(
                          row.nts_business_score,
                        )}`}
                      >
                        {(row.nts_label || "없음")} · {formatScore(row.nts_business_score, 0)}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-4 py-4 text-sm font-semibold ${num(row.smallbiz_net_change_7d, 0) < 0 ? "text-red-600" : "text-slate-500"}`}>
                      {formatSigned(row.smallbiz_net_change_7d, 0)}
                    </td>
                    <td className="px-4 py-4 text-sm leading-6 text-slate-600">
                      {row.summary_text || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="관련 시그널"
            description="이 지역·업종에 연결된 최근 시그널입니다."
            action={
              <Link
                href={`/signals?regionCode=${encodeURIComponent(regionCode)}&categoryId=${categoryId}`}
                className="text-sm font-medium text-sky-700 transition hover:text-sky-800"
              >
                전체 시그널 보기
              </Link>
            }
          />

          {signals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              표시할 시그널이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {signals.map((signal, index) => {
                const key =
                  signal.id ?? `${signal.signal_date ?? signal.score_date ?? "signal"}-${index}`;

                return (
                  <div
                    key={key}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
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

                        <h3 className="mt-2 text-base font-semibold text-slate-950">
                          {signal.title || "시그널"}
                        </h3>

                        {signal.message ? (
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {signal.message}
                          </p>
                        ) : null}
                      </div>

                      {signal.risk_score !== null && signal.risk_score !== undefined ? (
                        <div
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap ${scoreTone(
                            signal.risk_score,
                          )}`}
                        >
                          위험도 {formatScore(signal.risk_score, 1)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}