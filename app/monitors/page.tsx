import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type AnyRow = Record<string, unknown>;

const FETCH_LIMIT = 100;

function asString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function asNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function asDateValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function formatDate(value: unknown) {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string" && value.trim()
      ? new Date(value)
      : null;

  if (!date || Number.isNaN(date.getTime())) return "-";

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}.${mm}.${dd}`;
}

function formatRelativeDays(value: unknown) {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string" && value.trim()
      ? new Date(value)
      : null;

  if (!date || Number.isNaN(date.getTime())) return "갱신 기록 없음";

  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days <= 0) return "오늘 갱신";
  if (days === 1) return "1일 전 갱신";
  return `${days}일 전 갱신`;
}

function formatScore(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return Number(value).toFixed(digits);
}

function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function normalizeStage(value: string | null | undefined) {
  const raw = String(value || "").toLowerCase();

  if (
    raw.includes("critical") ||
    raw.includes("high") ||
    raw.includes("danger") ||
    raw.includes("urgent") ||
    raw.includes("red")
  ) {
    return "critical";
  }

  if (
    raw.includes("caution") ||
    raw.includes("warning") ||
    raw.includes("moderate") ||
    raw.includes("orange") ||
    raw.includes("amber")
  ) {
    return "caution";
  }

  if (
    raw.includes("stable") ||
    raw.includes("safe") ||
    raw.includes("healthy") ||
    raw.includes("green")
  ) {
    return "stable";
  }

  if (
    raw.includes("observe") ||
    raw.includes("watch") ||
    raw.includes("normal") ||
    raw.includes("blue")
  ) {
    return "observe";
  }

  return "unknown";
}

function stageLabel(stage: string | null | undefined) {
  const normalized = normalizeStage(stage);

  if (normalized === "critical") return "최우선";
  if (normalized === "caution") return "집중개입";
  if (normalized === "stable") return "안정";
  if (normalized === "observe") return "관찰";
  return "미확인";
}

function stageGroupLabel(stage: string | null | undefined) {
  const normalized = normalizeStage(stage);

  if (normalized === "critical") return "최종 관리군";
  if (normalized === "caution") return "집중 관리군";
  if (normalized === "stable") return "안정군";
  if (normalized === "observe") return "관찰 관리군";
  return "미분류";
}

function stageTone(stage: string | null | undefined) {
  const normalized = normalizeStage(stage);

  if (normalized === "critical") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (normalized === "caution") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (normalized === "stable") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "observe") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function scoreTone(score: number | null | undefined, invert = false) {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return "border-slate-200 bg-slate-50 text-slate-500";
  }

  const value = Number(score);

  if (invert) {
    if (value >= 70) return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (value >= 45) return "border-sky-200 bg-sky-50 text-sky-700";
    if (value >= 25) return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (value >= 70) return "border-red-200 bg-red-50 text-red-700";
  if (value >= 45) return "border-amber-200 bg-amber-50 text-amber-700";
  if (value >= 25) return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function monitorIdOf(row: AnyRow) {
  return asNumber(row.monitor_id, row.id, row.business_monitor_id);
}

function snapshotIdOf(row: AnyRow) {
  return asNumber(row.snapshot_id, row.id);
}

function regionCodeOf(row: AnyRow) {
  return asString(
    row.region_code,
    row.regionCode,
    row.sido_code,
    row.region_name,
    row.regionName,
  );
}

function categoryIdOf(row: AnyRow) {
  return asNumber(row.category_id, row.categoryId, row.business_category_id);
}

function monitorNameOf(row: AnyRow) {
  return (
    asString(
      row.business_name,
      row.place_name,
      row.store_name,
      row.monitor_name,
      row.name,
      row.title,
      row.company_name,
    ) ?? `모니터 #${monitorIdOf(row) ?? "-"}`
  );
}

function regionNameOf(row: AnyRow) {
  return asString(row.region_name, row.regionName, row.sido_name, row.region_code);
}

function categoryNameOf(row: AnyRow) {
  return asString(
    row.category_name,
    row.categoryName,
    row.industry_name,
    row.business_type,
    row.category_label,
  );
}

