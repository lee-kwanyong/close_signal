"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type MonitorListItem = {
  id: number;
  businessName: string;
  address: string | null;
  regionName: string | null;
  categoryName: string | null;
  stage: string | null;
  marketRiskScore: number | null;
  businessRiskScore: number | null;
  recoverabilityScore: number | null;
  closingRiskScore: number | null;
  updatedAt: string | null;
  createdAt: string | null;
};

type BandFilter = "all" | "urgent" | "action" | "watch" | "stable";
type DriverKey = "market" | "business" | "structure" | "unclassified";

type MonitorsPageClientProps = {
  initialMonitors: MonitorListItem[];
  initialQuery?: string;
  initialSelectedBand?: string;
};

type MessageState = {
  type: "success" | "error" | "warning";
  text: string;
} | null;

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatScore(value: number | null): string {
  if (value == null) return "-";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDateLabel(value: string | null): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")}.`;
}

function daysDiffFromNow(value: string | null): number | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function relativeUpdateLabel(value: string | null): string {
  const diff = daysDiffFromNow(value);

  if (diff == null) return "갱신 기록 없음";
  if (diff <= 0) return "오늘 갱신";
  if (diff === 1) return "1일 전 갱신";
  return `${diff}일 전 갱신`;
}

function parseBandFilter(value: string | undefined): BandFilter {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "urgent") return "urgent";
  if (normalized === "action") return "action";
  if (normalized === "watch") return "watch";
  if (normalized === "stable") return "stable";

  if (normalized === "last_chance") return "urgent";
  if (normalized === "caution" || normalized === "observe") return "watch";

  return "all";
}

function stageMeta(stage: string | null) {
  const normalized = String(stage ?? "").trim().toLowerCase();

  if (normalized === "critical" || normalized === "last_chance") {
    return {
      label: "마지막 기회",
      tone: "border-rose-200 bg-rose-50 text-rose-700",
      summary: "즉시 개입과 재평가가 필요한 단계",
    };
  }

  if (normalized === "urgent") {
    return {
      label: "긴급",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      summary: "우선순위 높은 개입이 필요한 단계",
    };
  }

  if (normalized === "caution") {
    return {
      label: "주의",
      tone: "border-orange-200 bg-orange-50 text-orange-700",
      summary: "원인별 처방을 연결해볼 단계",
    };
  }

  if (normalized === "observe") {
    return {
      label: "관찰",
      tone: "border-sky-200 bg-sky-50 text-sky-700",
      summary: "지속 추적이 필요한 단계",
    };
  }

  if (normalized === "stable") {
    return {
      label: "안정",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      summary: "정기 확인 중심의 단계",
    };
  }

  if (normalized === "closed") {
    return {
      label: "폐업",
      tone: "border-slate-300 bg-slate-100 text-slate-700",
      summary: "운영 종료로 기록된 단계",
    };
  }

  return {
    label: stage?.trim() || "미분류",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    summary: "최신 단계 정보 확인 필요",
  };
}

function normalizeBand(
  item: Pick<MonitorListItem, "closingRiskScore" | "stage">,
): Exclude<BandFilter, "all"> {
  const score = item.closingRiskScore;
  const stage = String(item.stage ?? "").trim().toLowerCase();

  if (stage === "critical" || stage === "last_chance") return "urgent";
  if (score != null && score >= 80) return "urgent";

  if (stage === "urgent") return "action";
  if (score != null && score >= 60) return "action";

  if (stage === "caution" || stage === "observe") return "watch";
  if (score != null && score >= 40) return "watch";

  return "stable";
}

function bandOrder(band: Exclude<BandFilter, "all">): number {
  switch (band) {
    case "urgent":
      return 0;
    case "action":
      return 1;
    case "watch":
      return 2;
    case "stable":
      return 3;
  }
}

function bandLabel(band: BandFilter): string {
  switch (band) {
    case "all":
      return "전체";
    case "urgent":
      return "최우선";
    case "action":
      return "집중개입";
    case "watch":
      return "관찰";
    case "stable":
      return "안정";
  }
}

function bandDescription(band: Exclude<BandFilter, "all">): string {
  switch (band) {
    case "urgent":
      return "즉시 개입과 재평가를 우선 처리합니다.";
    case "action":
      return "원인별 액션을 빠르게 연결합니다.";
    case "watch":
      return "추적과 근거 수집을 이어갑니다.";
    case "stable":
      return "정기 확인 중심으로 관리합니다.";
  }
}

