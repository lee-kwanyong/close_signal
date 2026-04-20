import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mutateWatchlistAction } from "@/app/watchlist/actions";
import { buildMonitorPrefillHref } from "@/lib/monitors/prefill-link";

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

type IntegratedCurrentRow = {
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

type IntegratedHistoryRow = {
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

function nullableText(value: unknown) {
  const normalized = text(value);
  return normalized || null;
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

function formatSigned(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "-";
  const n = Number(value);
  if (n > 0) return `+${n.toFixed(digits)}`;
  if (n < 0) return n.toFixed(digits);
  return `0.${"0".repeat(digits)}`;
}

function formatDate(value: string | null | undefined) {
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

function scoreTone(score: number | null | undefined) {
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

function riskTone(grade: string | null | undefined) {
  const value = String(grade || "").toLowerCase();

  if (value === "critical") return "border-red-200 bg-red-50 text-red-700";
  if (value === "high") return "border-orange-200 bg-orange-50 text-orange-700";
  if (value === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function pressureLabel(grade: string | null | undefined) {
  const value = String(grade || "").toLowerCase();

  if (value === "critical") return "치명";
  if (value === "high") return "높음";
  if (value === "moderate") return "주의";
  if (value === "observe") return "관찰";
  return "미연결";
}

function riskGradeLabel(grade: string | null | undefined) {
  const value = String(grade || "").toLowerCase();

  if (value === "critical") return "치명";
  if (value === "high") return "높음";
  if (value === "medium") return "주의";
  if (value === "low") return "낮음";
  return "미정";
}

function integratedLabel(score: number | null | undefined) {
  const n = num(score, 0);

  if (score == null) return "미정";
  if (n >= 80) return "치명";
  if (n >= 65) return "높음";
  if (n >= 45) return "주의";
  return "관찰";
}

function signalTone(level?: string | null) {
  const value = String(level || "").toLowerCase();

  if (value.includes("critical") || value.includes("high")) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (value.includes("medium") || value.includes("moderate")) {
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

function deriveInterpretation(current: IntegratedCurrentRow, history: IntegratedHistoryRow | null) {
  const parts: string[] = [];

  parts.push(
    `현재 통합위험은 ${integratedLabel(current.integrated_signal_score)} 단계(${formatScore(
      current.integrated_signal_score,
      1,
    )})입니다.`,
  );

  const pressure = String(current.pressure_grade || "").toLowerCase();
  if (pressure === "critical") {
    parts.push("외부 폐업압력이 치명 단계라 시장 자체 방어가 우선입니다.");
  } else if (pressure === "high") {
    parts.push("외부 폐업압력이 높은 편이라 외부 여건 악화를 같이 봐야 합니다.");
  } else if (pressure === "observe") {
    parts.push("외부 폐업압력은 관찰 단계지만 내부 점수와 함께 해석해야 합니다.");
  }

  if (num(current.adjusted_score, 0) >= 30) {
    parts.push("내부 위험점수도 높아 현장 운영 보정이 필요합니다.");
  }

  if (num(current.net_change, 0) > 0) {
    parts.push(`순증감은 +${formatNumber(current.net_change)}로 증가 흐름입니다.`);
  } else if (num(current.net_change, 0) < 0) {
    parts.push(`순증감은 ${formatNumber(current.net_change)}로 감소 흐름입니다.`);
  }

  if (history?.summary_text?.trim()) {
    parts.push(history.summary_text.trim());
  }

  return parts.join(" ");
}

function deriveRecoveryDirection(history: IntegratedHistoryRow | null) {
  if (history?.recovery_direction?.trim()) {
    return history.recovery_direction;
  }

  const reasons = history?.reason_codes ?? [];
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
    return "현재 점수 추이를 관찰하면서 외부압력 조인 상태를 함께 확인합니다.";
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

async function getCurrentIntegratedDetail(regionCode: string, categoryId: number) {
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from("v_integrated_risk_top_current")
      .select("*")
      .in("region_code", candidateRegionCodes(regionCode))
      .eq("category_id", categoryId)
      .order("integrated_signal_score", { ascending: false })
      .limit(1)
      .maybeSingle();

    return (data ?? null) as IntegratedCurrentRow | null;
  } catch {
    return null;
  }
}

async function getIntegratedHistory(regionCode: string, categoryId: number) {
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from("integrated_region_category_baselines")
      .select("*")
      .in("region_code", candidateRegionCodes(regionCode))
      .eq("category_id", categoryId)
      .order("snapshot_date", { ascending: false })
      .limit(24);

    return (data ?? []) as IntegratedHistoryRow[];
  } catch {
    return [] as IntegratedHistoryRow[];
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

async function getGapStatus(regionCode: string, categoryId: number) {
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from("v_integrated_risk_join_gaps_current")
      .select("*")
      .in("region_code", candidateRegionCodes(regionCode))
      .eq("category_id", categoryId)
      .limit(1)
      .maybeSingle();

    return (data ?? null) as IntegratedGapRow | null;
  } catch {
    return null;
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

function loginAwareHref(href: string, isLoggedIn: boolean) {
  return isLoggedIn ? href : `/auth/login?next=${encodeURIComponent(href)}`;
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

  const [current, history, signals, gapRow, watchStatus] = await Promise.all([
    getCurrentIntegratedDetail(regionCode, categoryId),
    getIntegratedHistory(regionCode, categoryId),
    getSignals(regionCode, categoryId),
    getGapStatus(regionCode, categoryId),
    getWatchStatus(userId, regionCode, categoryId),
  ]);

  if (!current) {
    notFound();
  }

  const latestHistory = history[0] ?? null;
  const normalizedRegionCode = normalizeRegionCode(current.region_code || regionCode);
  const currentPath = `/regions/${normalizedRegionCode}/${categoryId}`;

  const monitorHref = loginAwareHref(
    buildMonitorPrefillHref({
      from: "integrated_detail",
      businessName: `${current.region_name ?? normalizedRegionCode} ${current.category_name ?? current.category_id}`,
      regionCode: normalizedRegionCode || undefined,
      regionName: current.region_name ?? undefined,
      categoryId: current.category_id ?? undefined,
      categoryName: current.category_name ?? undefined,
      query: `${current.region_name ?? ""} ${current.category_name ?? ""}`.trim(),
      trendKeywords: [
        current.region_name,
        current.category_name,
        current.pressure_grade,
        current.risk_grade,
      ].filter(Boolean) as string[],
      stage:
        num(current.integrated_signal_score, 0) >= 45
          ? "urgent"
          : num(current.integrated_signal_score, 0) >= 30
            ? "caution"
            : "observe",
      reason: `${pressureLabel(current.pressure_grade)} / ${riskGradeLabel(current.risk_grade)}`,
      score: current.integrated_signal_score ?? undefined,
      note: [
        `기준월: ${current.score_month ?? "-"}`,
        `통합위험: ${formatScore(current.integrated_signal_score, 1)}`,
        `내부위험: ${formatScore(current.adjusted_score, 1)}`,
        `외부압력: ${pressureLabel(current.pressure_grade)}`,
        `전국비중: ${formatPercent(current.national_share_pct, 4)}`,
        `전년폐업증감: ${formatPercent(current.yoy_closed_delta_pct, 4)}`,
        `순증감: ${formatNumber(current.net_change)}`,
      ].join(" / "),
    }),
    Boolean(userId),
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <MessageBanner
          success={resolvedSearchParams.success}
          error={resolvedSearchParams.error}
        />

        {gapRow ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-semibold text-amber-800">
                  외부 폐업압력 조인이 아직 연결되지 않았습니다.
                </div>
                <div className="mt-1 text-sm text-amber-700">
                  현재 이 항목은 내부 위험점수 중심으로 계산되고 있습니다.
                </div>
              </div>

              <span className="inline-flex h-9 items-center rounded-full border border-amber-300 bg-white px-3 text-sm font-medium text-amber-800">
                외부 미연결
              </span>
            </div>
          </section>
        ) : null}

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
                {current.region_name ?? normalizedRegionCode} · {current.category_name ?? current.category_id}
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                현재 통합 위험시그널, 이력, 관련 시그널을 한 화면에서 확인합니다.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${scoreTone(
                    current.integrated_signal_score,
                  )}`}
                >
                  {integratedLabel(current.integrated_signal_score)} · 통합 {formatScore(current.integrated_signal_score, 1)}
                </span>

                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${riskTone(
                    current.risk_grade,
                  )}`}
                >
                  {riskGradeLabel(current.risk_grade)} · 내부 {formatScore(current.adjusted_score, 1)}
                </span>

                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${pressureTone(
                    current.pressure_grade,
                  )}`}
                >
                  {pressureLabel(current.pressure_grade)}
                </span>

                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
                  기준월 {formatDate(current.score_month)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {userId ? (
                <form action={mutateWatchlistAction}>
                  <input type="hidden" name="user_id" value={String(userId)} />
                  <input type="hidden" name="region_code" value={normalizedRegionCode} />
                  <input type="hidden" name="category_id" value={String(categoryId)} />
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
                href={monitorHref}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
              >
                모니터 인테이크
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="통합 위험"
            value={formatScore(current.integrated_signal_score, 1)}
            sub={integratedLabel(current.integrated_signal_score)}
          />
          <StatCard
            label="내부 위험"
            value={formatScore(current.adjusted_score, 1)}
            sub={riskGradeLabel(current.risk_grade)}
          />
          <StatCard
            label="외부 폐업압력"
            value={pressureLabel(current.pressure_grade)}
            sub={`전국비중 ${formatPercent(current.national_share_pct, 4)}`}
          />
          <StatCard
            label="전년 폐업증감"
            value={formatPercent(current.yoy_closed_delta_pct, 4)}
            sub={`순증감 ${formatNumber(current.net_change)}`}
          />
        </section>

        <section
          id="db-insight"
          className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <SectionTitle
            title="현재 해석"
            description="현재 통합 위험시그널과 이력 기반 요약입니다."
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                통합 해석
              </div>
              <div className="mt-3 text-sm leading-7 text-slate-700">
                {deriveInterpretation(current, latestHistory)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                회복 방향
              </div>
              <div className="mt-3 text-sm leading-7 text-slate-700">
                {deriveRecoveryDirection(latestHistory)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr_1.2fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                기준월
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {formatDate(current.score_month)}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                현재 뷰 기준 최신 통합 위험시그널입니다.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                핵심 사유
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(latestHistory?.reason_codes ?? []).length === 0 ? (
                  <span className="text-sm text-slate-400">-</span>
                ) : (
                  (latestHistory?.reason_codes ?? []).map((code) => (
                    <span
                      key={`${normalizedRegionCode}-${categoryId}-${code}`}
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
                {latestHistory?.summary_text || "현재는 통합 위험시그널 기준 정보만 연결되어 있습니다."}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="시계열 변화"
              description="동일 지역·업종의 최근 통합 위험 추이입니다."
            />

            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                표시할 시계열 이력이 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1120px] text-left">
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
                    {history.map((row, index) => (
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
                            {(row.kosis_pressure_label || pressureLabel(row.kosis_pressure_grade))} ·{" "}
                            {formatScore(row.kosis_pressure_score, 0)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${riskTone(
                              row.nts_label,
                            )}`}
                          >
                            {(row.nts_label || "없음")} · {formatScore(row.nts_business_score, 0)}
                          </span>
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-4 text-sm font-semibold ${
                            num(row.smallbiz_net_change_7d, 0) < 0 ? "text-red-600" : "text-slate-500"
                          }`}
                        >
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
            )}
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle
              title="현재 구성"
              description="어떤 축이 위험을 끌어올리는지 바로 봅니다."
            />

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">외부 폐업압력</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${pressureTone(
                      current.pressure_grade,
                    )}`}
                  >
                    {pressureLabel(current.pressure_grade)}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-slate-500">
                  <div>전국비중 {formatPercent(current.national_share_pct, 4)}</div>
                  <div>전년 폐업증감 {formatPercent(current.yoy_closed_delta_pct, 4)}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">내부 위험</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${riskTone(
                      current.risk_grade,
                    )}`}
                  >
                    {riskGradeLabel(current.risk_grade)}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-slate-500">
                  <div>내부위험 {formatScore(current.adjusted_score, 1)}</div>
                  <div>순증감 {formatNumber(current.net_change)}</div>
                  <div>폐업률 {formatPercent(current.close_rate_pct, 2)}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">운영 흐름</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${scoreTone(
                      current.integrated_signal_score,
                    )}`}
                  >
                    {integratedLabel(current.integrated_signal_score)}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-slate-500">
                  <div>통합위험 {formatScore(current.integrated_signal_score, 1)}</div>
                  <div>운영증감 {formatPercent(current.operating_yoy_change_pct, 2)}</div>
                  <div>기준월 {formatDate(current.score_month)}</div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="관련 시그널"
            description="이 지역·업종에 연결된 최근 시그널입니다."
            action={
              <Link
                href={`/signals?regionCode=${encodeURIComponent(normalizedRegionCode)}`}
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

                      {signal.risk_score != null ? (
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