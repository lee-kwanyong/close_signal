import { supabaseAdmin } from "@/lib/supabase/admin";
export * from "@/lib/close-signal/intel/presenter";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type UnknownRecord = Record<string, unknown>;

type NormalizedReason = {
  code: string | null;
  title: string;
  description: string;
  weight: number | null;
  layerLabel: string;
  sourceType: string | null;
};

type NormalizedAction = {
  title: string;
  description: string;
  priority: number;
  targetDays: number | null;
  playbookCode: string | null;
  status: string;
  evidenceNeeded: unknown[];
  successCriteria: unknown[];
};

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function text(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function num(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function normalizeTextKey(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim();
}

function actionMatchKey(playbookCode: string | null, title: string | null): string {
  const byPlaybook = normalizeTextKey(playbookCode);
  if (byPlaybook) return `playbook:${byPlaybook}`;
  return `title:${normalizeTextKey(title)}`;
}

function stageFromClosingRisk(score: number | null): string {
  if (score == null) return "caution";
  if (score >= 80) return "critical";
  if (score >= 55) return "caution";
  return "stable";
}

function nextReviewAtFromStage(stage: string): string {
  const now = new Date();
  const normalized = stage.toLowerCase();

  const plusDays = normalized.includes("critical")
    ? 3
    : normalized.includes("caution")
      ? 7
      : 14;

  now.setDate(now.getDate() + plusDays);
  return now.toISOString();
}

function buildFallbackClosingRisk(args: {
  marketRiskScore: number | null;
  businessRiskScore: number | null;
  recoverabilityScore: number | null;
}): number | null {
  const { marketRiskScore, businessRiskScore, recoverabilityScore } = args;

  if (
    marketRiskScore == null &&
    businessRiskScore == null &&
    recoverabilityScore == null
  ) {
    return null;
  }

  const market = marketRiskScore ?? 0;
  const business = businessRiskScore ?? 0;
  const recoverability = recoverabilityScore ?? 50;

  return clamp(market * 0.35 + business * 0.45 + (100 - recoverability) * 0.2);
}

function normalizeReasonItem(item: unknown, index: number): NormalizedReason {
  const record = asRecord(item);

  return {
    code: text(record.code, record.reason_code, record.reasonCode),
    title:
      text(
        record.title,
        record.reason_title,
        record.reasonTitle,
        record.label,
        record.name,
      ) ?? `이유 ${index + 1}`,
    description:
      text(
        record.description,
        record.detail,
        record.summary,
        record.message,
        record.reason_description,
        record.reasonDescription,
      ) ?? "",
    weight: num(record.weight, record.score_weight, record.scoreWeight),
    layerLabel:
      text(
        record.layer_label,
        record.layerLabel,
        record.layer,
        record.scope_label,
        record.scopeLabel,
        record.scope,
      ) ?? "사업장",
    sourceType: text(record.source_type, record.sourceType),
  };
}

function normalizeActionItem(item: unknown, index: number): NormalizedAction {
  const record = asRecord(item);
  const targetDays = num(record.target_days, record.targetDays, record.due_in_days);

  return {
    title:
      text(
        record.title,
        record.action_title,
        record.actionTitle,
        record.name,
        record.playbook_title,
        record.playbookTitle,
      ) ?? `액션 ${index + 1}`,
    description:
      text(
        record.description,
        record.summary,
        record.message,
        record.action_description,
        record.actionDescription,
      ) ?? "",
    priority: num(record.priority) ?? index + 1,
    targetDays,
    playbookCode: text(record.playbook_code, record.playbookCode, record.code),
    status: text(record.status, record.action_status, record.actionStatus) ?? "recommended",
    evidenceNeeded: asArray(record.evidence_needed ?? record.evidenceNeeded),
    successCriteria: asArray(record.success_criteria ?? record.successCriteria),
  };
}

function buildFallbackReasons(args: {
  businessName: string;
  regionName: string | null;
  categoryName: string | null;
  marketRiskScore: number | null;
  businessRiskScore: number | null;
  recoverabilityScore: number | null;
  finalClosingRiskScore: number | null;
}): NormalizedReason[] {
  const {
    businessName,
    regionName,
    categoryName,
    marketRiskScore,
    businessRiskScore,
    recoverabilityScore,
    finalClosingRiskScore,
  } = args;

  const reasons: NormalizedReason[] = [];

  if ((marketRiskScore ?? 0) >= 55) {
    reasons.push({
      code: "search_interest_down",
      title: "검색 관심도 하락",
      description: `${regionName ?? ""} ${categoryName ?? ""}`.trim()
        ? `${regionName} ${categoryName} 관련 수요 흐름이 약화되고 있어 검색 추세 반등 확인이 필요합니다.`
        : `${businessName} 관련 검색 수요 흐름이 약화되고 있어 반등 확인이 필요합니다.`,
      weight: marketRiskScore,
      layerLabel: "시장",
      sourceType: "search_trend",
    });
  }

  if ((businessRiskScore ?? 0) >= 50) {
    reasons.push({
      code: "place_presence_weak",
      title: "지도/플레이스 노출 약화",
      description:
        "카카오/네이버 플레이스에서 상호, 주소, 전화, 영업시간, 카테고리 정합성 점검이 필요합니다.",
      weight: businessRiskScore,
      layerLabel: "사업장",
      sourceType: "place_presence",
    });
  }

  if ((businessRiskScore ?? 0) >= 70) {
    reasons.push({
      code: "competition_dense",
      title: "경쟁 밀집 구간 진입",
      description:
        "반경 경쟁점 대비 대표 상품, 가격 포지셔닝, 차별 포인트 재정렬이 필요합니다.",
      weight: businessRiskScore,
      layerLabel: "사업장",
      sourceType: "competition",
    });
  }

  if ((recoverabilityScore ?? 100) <= 45) {
    reasons.push({
      code: "structural_recovery_low",
      title: "구조 회복 가능성 낮음",
      description:
        "단기 노출 개선만으로 회복되기 어렵고 운영 구조 자체 조정이 필요할 수 있습니다.",
      weight: recoverabilityScore != null ? 100 - recoverabilityScore : null,
      layerLabel: "구조",
      sourceType: "recoverability",
    });
  }

  if ((finalClosingRiskScore ?? 0) >= 85) {
    reasons.push({
      code: "last_chance_window",
      title: "마지막 개입 구간 진입",
      description:
        "최종 폐업위험이 높아 빠른 실행과 짧은 주기의 재평가가 필요한 상태입니다.",
      weight: finalClosingRiskScore,
      layerLabel: "종합",
      sourceType: "closing_risk",
    });
  }

  if (reasons.length === 0) {
    reasons.push({
      code: "monitoring_needed",
      title: "핵심 신호 재확인 필요",
      description:
        "명확한 단일 원인보다 복합 신호 상태여서 최근 신호를 다시 누적 관찰해야 합니다.",
      weight: finalClosingRiskScore,
      layerLabel: "종합",
      sourceType: "fallback",
    });
  }

  return reasons.slice(0, 5);
}

function buildFallbackActionFromReason(reason: NormalizedReason, index: number): NormalizedAction {
  switch ((reason.code ?? "").toLowerCase()) {
    case "search_interest_down":
      return {
        title: "검색 수요 반등 액션 실행",
        description:
          "대표 키워드, 지역+업종 키워드, 브랜드 키워드를 분리해서 검색 추세와 콘텐츠 반응을 점검합니다.",
        priority: Math.min(index + 1, 5),
        targetDays: 7,
        playbookCode: "SEARCH_TREND_RECOVERY",
        status: "recommended",
        evidenceNeeded: ["대표 키워드 추세", "지역+업종 키워드 추세", "브랜드 키워드 추세"],
        successCriteria: [
          {
            title: "검색 하락 멈춤",
            description: "최근 4주 기준 하락폭이 축소되거나 반등 신호가 보이면 개선으로 봅니다.",
          },
        ],
      };

    case "place_presence_weak":
      return {
        title: "플레이스 정합성 수정",
        description:
          "상호명, 주소, 전화번호, 영업시간, 대표 사진, 카테고리 노출 상태를 정리합니다.",
        priority: Math.min(index + 1, 5),
        targetDays: 3,
        playbookCode: "PLACE_PRESENCE_FIX",
        status: "recommended",
        evidenceNeeded: ["카카오 플레이스 화면", "네이버 플레이스 화면", "수정 반영 캡처"],
        successCriteria: [
          {
            title: "핵심 정보 일치",
            description: "카카오/네이버/자체 정보의 기본 필드가 일치하면 개선으로 봅니다.",
          },
        ],
      };

    case "competition_dense":
      return {
        title: "경쟁 대응 포지셔닝 조정",
        description:
          "근접 경쟁점과 비교해 가격, 상품, 대표 키워드, 차별 포인트를 재정렬합니다.",
        priority: Math.min(index + 1, 5),
        targetDays: 10,
        playbookCode: "COMPETITOR_REPOSITION",
        status: "recommended",
        evidenceNeeded: ["근처 경쟁점 리스트", "대표 메뉴/가격 비교", "새 포지셔닝 메모"],
        successCriteria: [
          {
            title: "차별 포인트 명확화",
            description: "경쟁점과 구분되는 핵심 메시지나 상품 구성이 정리되면 개선으로 봅니다.",
          },
        ],
      };

    case "structural_recovery_low":
      return {
        title: "운영 구조 개입안 점검",
        description:
          "노출 개선 외에 운영 시간, 상품 구성, 비용 구조, 반복 방문 유도 장치를 점검합니다.",
        priority: Math.min(index + 1, 5),
        targetDays: 14,
        playbookCode: "STRUCTURE_RECOVERY_CHECK",
        status: "recommended",
        evidenceNeeded: ["운영 구조 메모", "비용/상품 점검표"],
        successCriteria: [
          {
            title: "구조 조정안 정리",
            description: "실행 가능한 운영 구조 조정안이 1개 이상 정의되면 개선으로 봅니다.",
          },
        ],
      };

    default:
      return {
        title: "마지막 기회 액션 실행",
        description:
          "핵심 원인 가설을 바탕으로 즉시 실행 가능한 현장 개선 액션을 먼저 적용합니다.",
        priority: Math.min(index + 1, 5),
        targetDays: 7,
        playbookCode: "LAST_CHANCE_ACTION",
        status: "recommended",
        evidenceNeeded: ["현장 실행 캡처", "변경 내용 메모"],
        successCriteria: [
          {
            title: "핵심 지표 재확인",
            description: "다음 재평가 시점에 핵심 위험 신호가 완화되면 개선으로 봅니다.",
          },
        ],
      };
  }
}

function mergeActions(args: {
  rawActions: NormalizedAction[];
  reasons: NormalizedReason[];
}): NormalizedAction[] {
  const { rawActions, reasons } = args;

  if (rawActions.length > 0) {
    return uniqueBy(
      rawActions.map((action, index) => ({
        ...action,
        priority: action.priority || index + 1,
        status: action.status || "recommended",
      })),
      (item) => actionMatchKey(item.playbookCode, item.title),
    ).slice(0, 6);
  }

  return uniqueBy(
    reasons.map((reason, index) => buildFallbackActionFromReason(reason, index)),
    (item) => actionMatchKey(item.playbookCode, item.title),
  ).slice(0, 6);
}

function readRefreshNormalized(target: UnknownRecord): UnknownRecord {
  const latestRefreshPayload = asRecord(target.latest_refresh_payload);
  const metadata = asRecord(target.metadata ?? target.meta ?? target.config);

  return asRecord(
    latestRefreshPayload.normalized ??
      latestRefreshPayload.refresh ??
      metadata.lastRefreshResult ??
      metadata.last_refresh_result,
  );
}

async function fetchMonitor(monitorId: number) {
  const { data, error } = await supabaseAdmin()
    .from("external_intel_targets")
    .select("*")
    .eq("id", monitorId)
    .maybeSingle();

  if (error) {
    throw new Error(`external_intel_targets 조회 실패: ${error.message}`);
  }

  return data ? asRecord(data) : null;
}

async function fetchLatestSnapshot(monitorId: number) {
  const { data, error } = await supabaseAdmin()
    .from("business_health_snapshots")
    .select("*")
    .eq("monitor_id", monitorId)
    .order("snapshot_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`business_health_snapshots 조회 실패: ${error.message}`);
  }

  return data ? asRecord(data) : null;
}

async function fetchSnapshotActions(snapshotId: number | null) {
  if (!snapshotId) return [];

  const { data, error } = await supabaseAdmin()
    .from("snapshot_recommended_actions")
    .select("*")
    .eq("health_snapshot_id", snapshotId)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`snapshot_recommended_actions 조회 실패: ${error.message}`);
  }

  return asArray<UnknownRecord>(data);
}