function bandTone(band: Exclude<BandFilter, "all">): string {
  switch (band) {
    case "urgent":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "action":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "watch":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "stable":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function scoreTone(value: number | null, positiveHigher = false): string {
  if (value == null) {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (positiveHigher) {
    if (value >= 60) return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (value >= 35) return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (value >= 80) return "border-rose-200 bg-rose-50 text-rose-700";
  if (value >= 60) return "border-amber-200 bg-amber-50 text-amber-700";
  if (value >= 40) return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function dominantDriver(item: MonitorListItem): DriverKey {
  const market = item.marketRiskScore;
  const business = item.businessRiskScore;
  const structure = item.recoverabilityScore == null ? null : 100 - item.recoverabilityScore;

  const candidates: Array<{ key: DriverKey; score: number | null }> = [
    { key: "market", score: market },
    { key: "business", score: business },
    { key: "structure", score: structure },
  ];

  const valid = candidates.filter((candidate) => candidate.score != null) as Array<{
    key: DriverKey;
    score: number;
  }>;

  if (valid.length === 0) return "unclassified";

  valid.sort((a, b) => b.score - a.score);
  return valid[0]?.key ?? "unclassified";
}

function driverMeta(driver: DriverKey) {
  switch (driver) {
    case "market":
      return {
        label: "시장 원인",
        tone: "border-sky-200 bg-sky-50 text-sky-700",
        actionCue: "상권 수요·유입·경쟁 변화를 먼저 점검",
      };
    case "business":
      return {
        label: "사업장 원인",
        tone: "border-violet-200 bg-violet-50 text-violet-700",
        actionCue: "운영 지표·현장 이슈·내부 실행력을 먼저 확인",
      };
    case "structure":
      return {
        label: "구조 이슈",
        tone: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
        actionCue: "현금흐름·회복여력·사업 전환 가능성을 먼저 검토",
      };
    case "unclassified":
    default:
      return {
        label: "원인 미분류",
        tone: "border-slate-200 bg-slate-50 text-slate-700",
        actionCue: "세부 원인을 다시 수집해 액션 엔진에 연결",
      };
  }
}

function includesQuery(item: MonitorListItem, query: string): boolean {
  if (!query.trim()) return true;

  const haystack = [
    item.businessName,
    item.address,
    item.regionName,
    item.categoryName,
    item.stage,
    driverMeta(dominantDriver(item)).label,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}

function buildUrl(query: string, band: BandFilter) {
  const params = new URLSearchParams();

  if (query.trim()) params.set("q", query.trim());
  if (band !== "all") params.set("band", band);

  const qs = params.toString();
  return qs ? `/monitors?${qs}` : "/monitors";
}

function compareMonitors(a: MonitorListItem, b: MonitorListItem): number {
  const bandDiff = bandOrder(normalizeBand(a)) - bandOrder(normalizeBand(b));
  if (bandDiff !== 0) return bandDiff;

  const closingDiff = (b.closingRiskScore ?? -1) - (a.closingRiskScore ?? -1);
  if (closingDiff !== 0) return closingDiff;

  const updatedA = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
  const updatedB = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
  if (updatedA !== updatedB) return updatedB - updatedA;

  return a.businessName.localeCompare(b.businessName, "ko");
}

function buildSummaryText(item: MonitorListItem): string {
  const band = normalizeBand(item);
  const stage = stageMeta(item.stage);
  const driver = driverMeta(dominantDriver(item));

  const closingPart =
    item.closingRiskScore != null
      ? `최종 폐업위험 ${formatScore(item.closingRiskScore)}점`
      : "최종 폐업위험 미산출";
  const recoverabilityPart =
    item.recoverabilityScore != null
      ? `구조가능성 ${formatScore(item.recoverabilityScore)}점`
      : "구조가능성 미산출";

  return `${closingPart} · ${recoverabilityPart} · ${stage.label} 단계 · ${bandLabel(band)} 관리군 · ${driver.actionCue}`;
}

function requestLabelFromPath(path: string): string {
  if (path.includes("/refresh")) return "데이터 갱신";
  if (path.includes("/rebuild-health")) return "상태 재계산";
  return "요청";
}

function successLabelFromPath(path: string): string {
  if (path.includes("/refresh")) return "데이터 갱신을 완료했습니다.";
  if (path.includes("/rebuild-health")) return "상태 재계산을 완료했습니다.";
  return "요청을 완료했습니다.";
}

function normalizeServerMessage(raw: unknown, fallback: string): string {
  const message = typeof raw === "string" ? raw.trim() : "";

  if (!message) return fallback;

  const lower = message.toLowerCase();

  if (lower.includes("snapshot_recommended_actions_playbook_code_fkey")) {
    return "추천 액션 연결값 일부가 맞지 않아 일부 항목 저장을 건너뛰었습니다.";
  }

  if (lower.includes("external_intel_snapshots_grade_check")) {
    return "외부 분석 등급값 일부가 저장 형식과 맞지 않아 일부 항목 저장을 건너뛰었습니다.";
  }

  if (lower.includes("violates foreign key constraint")) {
    return "연결 데이터가 맞지 않아 일부 항목 저장을 건너뛰었습니다.";
  }

  if (lower.includes("violates check constraint")) {
    return "저장 형식이 맞지 않은 값이 있어 일부 항목 저장을 건너뛰었습니다.";
  }

  if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return "서버 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (lower.includes("timeout")) {
    return "처리 시간이 길어졌습니다. 잠시 후 다시 시도해 주세요.";
  }

  return fallback;
}

function getJsonValue(json: unknown, key: string): unknown {
  if (!json || typeof json !== "object") return undefined;
  return (json as Record<string, unknown>)[key];
}

function extractWarnings(json: unknown): string[] {
  const warnings = getJsonValue(json, "warnings");

  if (!Array.isArray(warnings)) return [];

  const normalized = warnings
    .map((warning) =>
      normalizeServerMessage(warning, "일부 데이터는 저장되지 않았지만 기본 처리 결과는 반영되었습니다."),
    )
    .filter((warning) => Boolean(warning));

  return Array.from(new Set(normalized));
}

function buildFailureMessage(path: string, json: unknown): string {
  const label = requestLabelFromPath(path);
  const raw =
    getJsonValue(json, "error") ??
    getJsonValue(json, "message") ??
    getJsonValue(json, "detail") ??
    "";

  return normalizeServerMessage(
    raw,
    `${label} 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.`,
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
          : "border-slate-200 bg-white";

  return (
    <div
      className={`rounded-[28px] border p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] ${toneClass}`}
    >
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <div className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950">{value}</div>
      <p className="mt-2 text-xs leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function InfoTile({
  label,
  value,
  description,
  toneClass = "border-slate-200 bg-slate-50 text-slate-700",
}: {
  label: string;
  value: string;
  description: string;
  toneClass?: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-2 text-sm font-bold tracking-[-0.02em]">{value}</p>
      <p className="mt-2 text-xs leading-5 opacity-90">{description}</p>
    </div>
  );
}

function ScoreTile({
  label,
  value,
  hint,
  positiveHigher = false,
}: {
  label: string;
  value: number | null;
  hint: string;
  positiveHigher?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ${scoreTone(
        value,
        positiveHigher,
      )}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">{label}</p>
      <div className="mt-3 text-3xl font-black tracking-[-0.05em]">{formatScore(value)}</div>
      <p className="mt-2 text-xs leading-5 opacity-90">{hint}</p>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  busy,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
  variant?: "default" | "primary" | "accent";
}) {
  const className =
    variant === "primary"
      ? "border-[#0B5CAB] bg-[#0B5CAB] text-white hover:border-[#084298] hover:bg-[#084298]"
      : variant === "accent"
        ? "border-sky-200 bg-sky-50 text-[#0B5CAB] hover:border-sky-300 hover:bg-sky-100"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {busy ? `${label} 중...` : label}
    </button>
  );
}

export default function MonitorsPageClient({
  initialMonitors,
  initialQuery = "",
  initialSelectedBand = "all",
}: MonitorsPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(initialQuery);
  const [selectedBand, setSelectedBand] = useState<BandFilter>(
    parseBandFilter(initialSelectedBand),
  );
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState<MessageState>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setSelectedBand(parseBandFilter(initialSelectedBand));
  }, [initialSelectedBand]);

  const monitors = initialMonitors;

  const filtered = useMemo(() => {
    return [...monitors]
      .filter((item) => {
        const band = normalizeBand(item);
        const bandMatched = selectedBand === "all" ? true : band === selectedBand;
        return bandMatched && includesQuery(item, query);
      })
      .sort(compareMonitors);
  }, [monitors, query, selectedBand]);

  const urgentCount = useMemo(
    () => monitors.filter((item) => normalizeBand(item) === "urgent").length,
    [monitors],
  );

  const actionCount = useMemo(
    () => monitors.filter((item) => normalizeBand(item) === "action").length,
    [monitors],
  );

  const watchCount = useMemo(
    () => monitors.filter((item) => normalizeBand(item) === "watch").length,
    [monitors],
  );

  const stableCount = useMemo(
    () => monitors.filter((item) => normalizeBand(item) === "stable").length,
    [monitors],
  );

  const updatedRecentlyCount = useMemo(
    () =>
      monitors.filter((item) => {
        const days = daysDiffFromNow(item.updatedAt ?? item.createdAt);
        return days != null && days <= 7;
      }).length,
    [monitors],
  );

  const staleCount = useMemo(
    () =>
      monitors.filter((item) => {
        const days = daysDiffFromNow(item.updatedAt ?? item.createdAt);
        return days != null && days > 14;
      }).length,
    [monitors],
  );

  const averageClosingRisk = useMemo(() => {
    const values = filtered
      .map((item) => item.closingRiskScore)
      .filter((value): value is number => value != null);

    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [filtered]);

  const driverCounts = useMemo(() => {
    const initialCounts: Record<DriverKey, number> = {
      market: 0,
      business: 0,
      structure: 0,
      unclassified: 0,
    };

    return filtered.reduce((acc, item) => {
      const driver = dominantDriver(item);
      acc[driver] += 1;
      return acc;
    }, initialCounts);
  }, [filtered]);

  const applyFilters = (nextQuery: string, nextBand: BandFilter) => {
    setQuery(nextQuery);
    setSelectedBand(nextBand);
    startTransition(() => {
      router.replace(buildUrl(nextQuery, nextBand), { scroll: false });
    });
  };

  const runPost = async (path: string, key: string, successText: string) => {
    setBusyKey(key);
    setMessage(null);

    try {
      const res = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const json = await res.json().catch(() => null);
      const warnings = extractWarnings(json);

      if (!res.ok || getJsonValue(json, "ok") === false) {
        throw new Error(buildFailureMessage(path, json));
      }

      if (warnings.length > 0) {
        setMessage({
          type: "warning",
          text: warnings.join(" "),
        });
      } else {
        setMessage({
          type: "success",
          text: successText || successLabelFromPath(path),
        });
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage({
        type: "error",
        text: "처리 중 문제가 있었지만 화면은 유지했습니다. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setBusyKey("");
    }
  };

  const runRefreshAndRebuild = async (monitorId: number) => {
    const key = `refresh-rebuild-${monitorId}`;
    setBusyKey(key);
    setMessage(null);

    try {
      const refreshRes = await fetch(`/api/monitors/${monitorId}/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const refreshJson = await refreshRes.json().catch(() => null);

      if (!refreshRes.ok || getJsonValue(refreshJson, "ok") === false) {
        throw new Error(buildFailureMessage(`/api/monitors/${monitorId}/refresh`, refreshJson));
      }

      const rebuildRes = await fetch(`/api/monitors/${monitorId}/rebuild-health`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const rebuildJson = await rebuildRes.json().catch(() => null);

      if (!rebuildRes.ok || getJsonValue(rebuildJson, "ok") === false) {
        throw new Error(
          buildFailureMessage(`/api/monitors/${monitorId}/rebuild-health`, rebuildJson),
        );
      }

      const warnings = Array.from(
        new Set([...extractWarnings(refreshJson), ...extractWarnings(rebuildJson)]),
      );

      if (warnings.length > 0) {
        setMessage({
          type: "warning",
          text: warnings.join(" "),
        });
      } else {
        setMessage({
          type: "success",
          text: `모니터 #${monitorId} 재평가를 완료했습니다.`,
        });
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage({
        type: "error",
        text: "재평가 중 문제가 있었지만 화면은 유지했습니다. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setBusyKey("");
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.06)]">
          <div className="bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_45%,#ffffff_100%)] p-6 sm:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 max-w-4xl">
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#0B5CAB]">
                  사업장 중심 운영보드
                </div>

                <h1 className="mt-5 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  모니터 운영 현황
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  탐지, 개입, 추적을 하나의 목록에서 바로 이어갈 수 있게 정리했습니다.
                  시장위험, 사업장위험, 구조가능성을 분리해서 보고, 마지막 기회 대상은
                  재평가까지 바로 연결합니다.
                </p>

                <div className="mt-5 flex flex-wrap gap-2 text-sm">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700">
                    전체 {formatNumber(monitors.length)}곳
                  </span>
                  <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700">
                    최우선 {formatNumber(urgentCount)}곳
                  </span>
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">
                    집중개입 {formatNumber(actionCount)}곳
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700">
                    검색결과 {formatNumber(filtered.length)}곳
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700">
                    평균 최종위험 {averageClosingRisk == null ? "-" : formatScore(averageClosingRisk)}
                    점
                  </span>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto xl:flex-col">
                <button
                  type="button"
                  onClick={() =>
                    startTransition(() => {
                      router.refresh();
                    })
                  }
                  disabled={isPending}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-[#0B5CAB] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "불러오는 중..." : "목록 새로고침"}
                </button>

                <Link
                  href="/monitors/new"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#0B5CAB] bg-[#0B5CAB] px-5 text-sm font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298]"
                >
                  새 모니터 등록
                </Link>
              </div>
            </div>

            {message ? (
              <div
                className={`mt-5 rounded-[24px] border px-4 py-3 text-sm leading-6 ${
                  message.type === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : message.type === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {message.text}
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="전체 사업장"
            value={formatNumber(monitors.length)}
            description="현재 모니터에 등록된 사업장 수"
          />
          <MetricCard
            title="최우선 개입"
            value={formatNumber(urgentCount)}
            description="마지막 기회 또는 폐업위험 80점 이상"
            tone={urgentCount > 0 ? "danger" : "default"}
          />
          <MetricCard
            title="집중개입"
            value={formatNumber(actionCount)}
            description="우선 처방 연결이 필요한 사업장"
            tone={actionCount > 0 ? "warning" : "default"}
          />
          <MetricCard
            title="갱신 필요"
            value={formatNumber(staleCount)}
            description="14일 넘게 재평가되지 않은 사업장"
            tone={staleCount > 0 ? "info" : "default"}
          />
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5CAB]">
                필터
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                개입 우선순위별 조회
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                검색과 우선순위를 함께 걸러서 바로 개입할 사업장을 빠르게 찾습니다.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              최근 7일 내 갱신 {formatNumber(updatedRecentlyCount)}곳
            </div>
          </div>

          <form
            className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              applyFilters(query, selectedBand);
            }}
          >
            <input
              type="text"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="상호명, 주소, 지역, 업종, 원인축으로 검색"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300"
            />

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#0B5CAB] bg-[#0B5CAB] px-5 text-sm font-semibold text-white transition hover:border-[#084298] hover:bg-[#084298]"
            >
              검색 적용
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {(["all", "urgent", "action", "watch", "stable"] as const).map((band) => (
              <button
                key={band}
                type="button"
                onClick={() => applyFilters(query, band)}
                className={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition ${
                  selectedBand === band
                    ? "border-sky-200 bg-sky-50 text-[#0B5CAB]"
                    : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-[#0B5CAB]"
                }`}
              >
                {bandLabel(band)}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${bandTone("urgent")}`}
                >
                  최우선 {formatNumber(urgentCount)}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${bandTone("action")}`}
                >
                  집중개입 {formatNumber(actionCount)}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${bandTone("watch")}`}
                >
                  관찰 {formatNumber(watchCount)}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${bandTone("stable")}`}
                >
                  안정 {formatNumber(stableCount)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                목록은 개입 우선순위, 최종 폐업위험, 최신 갱신 순서로 정렬됩니다.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                원인축 추정
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-center text-sm font-semibold text-sky-700">
                  시장 {formatNumber(driverCounts.market)}
                </div>
                <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-3 text-center text-sm font-semibold text-violet-700">
                  사업장 {formatNumber(driverCounts.business)}
                </div>
                <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-3 text-center text-sm font-semibold text-fuchsia-700">
                  구조 {formatNumber(driverCounts.structure)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">
                검색 결과 {formatNumber(filtered.length)}곳
              </p>
              <p className="mt-1 text-sm text-slate-500">
                사업장별로 탐지 → 개입 → 추적 흐름을 바로 확인할 수 있습니다.
              </p>
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              정부서비스형 운영 목록
            </div>
          </div>

          {filtered.length > 0 ? (
            filtered.map((item) => {
              const band = normalizeBand(item);
              const stage = stageMeta(item.stage);
              const driver = driverMeta(dominantDriver(item));
              const updatedLabel = formatDateLabel(item.updatedAt ?? item.createdAt);
              const relativeLabel = relativeUpdateLabel(item.updatedAt ?? item.createdAt);
              const stale = (() => {
                const days = daysDiffFromNow(item.updatedAt ?? item.createdAt);
                return days != null && days > 14;
              })();

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_20px_52px_rgba(15,23,42,0.08)]"
                >
                  <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#fcfdff_0%,#f7fbff_100%)] px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${bandTone(band)}`}
                      >
                        {bandLabel(band)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${stage.tone}`}
                      >
                        {stage.label}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${driver.tone}`}
                      >
                        {driver.label}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        업데이트 {updatedLabel}
                      </span>
                      {stale ? (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          재평가 권장
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
                    <div className="min-w-0">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                            Monitor #{item.id}
                          </p>
                          <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.04em] text-slate-950">
                            {item.businessName}
                          </h2>

                          <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
                            {item.regionName ? (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                                {item.regionName}
                              </span>
                            ) : null}
                            {item.categoryName ? (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                                {item.categoryName}
                              </span>
                            ) : null}
                            {item.address ? (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                                {item.address}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <Link
                          href={`/monitors/${item.id}`}
                          className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-[#0B5CAB]"
                        >
                          상세 보기
                        </Link>
                      </div>

                      <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                        {buildSummaryText(item)}
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <InfoTile
                          label="탐지"
                          value={`${stage.label} · ${bandLabel(band)}`}
                          description={stage.summary}
                          toneClass="border-slate-200 bg-white text-slate-700"
                        />
                        <InfoTile
                          label="개입"
                          value={driver.label}
                          description={driver.actionCue}
                          toneClass={driver.tone}
                        />
                        <InfoTile
                          label="추적"
                          value={relativeLabel}
                          description={
                            stale ? "14일 이상 미갱신 상태입니다." : `최근 갱신일 ${updatedLabel}`
                          }
                          toneClass={
                            stale
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-white text-slate-700"
                          }
                        />
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <ActionButton
                          label="데이터 갱신"
                          onClick={() =>
                            runPost(
                              `/api/monitors/${item.id}/refresh`,
                              `refresh-${item.id}`,
                              `${item.businessName} 데이터 갱신을 완료했습니다.`,
                            )
                          }
                          disabled={busyKey === `refresh-${item.id}`}
                          busy={busyKey === `refresh-${item.id}`}
                        />
                        <ActionButton
                          label="상태 재계산"
                          onClick={() =>
                            runPost(
                              `/api/monitors/${item.id}/rebuild-health`,
                              `rebuild-${item.id}`,
                              `${item.businessName} 상태 재계산을 완료했습니다.`,
                            )
                          }
                          disabled={busyKey === `rebuild-${item.id}`}
                          busy={busyKey === `rebuild-${item.id}`}
                          variant="accent"
                        />
                        <ActionButton
                          label="빠른 재평가"
                          onClick={() => runRefreshAndRebuild(item.id)}
                          disabled={busyKey === `refresh-rebuild-${item.id}`}
                          busy={busyKey === `refresh-rebuild-${item.id}`}
                          variant="primary"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <ScoreTile
                        label="시장위험"
                        value={item.marketRiskScore}
                        hint="상권 수요·유입·외부 경쟁 신호"
                      />
                      <ScoreTile
                        label="사업장위험"
                        value={item.businessRiskScore}
                        hint="현장 운영·내부 실행·영업 상태"
                      />
                      <ScoreTile
                        label="구조가능성"
                        value={item.recoverabilityScore}
                        hint="회복 여력과 구조 전환 가능성"
                        positiveHigher
                      />
                      <ScoreTile
                        label="최종 폐업위험"
                        value={item.closingRiskScore}
                        hint={bandDescription(band)}
                      />
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[32px] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
              <p className="text-lg font-bold tracking-[-0.03em] text-slate-800">
                조건에 맞는 모니터가 없습니다.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                필터를 초기화하거나 검색어를 조정해보세요.
              </p>
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => applyFilters("", "all")}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-[#0B5CAB]"
                >
                  필터 초기화
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}