function addressOf(row: AnyRow) {
  return asString(
    row.address,
    row.road_address,
    row.jibun_address,
    row.full_address,
    row.place_address,
  );
}

function whySummaryOf(...rows: Array<AnyRow | undefined>) {
  for (const row of rows) {
    if (!row) continue;
    const text = asString(
      row.why_summary,
      row.reason_summary,
      row.summary_text,
      row.summary,
      row.risk_summary,
      row.current_summary,
      row.why,
      row.reason_text,
      row.reason_label,
      row.reason_title,
    );
    if (text) return text;
  }
  return null;
}

function actionSummaryOf(...rows: Array<AnyRow | undefined>) {
  for (const row of rows) {
    if (!row) continue;
    const text = asString(
      row.action_summary,
      row.recovery_direction,
      row.next_action,
      row.recommended_action_summary,
      row.playbook_summary,
      row.action_text,
      row.action_label,
      row.action_title,
    );
    if (text) return text;
  }
  return null;
}

function updatedAtOf(...rows: Array<AnyRow | undefined>) {
  for (const row of rows) {
    if (!row) continue;
    const value = asString(
      row.updated_at,
      row.created_at,
      row.snapshot_date,
      row.detected_at,
      row.last_refreshed_at,
      row.completed_at,
    );
    if (value) return value;
  }
  return null;
}

function deriveOwnerFocus(
  marketRisk: number | null,
  businessRisk: number | null,
  recoverability: number | null,
) {
  const structurePressure =
    recoverability === null || recoverability === undefined
      ? null
      : Math.max(0, 100 - recoverability);

  const candidates = [
    { label: "시장", value: marketRisk },
    { label: "사업장", value: businessRisk },
    { label: "구조", value: structurePressure },
  ].filter((item) => item.value !== null && item.value !== undefined) as Array<{
    label: string;
    value: number;
  }>;

  if (candidates.length === 0) return "미분류";

  candidates.sort((a, b) => b.value - a.value);
  return candidates[0].label;
}

function summaryLineOf(input: {
  finalRisk: number | null;
  recoverability: number | null;
  stage: string | null;
  whySummary: string | null;
}) {
  const bits = [
    input.finalRisk !== null ? `최종 폐업위험 ${formatScore(input.finalRisk, 1)}점` : null,
    input.recoverability !== null ? `구조가능성 ${formatScore(input.recoverability, 0)}점` : null,
    input.stage ? `${stageLabel(input.stage)} 단계` : null,
    input.stage ? stageGroupLabel(input.stage) : null,
    input.whySummary,
  ].filter(Boolean);

  return bits.length > 0 ? bits.join(" · ") : "실제 데이터가 아직 쌓이지 않았습니다.";
}

async function getMonitorRows() {
  const supabase = (await createClient()) as any;

  for (const tableName of ["monitors", "business_monitors", "monitor_targets"]) {
    try {
      const { data, error } = await supabase.from(tableName).select("*").limit(FETCH_LIMIT);
      if (!error && Array.isArray(data)) {
        return [...data].sort((a: AnyRow, b: AnyRow) => {
          const ta =
            asDateValue(a.updated_at, a.last_refreshed_at, a.created_at)?.getTime() ?? 0;
          const tb =
            asDateValue(b.updated_at, b.last_refreshed_at, b.created_at)?.getTime() ?? 0;
          return tb - ta;
        }) as AnyRow[];
      }
    } catch {}
  }

  return [] as AnyRow[];
}

async function getLastChanceRows(monitorIds: number[]) {
  if (monitorIds.length === 0) return [] as AnyRow[];

  const supabase = (await createClient()) as any;

  for (const viewName of ["v_monitor_last_chance_cards", "monitor_last_chance_cards"]) {
    try {
      const { data, error } = await supabase
        .from(viewName)
        .select("*")
        .in("monitor_id", monitorIds);

      if (!error && Array.isArray(data)) {
        return data as AnyRow[];
      }
    } catch {}
  }

  return [] as AnyRow[];
}