async function insertSnapshotRow(payload: {
  monitorId: number;
  businessName: string;
  address: string | null;
  regionName: string | null;
  categoryName: string | null;
  stage: string;
  marketRiskScore: number | null;
  businessRiskScore: number | null;
  recoverabilityScore: number | null;
  finalClosingRiskScore: number | null;
  whySummary: string;
  actionSummary: string;
  nextReviewAt: string | null;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const variants: UnknownRecord[] = [
    {
      monitor_id: payload.monitorId,
      business_name: payload.businessName,
      address: payload.address,
      region_name: payload.regionName,
      category_name: payload.categoryName,
      snapshot_date: today,
      stage: payload.stage,
      market_risk_score: payload.marketRiskScore,
      business_risk_score: payload.businessRiskScore,
      rescue_chance_score: payload.recoverabilityScore,
      closing_risk_score: payload.finalClosingRiskScore,
      why_summary: payload.whySummary,
      action_summary: payload.actionSummary,
      next_review_at: payload.nextReviewAt,
    },
    {
      monitor_id: payload.monitorId,
      business_name: payload.businessName,
      address: payload.address,
      region_name: payload.regionName,
      category_name: payload.categoryName,
      snapshot_date: today,
      stage: payload.stage,
      market_risk_score: payload.marketRiskScore,
      business_risk_score: payload.businessRiskScore,
      recoverability_score: payload.recoverabilityScore,
      final_closing_risk_score: payload.finalClosingRiskScore,
      why_summary: payload.whySummary,
      action_summary: payload.actionSummary,
      next_review_at: payload.nextReviewAt,
    },
  ];

  let lastError: string | null = null;

  for (const variant of variants) {
    const { data, error } = await supabaseAdmin()
      .from("business_health_snapshots")
      .insert(variant)
      .select("*")
      .single();

    if (!error) {
      return asRecord(data);
    }

    lastError = error.message;
  }

  throw new Error(lastError ?? "business_health_snapshots insert 실패");
}

async function insertReasonRows(snapshotId: number, reasons: NormalizedReason[]) {
  if (reasons.length === 0) return;

  const variant1 = reasons.map((reason, index) => ({
    health_snapshot_id: snapshotId,
    rank_order: index + 1,
    reason_code: reason.code,
    title: reason.title,
    detail: reason.description,
    weight: reason.weight,
    layer_label: reason.layerLabel,
    source_type: reason.sourceType,
  }));

  const variant2 = reasons.map((reason, index) => ({
    health_snapshot_id: snapshotId,
    rank_order: index + 1,
    reason_code: reason.code,
    reason_title: reason.title,
    description: reason.description,
    weight: reason.weight,
    layer: reason.layerLabel,
    source_type: reason.sourceType,
  }));

  {
    const { error } = await supabaseAdmin()
      .from("business_snapshot_reasons")
      .insert(variant1);

    if (!error) return;
  }

  {
    const { error } = await supabaseAdmin()
      .from("business_snapshot_reasons")
      .insert(variant2);

    if (!error) return;

    throw new Error(`business_snapshot_reasons insert 실패: ${error.message}`);
  }
}

async function insertActionRows(snapshotId: number, actions: NormalizedAction[]) {
  if (actions.length === 0) return;

  const variant1 = actions.map((action) => ({
    health_snapshot_id: snapshotId,
    title: action.title,
    description: action.description,
    priority: action.priority,
    target_days: action.targetDays,
    playbook_code: action.playbookCode,
    status: action.status,
    evidence_needed: action.evidenceNeeded,
    success_criteria: action.successCriteria,
  }));

  const variant2 = actions.map((action) => ({
    health_snapshot_id: snapshotId,
    action_title: action.title,
    description: action.description,
    priority: action.priority,
    due_in_days: action.targetDays,
    playbook_code: action.playbookCode,
    action_status: action.status,
    evidence_needed: action.evidenceNeeded,
    success_criteria: action.successCriteria,
  }));

  {
    const { error } = await supabaseAdmin()
      .from("snapshot_recommended_actions")
      .insert(variant1);

    if (!error) return;
  }

  {
    const { error } = await supabaseAdmin()
      .from("snapshot_recommended_actions")
      .insert(variant2);

    if (!error) return;

    throw new Error(`snapshot_recommended_actions insert 실패: ${error.message}`);
  }
}

function buildPreviousActionStatusMap(previousActions: UnknownRecord[]) {
  const map = new Map<string, string>();

  for (const row of previousActions) {
    const key = actionMatchKey(
      text(row.playbook_code, row.playbookCode, row.code),
      text(row.title, row.action_title, row.actionTitle, row.name),
    );

    const status = text(row.status, row.action_status, row.actionStatus) ?? "recommended";

    if (key) {
      map.set(key, status);
    }
  }

  return map;
}

function carryOverActionStatuses(
  actions: NormalizedAction[],
  previousStatusMap: Map<string, string>,
): NormalizedAction[] {
  return actions.map((action) => {
    const key = actionMatchKey(action.playbookCode, action.title);
    const previousStatus = previousStatusMap.get(key);

    if (!previousStatus) {
      return {
        ...action,
        status: action.status || "recommended",
      };
    }

    return {
      ...action,
      status: previousStatus,
    };
  });
}

function summarizeReasons(reasons: NormalizedReason[]): string {
  const labels = reasons.map((item) => item.title).filter(Boolean);
  return labels.length > 0 ? labels.slice(0, 3).join(" · ") : "핵심 원인 요약이 아직 없습니다.";
}

function summarizeActions(actions: NormalizedAction[]): string {
  const labels = actions.map((item) => item.title).filter(Boolean);
  return labels.length > 0 ? labels.slice(0, 3).join(" · ") : "권장 액션 요약이 아직 없습니다.";
}

export async function buildBusinessHealthSnapshot(monitorId: number) {
  if (!Number.isInteger(monitorId) || monitorId <= 0) {
    throw new Error("유효한 monitor id가 아닙니다.");
  }

  const monitor = await fetchMonitor(monitorId);

  if (!monitor) {
    throw new Error("모니터를 찾지 못했습니다.");
  }

  const previousSnapshot = await fetchLatestSnapshot(monitorId);
  const previousSnapshotId = num(previousSnapshot?.id);
  const previousActions = await fetchSnapshotActions(previousSnapshotId);
  const previousStatusMap = buildPreviousActionStatusMap(previousActions);

  const refreshNormalized = readRefreshNormalized(monitor);

  const businessName = text(monitor.business_name, monitor.businessName, monitor.name) ?? `모니터 ${monitorId}`;
  const regionName = text(monitor.region_name, monitor.regionName);
  const categoryName = text(monitor.category_name, monitor.categoryName);
  const address = text(monitor.address, monitor.road_address, monitor.roadAddress);

  const marketRiskScore = num(
    refreshNormalized.marketRiskScore,
    refreshNormalized.market_risk_score,
    monitor.latest_market_risk_score,
    monitor.market_risk_score,
  );

  const businessRiskScore = num(
    refreshNormalized.businessRiskScore,
    refreshNormalized.business_risk_score,
    refreshNormalized.placeRiskScore,
    refreshNormalized.place_risk_score,
    monitor.latest_business_risk_score,
    monitor.business_risk_score,
  );

  const recoverabilityScore = num(
    refreshNormalized.recoverabilityScore,
    refreshNormalized.recoverability_score,
    refreshNormalized.rescueChanceScore,
    refreshNormalized.rescue_chance_score,
    monitor.latest_rescue_chance_score,
    monitor.rescue_chance_score,
  );

  const finalClosingRiskScore =
    num(
      refreshNormalized.finalClosingRiskScore,
      refreshNormalized.final_closing_risk_score,
      refreshNormalized.closingRiskScore,
      refreshNormalized.closing_risk_score,
      refreshNormalized.riskScore,
      refreshNormalized.risk_score,
      monitor.latest_closing_risk_score,
      monitor.closing_risk_score,
    ) ??
    buildFallbackClosingRisk({
      marketRiskScore,
      businessRiskScore,
      recoverabilityScore,
    });

  const stage =
    text(
      refreshNormalized.stage,
      refreshNormalized.grade,
      refreshNormalized.risk_stage,
      monitor.latest_stage,
    ) ?? stageFromClosingRisk(finalClosingRiskScore);

  const rawReasons = asArray(refreshNormalized.reasons).map((item, index) =>
    normalizeReasonItem(item, index),
  );

  const reasons =
    rawReasons.length > 0
      ? uniqueBy(rawReasons, (item) => `${item.code ?? ""}:${item.title}`)
      : buildFallbackReasons({
          businessName,
          regionName,
          categoryName,
          marketRiskScore,
          businessRiskScore,
          recoverabilityScore,
          finalClosingRiskScore,
        });

  const rawActions = asArray(refreshNormalized.actions).map((item, index) =>
    normalizeActionItem(item, index),
  );

  const mergedActions = mergeActions({ rawActions, reasons });
  const actions = carryOverActionStatuses(mergedActions, previousStatusMap);

  const whySummary = text(refreshNormalized.whySummary, refreshNormalized.why_summary) ?? summarizeReasons(reasons);
  const actionSummary =
    text(refreshNormalized.actionSummary, refreshNormalized.action_summary) ?? summarizeActions(actions);
  const nextReviewAt =
    text(refreshNormalized.nextReviewAt, refreshNormalized.next_review_at) ?? nextReviewAtFromStage(stage);

  const snapshot = await insertSnapshotRow({
    monitorId,
    businessName,
    address,
    regionName,
    categoryName,
    stage,
    marketRiskScore,
    businessRiskScore,
    recoverabilityScore,
    finalClosingRiskScore,
    whySummary,
    actionSummary,
    nextReviewAt,
  });

  const snapshotId = num(snapshot.id);

  if (!snapshotId) {
    throw new Error("생성된 health snapshot id를 확인하지 못했습니다.");
  }

  await insertReasonRows(snapshotId, reasons);
  await insertActionRows(snapshotId, actions);

  return {
    ok: true,
    monitorId,
    snapshotId,
    snapshot: {
      id: snapshotId,
      stage,
      marketRiskScore,
      businessRiskScore,
      recoverabilityScore,
      finalClosingRiskScore,
      whySummary,
      actionSummary,
      nextReviewAt,
    },
    reasonsCount: reasons.length,
    actionsCount: actions.length,
  };
}