async function getSnapshotRows(monitorIds: number[]) {
  if (monitorIds.length === 0) return [] as AnyRow[];

  const supabase = (await createClient()) as any;

  try {
    const { data, error } = await supabase
      .from("business_health_snapshots")
      .select("*")
      .in("monitor_id", monitorIds)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      return data as AnyRow[];
    }
  } catch {}

  return [] as AnyRow[];
}

function SmallChip({
  children,
  tone = "border-slate-200 bg-white text-slate-600",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}
    >
      {children}
    </span>
  );
}

function StatBox({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: string;
}) {
  return (
    <div className={`rounded-[24px] border p-5 ${tone}`}>
      <div className="text-xs font-semibold tracking-wide text-slate-500">{label}</div>
      <div className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">{value}</div>
      {sub ? <div className="mt-2 text-sm leading-6 text-slate-600">{sub}</div> : null}
    </div>
  );
}

function ScorePanel({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | null;
  sub?: string;
  tone: string;
}) {
  return (
    <div className={`rounded-[24px] border p-5 ${tone}`}>
      <div className="text-xs font-semibold tracking-wide">{label}</div>
      <div className="mt-3 text-4xl font-semibold tracking-tight">
        {value === null ? "-" : formatScore(value, value % 1 === 0 ? 0 : 1)}
      </div>
      {sub ? <div className="mt-2 text-sm leading-6 opacity-90">{sub}</div> : null}
    </div>
  );
}

export default async function MonitorsPage() {
  const monitorRows = await getMonitorRows();
  const monitorIds = monitorRows
    .map((row) => monitorIdOf(row))
    .filter((value): value is number => value !== null);

  const [lastChanceRows, snapshotRows] = await Promise.all([
    getLastChanceRows(monitorIds),
    getSnapshotRows(monitorIds),
  ]);

  const lastChanceMap = new Map<number, AnyRow>();
  for (const row of lastChanceRows) {
    const monitorId = monitorIdOf(row);
    if (monitorId === null) continue;

    const prev = lastChanceMap.get(monitorId);
    const prevTime = asDateValue(prev?.updated_at, prev?.created_at)?.getTime() ?? 0;
    const nextTime = asDateValue(row.updated_at, row.created_at)?.getTime() ?? 0;

    if (!prev || nextTime >= prevTime) {
      lastChanceMap.set(monitorId, row);
    }
  }

  const snapshotMap = new Map<number, AnyRow>();
  for (const row of snapshotRows) {
    const monitorId = asNumber(row.monitor_id);
    if (monitorId === null) continue;
    if (!snapshotMap.has(monitorId)) {
      snapshotMap.set(monitorId, row);
    }
  }

  const cards = monitorRows.map((monitorRow) => {
    const monitorId = monitorIdOf(monitorRow);
    const cardRow = monitorId !== null ? lastChanceMap.get(monitorId) : undefined;
    const snapshotRow = monitorId !== null ? snapshotMap.get(monitorId) : undefined;

    const regionCode = regionCodeOf(monitorRow) ?? regionCodeOf(cardRow ?? {}) ?? null;
    const categoryId = categoryIdOf(monitorRow) ?? categoryIdOf(cardRow ?? {}) ?? null;

    const marketRisk = asNumber(
      cardRow?.market_risk_score,
      cardRow?.marketRiskScore,
      snapshotRow?.market_risk_score,
      snapshotRow?.marketRiskScore,
    );

    const businessRisk = asNumber(
      cardRow?.business_risk_score,
      cardRow?.businessRiskScore,
      snapshotRow?.business_risk_score,
      snapshotRow?.businessRiskScore,
      snapshotRow?.business_score,
    );

    const recoverability = asNumber(
      cardRow?.recoverability_score,
      cardRow?.recoverabilityScore,
      snapshotRow?.recoverability_score,
      snapshotRow?.recoverabilityScore,
      snapshotRow?.structural_recoverability_score,
    );

    const finalRisk = asNumber(
      cardRow?.final_close_risk_score,
      cardRow?.finalCloseRiskScore,
      cardRow?.final_risk_score,
      snapshotRow?.final_close_risk_score,
      snapshotRow?.finalCloseRiskScore,
      snapshotRow?.final_risk_score,
      snapshotRow?.close_risk_score,
    );

    const stage = asString(
      cardRow?.stage,
      snapshotRow?.stage,
      monitorRow.stage,
      cardRow?.risk_stage,
      snapshotRow?.risk_stage,
    );

    const whySummary = whySummaryOf(cardRow, snapshotRow, monitorRow);
    const actionSummary = actionSummaryOf(cardRow, snapshotRow, monitorRow);
    const updatedAt = updatedAtOf(cardRow, snapshotRow, monitorRow);

    const ownerFocus = deriveOwnerFocus(marketRisk, businessRisk, recoverability);

    const title = monitorNameOf(monitorRow);
    const regionName = regionNameOf(monitorRow) ?? regionNameOf(cardRow ?? {}) ?? regionCode;
    const categoryName =
      categoryNameOf(monitorRow) ?? categoryNameOf(cardRow ?? {}) ?? (categoryId ? String(categoryId) : null);
    const address = addressOf(monitorRow) ?? addressOf(cardRow ?? {}) ?? null;

    const detailHref =
      regionCode && categoryId
        ? `/regions/${encodeURIComponent(regionCode)}/${categoryId}`
        : monitorId !== null
        ? `/monitors/${monitorId}`
        : "#";

    return {
      monitorId,
      title,
      regionName,
      categoryName,
      address,
      stage,
      ownerFocus,
      whySummary,
      actionSummary,
      updatedAt,
      marketRisk,
      businessRisk,
      recoverability,
      finalRisk,
      detailHref,
      summaryLine: summaryLineOf({
        finalRisk,
        recoverability,
        stage,
        whySummary,
      }),
    };
  });

  const totalCount = cards.length;
  const criticalCount = cards.filter((card) => normalizeStage(card.stage) === "critical").length;
  const cautionCount = cards.filter((card) => normalizeStage(card.stage) === "caution").length;
  const observeCount = cards.filter((card) => normalizeStage(card.stage) === "observe").length;
  const stableCount = cards.filter((card) => normalizeStage(card.stage) === "stable").length;

  const focusCounts = cards.reduce(
    (acc, card) => {
      if (card.ownerFocus === "시장") acc.market += 1;
      else if (card.ownerFocus === "사업장") acc.business += 1;
      else if (card.ownerFocus === "구조") acc.structure += 1;
      else acc.unknown += 1;
      return acc;
    },
    { market: 0, business: 0, structure: 0, unknown: 0 },
  );

  return (
    <main className="min-h-screen bg-sky-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 pb-16 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border border-sky-100 bg-white p-6 shadow-sm shadow-sky-100/40">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                MONITORS
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                사업장 위험 모니터
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                가짜 데이터 없이 현재 DB에 실제로 있는 모니터, 마지막 기회 카드, 건강 스냅샷만
                보여줍니다.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <SmallChip tone="border-sky-200 bg-sky-50 text-sky-700">
                  전체 {formatCount(totalCount)}
                </SmallChip>
                <SmallChip tone="border-red-200 bg-red-50 text-red-700">
                  최우선 {formatCount(criticalCount)}
                </SmallChip>
                <SmallChip tone="border-amber-200 bg-amber-50 text-amber-700">
                  집중개입 {formatCount(cautionCount)}
                </SmallChip>
                <SmallChip tone="border-sky-200 bg-sky-50 text-sky-700">
                  관찰 {formatCount(observeCount)}
                </SmallChip>
                <SmallChip tone="border-emerald-200 bg-emerald-50 text-emerald-700">
                  안정 {formatCount(stableCount)}
                </SmallChip>
              </div>
            </div>

            <div className="grid min-w-0 gap-4 sm:grid-cols-3 xl:w-[380px]">
              <StatBox
                label="원인 축 추정"
                value={String(focusCounts.market)}
                sub="시장"
                tone="border-sky-200 bg-sky-50"
              />
              <StatBox
                label="원인 축 추정"
                value={String(focusCounts.business)}
                sub="사업장"
                tone="border-violet-200 bg-violet-50"
              />
              <StatBox
                label="원인 축 추정"
                value={String(focusCounts.structure)}
                sub="구조"
                tone="border-fuchsia-200 bg-fuchsia-50"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                검색 결과 {formatCount(totalCount)}곳
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                사업장별 탐지 → 개입 → 추적 흐름을 실제 데이터 기준으로 바로 확인합니다.
              </p>
            </div>

            <div className="text-sm text-slate-500">
              데이터 없음인 항목은 아직 해당 단계 결과가 생성되지 않은 것입니다.
            </div>
          </div>
        </section>

        {cards.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-sky-200 bg-white px-6 py-14 text-center shadow-sm">
            <div className="text-xl font-semibold text-slate-950">표시할 모니터가 없습니다.</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              현재 DB에 저장된 monitor row가 없거나, 로컬 페이지가 아직 실제 테이블에 연결되지
              않았습니다.
            </p>
          </section>
        ) : (
          <div className="grid gap-5">
            {cards.map((card, index) => (
              <article
                key={`${card.monitorId ?? "monitor"}-${index}`}
                className="overflow-hidden rounded-[30px] border border-sky-100 bg-white shadow-sm shadow-sky-100/30"
              >
                <div className="border-b border-sky-100 bg-sky-50/70 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <SmallChip tone={stageTone(card.stage)}>{stageLabel(card.stage)}</SmallChip>
                    <SmallChip>{stageGroupLabel(card.stage)}</SmallChip>
                    <SmallChip>{card.ownerFocus} 원인</SmallChip>
                    <SmallChip>업데이트 {formatDate(card.updatedAt)}</SmallChip>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                              MONITOR #{card.monitorId ?? index + 1}
                            </div>

                            <h3 className="mt-2 break-words text-4xl font-semibold tracking-tight text-slate-950">
                              {card.title}
                            </h3>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {card.regionName ? <SmallChip>{card.regionName}</SmallChip> : null}
                              {card.categoryName ? <SmallChip>{card.categoryName}</SmallChip> : null}
                              {card.address ? <SmallChip>{card.address}</SmallChip> : null}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Link
                              href={card.detailHref}
                              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              상세 보기
                            </Link>
                          </div>
                        </div>

                        <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                          {card.summaryLine}
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
                          <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                            <div className="text-sm font-semibold text-slate-500">탐지</div>
                            <div className="mt-3 text-base font-semibold text-slate-950">
                              {stageLabel(card.stage)} · {stageGroupLabel(card.stage)}
                            </div>
                            <div className="mt-2 text-sm leading-6 text-slate-500">
                              {card.whySummary || "탐지 사유 데이터 없음"}
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-violet-200 bg-violet-50 p-4">
                            <div className="text-sm font-semibold text-violet-700">개입</div>
                            <div className="mt-3 text-base font-semibold text-violet-900">
                              {card.ownerFocus} 원인
                            </div>
                            <div className="mt-2 text-sm leading-6 text-violet-700">
                              {card.actionSummary || "개입 방향 데이터 없음"}
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                            <div className="text-sm font-semibold text-slate-500">추적</div>
                            <div className="mt-3 text-base font-semibold text-slate-950">
                              {formatRelativeDays(card.updatedAt)}
                            </div>
                            <div className="mt-2 text-sm leading-6 text-slate-500">
                              최근 갱신일 {formatDate(card.updatedAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid shrink-0 gap-4 md:grid-cols-2 xl:w-[420px]">
                      <ScorePanel
                        label="시장위험"
                        value={card.marketRisk}
                        sub="시장 수요·외부 압력·경쟁 신호"
                        tone={scoreTone(card.marketRisk)}
                      />
                      <ScorePanel
                        label="사업장위험"
                        value={card.businessRisk}
                        sub="현재 운영·내부 실행·영업 상태"
                        tone={scoreTone(card.businessRisk)}
                      />
                      <ScorePanel
                        label="구조가능성"
                        value={card.recoverability}
                        sub="회복 여력과 구조 전환 가능성"
                        tone={scoreTone(card.recoverability, true)}
                      />
                      <ScorePanel
                        label="최종 폐업위험"
                        value={card.finalRisk}
                        sub="추적과 근거 수집을 이어갑니다."
                        tone={scoreTone(card.finalRisk)}
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}