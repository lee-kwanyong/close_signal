import { buildCommunityComposeHref } from "@/lib/community/write-link";

export type UnknownRecord = Record<string, unknown>;
export type RawRiskSignalRow = Record<string, unknown>;

export type PresentedReason = {
  id: string;
  code: string | null;
  title: string;
  description: string;
  weight: number | null;
  layerLabel: string;
};

export type PresentedAction = {
  id: string | null;
  key: string;
  title: string;
  description: string;
  priority: number | string | null;
  etaLabel: string | null;
  playbookCode: string | null;
  status: string | null;
  evidenceNeeded: unknown[];
  successCriteria: unknown[];
};

export type PresentedEvidence = {
  id: string;
  title: string;
  description: string;
  sourceLabel: string;
};

export type PresentedCriterion = {
  id: string;
  title: string;
  description: string;
};

export type PresentedLastChanceCard = {
  id: string | null;
  monitorId: number | null;
  businessName: string;
  address: string | null;
  regionName: string | null;
  categoryName: string | null;
  snapshotDate: string | null;
  stage: string;
  marketRiskScore: number | null;
  businessRiskScore: number | null;
  recoverabilityScore: number | null;
  finalClosingRiskScore: number | null;
  whySummary: string | null;
  actionSummary: string | null;
  nextReviewAt: string | null;
  reasons: PresentedReason[];
  actions: PresentedAction[];
  evidence: PresentedEvidence[];
  successCriteria: PresentedCriterion[];
  reevaluation: {
    nextReviewAt: string | null;
    totalRiskDelta: number | null;
    recoverabilityDelta: number | null;
    latestResultStatus: string | null;
    latestResultText: string | null;
  };
};

export type PresentedSignal = {
  id: string | number;
  regionCode: string;
  regionName: string;
  categoryId: string | number | null;
  categoryName: string;
  signalType: string;
  signalTypeLabel: string;
  signalTypeTone: string;
  riskGrade: string;
  riskGradeLabel: string;
  riskGradeTone: string;
  riskScore: number | null;
  score: number | null;
  title: string;
  summary: string;
  why: string;
  action: string;
  personalization: string;
  impactText: string;
  revenueLabel: string;
  revenueTone: string;
  businessCount: number;
  closeRiskCount: number;
  scoreDate: string | null;
  signalDate: string | null;
  createdAt: string | null;
  source: string | null;
  query: string | null;
  keyword: string | null;
  keywords: string[];
  reason: string | null;
  stage: string | null;
  communityType: string;
  grade: string;
  personal_priority_label?: string | null;
};

export function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

export function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function text(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

export function num(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
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

function pickFirst<T = unknown>(row: UnknownRecord, keys: string[]): T | undefined {
  for (const key of keys) {
    if (key in row && row[key] != null) {
      return row[key] as T;
    }
  }
  return undefined;
}

function normalizeRiskGrade(value: string | null) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "moderate") return "medium";
  return raw;
}

function normalizeStage(value: string | null) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "observe";
  if (["critical", "last_chance", "urgent", "caution", "stable", "observe"].includes(raw)) {
    return raw;
  }
  return raw;
}

function riskGradeMeta(riskGrade: unknown) {
  const value = normalizeRiskGrade(text(riskGrade));

  switch (value) {
    case "critical":
      return {
        label: "치명적",
        tone: "border-violet-200 bg-violet-50 text-violet-700",
      };
    case "high":
      return {
        label: "고위험",
        tone: "border-rose-200 bg-rose-50 text-rose-700",
      };
    case "medium":
      return {
        label: "주의",
        tone: "border-amber-200 bg-amber-50 text-amber-700",
      };
    case "low":
      return {
        label: "관찰",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    default:
      return {
        label: text(riskGrade) || "미분류",
        tone: "border-slate-200 bg-slate-50 text-slate-700",
      };
  }
}

function signalTypeMeta(signalType: unknown) {
  const value = String(signalType || "").trim().toLowerCase();

  switch (value) {
    case "closure":
    case "business_closed":
      return {
        label: "폐업 징후",
        tone: "border-rose-200 bg-rose-50 text-rose-700",
      };
    case "rapid_drop":
    case "rapid_drop_alert":
      return {
        label: "급락",
        tone: "border-red-200 bg-red-50 text-red-700",
      };
    case "decline":
    case "sales_drop_alert":
    case "monthly_decline_alert":
    case "yoy_decline_alert":
    case "search_interest_down":
      return {
        label: "하락",
        tone: "border-amber-200 bg-amber-50 text-amber-700",
      };
    case "sales_rebound_alert":
      return {
        label: "반등",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "growth_overheat_alert":
    case "sales_overheat_alert":
      return {
        label: "과열",
        tone: "border-violet-200 bg-violet-50 text-violet-700",
      };
    case "high_risk_alert":
    case "risk":
      return {
        label: "위험",
        tone: "border-orange-200 bg-orange-50 text-orange-700",
      };
    default:
      return {
        label: text(signalType) || "시그널",
        tone: "border-slate-200 bg-slate-50 text-slate-700",
      };
  }
}

function revenueMeta(args: {
  salesChange30d: number | null;
  salesTrendStatus: string | null;
}) {
  const { salesChange30d, salesTrendStatus } = args;
  const trend = String(salesTrendStatus || "").trim().toLowerCase();

  if (salesChange30d != null) {
    if (salesChange30d <= -10) {
      return {
        label: `매출 ${salesChange30d.toFixed(1)}%`,
        tone: "border-rose-200 bg-rose-50 text-rose-700",
      };
    }
    if (salesChange30d < 0) {
      return {
        label: `매출 ${salesChange30d.toFixed(1)}%`,
        tone: "border-amber-200 bg-amber-50 text-amber-700",
      };
    }
    if (salesChange30d >= 10) {
      return {
        label: `매출 +${salesChange30d.toFixed(1)}%`,
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    }
    if (salesChange30d > 0) {
      return {
        label: `매출 +${salesChange30d.toFixed(1)}%`,
        tone: "border-lime-200 bg-lime-50 text-lime-700",
      };
    }
  }

  if (["sharp_drop", "drop"].includes(trend)) {
    return {
      label: "매출 하락",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (trend === "rebound") {
    return {
      label: "매출 반등",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (["rise", "sharp_rise"].includes(trend)) {
    return {
      label: "매출 상승",
      tone: "border-lime-200 bg-lime-50 text-lime-700",
    };
  }

  return {
    label: "매출 보합",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
  };
}

function buildImpactText(args: {
  riskScore: number | null;
  businessCount: number;
  closeRiskCount: number;
  salesChange30d: number | null;
  regionName: string;
  categoryName: string;
}) {
  const { riskScore, businessCount, closeRiskCount, salesChange30d, regionName, categoryName } = args;
  const segments: string[] = [];

  if (riskScore != null) {
    segments.push(`위험점수는 ${Math.round(riskScore)}점입니다.`);
  }

  if (businessCount > 0) {
    segments.push(`${regionName} ${categoryName} 표본 사업체는 ${businessCount.toLocaleString("ko-KR")}개입니다.`);
  }

  if (closeRiskCount > 0) {
    segments.push(`이 중 ${closeRiskCount.toLocaleString("ko-KR")}개가 고위험 또는 폐업 위험 구간으로 해석됩니다.`);
  }

  if (salesChange30d != null) {
    const direction = salesChange30d > 0 ? "증가" : salesChange30d < 0 ? "감소" : "보합";
    const magnitude = salesChange30d === 0 ? "0.0" : Math.abs(salesChange30d).toFixed(1);
    segments.push(`최근 30일 매출 흐름은 ${direction} (${magnitude}%)입니다.`);
  }

  return segments.length > 0
    ? segments.join(" ")
    : "영향도 데이터가 아직 충분하지 않아 추가 수집이 필요합니다.";
}

export function presentRiskSignal(row: RawRiskSignalRow): PresentedSignal {
  const root = asRecord(row);
  const meta = asRecord(root.metadata ?? root.meta ?? root.risk_signals ?? root.signal_meta);

  const signalType =
    text(
      pickFirst(root, ["signal_type", "signalType", "reason_code", "reasonCode"]),
      meta.signal_type,
      meta.reason_code,
    )?.toLowerCase() ?? "signal";

  const riskGrade = normalizeRiskGrade(
    text(pickFirst(root, ["risk_grade", "riskGrade", "grade"]), meta.risk_grade, meta.grade),
  );

  const signalMeta = signalTypeMeta(signalType);
  const gradeMeta = riskGradeMeta(riskGrade);

  const regionName = text(pickFirst(root, ["region_name", "regionName"]), meta.region_name) ?? "지역 미상";
  const categoryName =
    text(pickFirst(root, ["category_name", "categoryName", "category_l1"]), meta.category_name) ?? "업종 미상";

  const riskScore = num(
    pickFirst(root, ["risk_score", "riskScore", "score", "final_risk_score", "finalClosingRiskScore"]),
    meta.risk_score,
    meta.score,
  );

  const salesChange30d = num(
    root.sales_change_30d,
    root.salesChange30d,
    meta.sales_change_30d,
    meta.salesChange30d,
  );
  const salesTrendStatus = text(
    root.sales_trend_status,
    root.salesTrendStatus,
    meta.sales_trend_status,
    meta.salesTrendStatus,
  );
  const revenue = revenueMeta({ salesChange30d, salesTrendStatus });

  const title =
    text(
      pickFirst(root, ["signal_title", "title", "headline"]),
      meta.signal_title,
      meta.title,
    ) ?? `${regionName} ${categoryName} 위험 신호`;

  const summary =
    text(
      pickFirst(root, ["signal_summary", "summary", "description", "body"]),
      meta.signal_summary,
      meta.summary,
    ) ?? "상세 요약이 아직 없습니다.";

  const why =
    text(root.cause_summary, root.why, meta.why, meta.cause_summary, root.top_cause_1) ??
    summary;

  const action =
    text(
      root.recommended_action_now,
      root.recommended_action_week,
      root.recommended_action_watch,
      root.action,
      meta.action,
      meta.recommended_action_now,
    ) ?? "현재 신호 원인을 먼저 확인하고 사업장 개입으로 연결합니다.";

  const personalization =
    text(root.personalization, root.personalized_message, meta.personalization, meta.personalized_message) ??
    `${regionName} ${categoryName} 조합 기준으로 원인을 세분화해 모니터 인테이크로 넘기세요.`;

  const query = text(root.query, root.external_query, meta.query, meta.external_query);
  const keyword = text(root.keyword, root.primary_keyword, meta.keyword, meta.primary_keyword);
  const keywords = uniqueBy(
    [
      ...asArray(root.keywords),
      ...asArray(meta.keywords),
      query,
      keyword,
      regionName,
      categoryName,
    ]
      .map((value) => text(value))
      .filter((value): value is string => Boolean(value)),
    (value) => value.toLowerCase(),
  );

  const id =
    pickFirst<number | string>(root, ["id", "signal_id", "signalId"]) ??
    `${regionName}-${categoryName}-${signalType || "signal"}`;

  const businessCount = num(root.business_count, root.businessCount, meta.business_count, meta.businessCount) ?? 0;
  const closeRiskCount =
    num(root.close_risk_count, root.closeRiskCount, meta.close_risk_count, meta.closeRiskCount) ?? 0;

  const scoreDate = text(root.score_date, root.scoreDate, meta.score_date, meta.scoreDate);
  const signalDate = text(root.signal_date, root.signalDate, meta.signal_date, meta.signalDate);
  const createdAt = text(root.created_at, root.createdAt, root.updated_at, root.updatedAt);
  const source = text(root.source, root.source_type, meta.source, meta.source_type);
  const reason = text(root.reason, root.reason_code, meta.reason, meta.reason_code, signalType);
  const stage = text(root.stage, root.risk_stage, meta.stage, meta.risk_stage);
  const personalPriorityLabel = text(
    root.personal_priority_label,
    root.personalPriorityLabel,
    meta.personal_priority_label,
  );

  return {
    id,
    regionCode: text(pickFirst(root, ["region_code", "regionCode"]), meta.region_code) ?? "",
    regionName,
    categoryId:
      pickFirst<number | string>(root, ["category_id", "categoryId"]) ?? text(meta.category_id) ?? null,
    categoryName,
    signalType,
    signalTypeLabel: signalMeta.label,
    signalTypeTone: signalMeta.tone,
    riskGrade,
    riskGradeLabel: gradeMeta.label,
    riskGradeTone: gradeMeta.tone,
    riskScore,
    score: riskScore != null ? Math.round(riskScore) : null,
    title,
    summary,
    why,
    action,
    personalization,
    impactText: buildImpactText({
      riskScore,
      businessCount,
      closeRiskCount,
      salesChange30d,
      regionName,
      categoryName,
    }),
    revenueLabel: revenue.label,
    revenueTone: revenue.tone,
    businessCount,
    closeRiskCount,
    scoreDate,
    signalDate,
    createdAt,
    source,
    query,
    keyword,
    keywords,
    reason,
    stage,
    communityType: "story",
    grade: riskGrade,
    personal_priority_label: personalPriorityLabel,
  };
}

export function buildCommunityWriteHref(signalLike: Partial<PresentedSignal> & UnknownRecord) {
  const regionName = text(signalLike.regionName, signalLike.region_name);
  const categoryName = text(signalLike.categoryName, signalLike.category_name, signalLike.category_l1);
  const title = text(signalLike.title, signalLike.signal_title) ?? "리스크 시그널 관련 질문";
  const summary = text(signalLike.summary, signalLike.signal_summary, signalLike.description);
  const action = text(signalLike.action, signalLike.recommended_action_now);
  const why = text(signalLike.why, signalLike.cause_summary, signalLike.reason);
  const personalization = text(signalLike.personalization, signalLike.personalized_message);
  const query =
    text(signalLike.query, signalLike.keyword) ?? [regionName, categoryName].filter(Boolean).join(" ");

  return buildCommunityComposeHref({
    type: "story",
    regionCode: text(signalLike.regionCode, signalLike.region_code),
    regionName,
    industryCategory: categoryName,
    categoryId: text(signalLike.categoryId, signalLike.category_id),
    signalId: text(signalLike.id, signalLike.signal_id),
    signalType: text(signalLike.signalType, signalLike.signal_type, signalLike.reason),
    signalTitle: title,
    signalSummary: summary,
    recommendedAction: action,
    why,
    personalizedMessage: personalization,
    title: regionName && categoryName ? `[${regionName} · ${categoryName}] ${title}` : title,
    content: summary,
    externalQuery: query,
    keyword: text(signalLike.keyword),
    keywords: asArray<string>(signalLike.keywords),
    query,
    stage: text(signalLike.stage),
    source: text(signalLike.source),
    reason: text(signalLike.reason),
  });
}

function reasonTitleFromCode(code: string | null) {
  switch ((code ?? "").toLowerCase()) {
    case "search_interest_down":
      return "검색 관심도 하락";
    case "place_presence_weak":
      return "지도 노출 약화";
    case "competition_dense":
      return "상권 경쟁 과밀";
    case "business_closed":
      return "사업 상태 재확인";
    case "business_suspended":
      return "휴업 상태 해소 확인";
    case "community_distress_high":
      return "현장 distress 완화";
    case "community_distress_mid":
      return "현장 distress 관리";
    case "structural_recovery_low":
      return "구조 회복 가능성 낮음";
    case "last_chance_window":
      return "마지막 개입 구간 진입";
    default:
      return "핵심 신호 변화 확인";
  }
}

function reasonDescriptionFromCode(code: string | null) {
  switch ((code ?? "").toLowerCase()) {
    case "search_interest_down":
      return "최근 검색 추세가 하락에서 멈추거나 반등하면 개선으로 봅니다.";
    case "place_presence_weak":
      return "카카오/네이버 노출 정보와 매장 기본 정보 정합성이 확인되면 개선으로 봅니다.";
    case "competition_dense":
      return "반경 경쟁점 대비 가격, 메뉴, 대표 상품, 차별 포인트 정리가 완료되면 개선으로 봅니다.";
    case "business_closed":
      return "국세청 상태와 실제 영업 상태를 다시 확인합니다.";
    case "business_suspended":
      return "휴업 사유 해소와 정상 영업 여부를 다시 확인합니다.";
    case "community_distress_high":
      return "커뮤니티 내 강한 부정 신호가 완화되면 개선으로 봅니다.";
    case "community_distress_mid":
      return "커뮤니티 내 중간 수준의 distress 신호가 줄어들면 개선으로 봅니다.";
    case "structural_recovery_low":
      return "노출 개선 외에 운영 구조 조정 여부를 함께 봐야 합니다.";
    default:
      return "핵심 원인 신호가 약화되거나 액션 결과가 확인되면 개선으로 봅니다.";
  }
}

function normalizeReasonRow(row: UnknownRecord, index: number): PresentedReason {
  const code = text(row.reason_code, row.reasonCode, row.code);

  return {
    id: text(row.id) ?? `reason-${index}`,
    title:
      text(row.title, row.reason_title, row.reasonTitle, row.label, row.name) ??
      reasonTitleFromCode(code),
    description:
      text(
        row.detail,
        row.description,
        row.summary,
        row.message,
        row.reason_description,
        row.reasonDescription,
      ) ?? reasonDescriptionFromCode(code),
    weight: num(row.weight, row.score_weight, row.scoreWeight),
    code,
    layerLabel:
      text(
        row.layer_label,
        row.layerLabel,
        row.layer,
        row.scope_label,
        row.scopeLabel,
        row.scope,
      ) ?? "사업장",
  };
}

function normalizeActionRow(row: UnknownRecord, index: number): PresentedAction {
  const targetDays = num(row.due_in_days, row.target_days, row.targetDays);

  return {
    id: text(row.id, row.action_id, row.actionId),
    key: text(row.id, row.action_id, row.actionId) ?? `action-${index}`,
    title:
      text(
        row.title,
        row.action_title,
        row.actionTitle,
        row.name,
        row.playbook_title,
        row.playbookTitle,
      ) ?? `액션 ${index + 1}`,
    description:
      text(
        row.description,
        row.summary,
        row.message,
        row.action_description,
        row.actionDescription,
      ) ?? "",
    priority: num(row.priority) ?? text(row.priority_label, row.priorityLabel),
    etaLabel:
      text(row.eta_label, row.etaLabel, row.due_in_label, row.dueInLabel) ??
      (targetDays != null ? `${targetDays}일 내` : null),
    playbookCode: text(row.playbook_code, row.playbookCode, row.code),
    status: text(row.status, row.action_status, row.actionStatus),
    evidenceNeeded: asArray(row.evidence_needed ?? row.evidenceNeeded),
    successCriteria: asArray(row.success_criteria ?? row.successCriteria),
  };
}

function normalizeEvidenceItem(item: unknown, index: number, fallbackTitle: string): PresentedEvidence {
  const row = asRecord(item);

  return {
    id: text(row.id, row.code, row.title) ?? `evidence-${index}`,
    title: text(row.title, row.label, row.name, row.metric) ?? fallbackTitle,
    description: text(row.description, row.summary, row.message, row.value) ?? "",
    sourceLabel: text(row.source_label, row.sourceLabel, row.source) ?? "확인 자료",
  };
}

function normalizeCriterionItem(item: unknown, index: number, fallbackTitle: string): PresentedCriterion {
  const row = asRecord(item);

  return {
    id: text(row.id, row.title, row.label) ?? `criterion-${index}`,
    title: text(row.title, row.label, row.name) ?? fallbackTitle,
    description: text(row.description, row.summary, row.message, row.target) ?? "",
  };
}

function buildEvidenceItems(actionRows: UnknownRecord[]) {
  const items = actionRows.flatMap((row, actionIndex) => {
    const actionTitle =
      text(row.title, row.action_title, row.actionTitle, row.name, row.playbook_title) ??
      `액션 ${actionIndex + 1}`;

    const evidenceItems = asArray(row.evidence_needed ?? row.evidenceNeeded);

    if (evidenceItems.length === 0) {
      return [];
    }

    return evidenceItems.map((item, evidenceIndex) => {
      const normalized = normalizeEvidenceItem(item, evidenceIndex, `${actionTitle} 확인 자료`);

      return {
        id: normalized.id,
        title: normalized.title,
        description: normalized.description || `${actionTitle} 액션의 확인 자료입니다.`,
        sourceLabel: normalized.sourceLabel || "액션 준비물",
      };
    });
  });

  return uniqueBy(items, (item) => item.title);
}

function buildSuccessCriteria(reasonRows: UnknownRecord[], actionRows: UnknownRecord[]) {
  const fromActions = actionRows.flatMap((row, actionIndex) => {
    const title =
      text(row.title, row.action_title, row.actionTitle, row.name, row.playbook_title) ??
      `액션 ${actionIndex + 1}`;

    const criteriaItems = asArray(row.success_criteria ?? row.successCriteria);

    return criteriaItems.map((item, criterionIndex) =>
      normalizeCriterionItem(item, criterionIndex, `${title} 성공기준`),
    );
  });

  if (fromActions.length > 0) {
    return uniqueBy(fromActions, (item) => item.title);
  }

  const fromReasons = reasonRows.map((row, index) => {
    const code = text(row.reason_code, row.reasonCode, row.code);

    return {
      id: `${code ?? "criterion"}-${index}`,
      title: reasonTitleFromCode(code),
      description: reasonDescriptionFromCode(code),
    };
  });

  return uniqueBy(fromReasons, (item) => item.title).slice(0, 6);
}

function stageFromScores(finalClosingRiskScore: number | null) {
  if (finalClosingRiskScore == null) return "observe";
  if (finalClosingRiskScore >= 80) return "last_chance";
  if (finalClosingRiskScore >= 60) return "urgent";
  if (finalClosingRiskScore >= 35) return "caution";
  return "observe";
}

function buildLastChanceCard(args: {
  monitor: UnknownRecord;
  latestSnapshot: UnknownRecord | null;
  previousSnapshot: UnknownRecord | null;
  reasonRows: UnknownRecord[];
  actionRows: UnknownRecord[];
  latestOutcome: UnknownRecord | null;
  viewRow: UnknownRecord | null;
}): PresentedLastChanceCard {
  const { monitor, latestSnapshot, previousSnapshot, reasonRows, actionRows, latestOutcome, viewRow } = args;

  const topReasonsFromView = asArray(viewRow?.top_reasons ?? viewRow?.topReasons);
  const topActionsFromView = asArray(viewRow?.top_actions ?? viewRow?.topActions);

  const normalizedReasons =
    topReasonsFromView.length > 0
      ? topReasonsFromView.map((item, index) => normalizeReasonRow(asRecord(item), index))
      : reasonRows.map((row, index) => normalizeReasonRow(row, index));

  const normalizedActions =
    topActionsFromView.length > 0
      ? topActionsFromView.map((item, index) => normalizeActionRow(asRecord(item), index))
      : actionRows.map((row, index) => normalizeActionRow(row, index));

  const evidence = buildEvidenceItems(
    topActionsFromView.length > 0 ? topActionsFromView.map((item) => asRecord(item)) : actionRows,
  );

  const successCriteria = buildSuccessCriteria(
    topReasonsFromView.length > 0 ? topReasonsFromView.map((item) => asRecord(item)) : reasonRows,
    topActionsFromView.length > 0 ? topActionsFromView.map((item) => asRecord(item)) : actionRows,
  );

  const latestClosingRisk = num(
    viewRow?.final_closing_risk_score,
    viewRow?.closing_risk_score,
    latestSnapshot?.final_closing_risk_score,
    latestSnapshot?.closing_risk_score,
    latestSnapshot?.risk_score,
    monitor.latest_closing_risk_score,
  );

  const previousClosingRisk = num(
    previousSnapshot?.final_closing_risk_score,
    previousSnapshot?.closing_risk_score,
  );

  const latestRecoverability = num(
    viewRow?.recoverability_score,
    viewRow?.rescue_chance_score,
    latestSnapshot?.recoverability_score,
    latestSnapshot?.rescue_chance_score,
    latestSnapshot?.structural_recoverability_score,
    monitor.latest_rescue_chance_score,
  );

  const previousRecoverability = num(
    previousSnapshot?.recoverability_score,
    previousSnapshot?.rescue_chance_score,
    previousSnapshot?.structural_recoverability_score,
  );

  const stage = normalizeStage(
    text(viewRow?.stage, latestSnapshot?.stage, latestSnapshot?.risk_stage, monitor.latest_stage) ??
      stageFromScores(latestClosingRisk),
  );

  const whySummary =
    text(viewRow?.why_summary, viewRow?.whySummary, latestSnapshot?.why_summary, latestSnapshot?.whySummary) ??
    (normalizedReasons.length > 0 ? normalizedReasons.slice(0, 3).map((item) => item.title).join(" · ") : null);

  const actionSummary =
    text(
      viewRow?.action_summary,
      viewRow?.actionSummary,
      latestSnapshot?.action_summary,
      latestSnapshot?.actionSummary,
    ) ??
    (normalizedActions.length > 0 ? normalizedActions.slice(0, 3).map((item) => item.title).join(" · ") : null);

  return {
    id: text(viewRow?.id, latestSnapshot?.id),
    monitorId: num(viewRow?.monitor_id, latestSnapshot?.monitor_id, monitor.id),
    businessName:
      text(viewRow?.business_name, monitor.business_name, latestSnapshot?.business_name, monitor.name) ??
      "이름 없는 모니터",
    address: text(viewRow?.address, monitor.address, monitor.road_address, monitor.roadAddress),
    regionName: text(viewRow?.region_name, monitor.region_name, latestSnapshot?.region_name),
    categoryName: text(viewRow?.category_name, monitor.category_name, latestSnapshot?.category_name),
    snapshotDate: text(viewRow?.snapshot_date, latestSnapshot?.snapshot_date),
    stage,
    marketRiskScore: num(
      viewRow?.market_risk_score,
      latestSnapshot?.market_risk_score,
      monitor.latest_market_risk_score,
    ),
    businessRiskScore: num(
      viewRow?.business_risk_score,
      latestSnapshot?.business_risk_score,
      monitor.latest_business_risk_score,
    ),
    recoverabilityScore: latestRecoverability,
    finalClosingRiskScore: latestClosingRisk,
    whySummary,
    actionSummary,
    nextReviewAt: text(viewRow?.next_review_at, viewRow?.nextReviewAt, latestSnapshot?.next_review_at),
    reasons: normalizedReasons,
    actions: normalizedActions,
    evidence,
    successCriteria,
    reevaluation: {
      nextReviewAt: text(viewRow?.next_review_at, latestSnapshot?.next_review_at),
      totalRiskDelta:
        latestClosingRisk != null && previousClosingRisk != null
          ? latestClosingRisk - previousClosingRisk
          : null,
      recoverabilityDelta:
        latestRecoverability != null && previousRecoverability != null
          ? latestRecoverability - previousRecoverability
          : null,
      latestResultStatus: text(latestOutcome?.outcome_status, latestOutcome?.status),
      latestResultText: text(latestOutcome?.note, latestOutcome?.summary, latestOutcome?.description),
    },
  };
}

function normalizePresentedLastChanceCard(root: UnknownRecord): PresentedLastChanceCard {
  const card = asRecord(root.lastChanceCard ?? root.last_chance_card ?? root.card ?? root);
  const monitor = asRecord(root.monitor);
  const latestSnapshot = asRecord(root.latestSnapshot ?? root.latest_snapshot);
  const previousSnapshot = asRecord(root.previousSnapshot ?? root.previous_snapshot);
  const latestOutcome = asRecord(root.latestOutcome ?? root.latest_outcome);

  return buildLastChanceCard({
    monitor: card.monitorId || card.businessName ? { ...monitor, ...card } : monitor,
    latestSnapshot: { ...latestSnapshot, ...card },
    previousSnapshot,
    reasonRows: asArray(card.reasons).map((item) => asRecord(item)),
    actionRows: asArray(card.actions).map((item) => asRecord(item)),
    latestOutcome,
    viewRow: card,
  });
}

export function presentLastChanceCard(input: unknown): PresentedLastChanceCard {
  const root = asRecord(input);

  if (root.monitor || root.latestSnapshot || root.lastChanceCard || root.last_chance_card) {
    return normalizePresentedLastChanceCard(root);
  }

  return buildLastChanceCard({
    monitor: asRecord(root.monitor),
    latestSnapshot: asRecord(root.latestSnapshot ?? root.latest_snapshot ?? root.latestSnapshot),
    previousSnapshot: asRecord(root.previousSnapshot ?? root.previous_snapshot),
    reasonRows: asArray(root.reasonRows ?? root.reason_rows).map((item) => asRecord(item)),
    actionRows: asArray(root.actionRows ?? root.action_rows).map((item) => asRecord(item)),
    latestOutcome: asRecord(root.latestOutcome ?? root.latest_outcome),
    viewRow: asRecord(root.viewRow ?? root.view_row),
  });
}

export function formatScore(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${Math.round(value)}`;
}

export function formatDelta(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  if (value > 0) return `+${value.toFixed(1)}`;
  if (value < 0) return value.toFixed(1);
  return "0.0";
}

export function formatDateLabel(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function scoreTone(label: string) {
  const raw = String(label || "").toLowerCase();

  if (raw.includes("시장")) return "from-sky-50 to-white";
  if (raw.includes("사업장")) return "from-amber-50 to-white";
  if (raw.includes("구조")) return "from-emerald-50 to-white";
  if (raw.includes("폐업") || raw.includes("closing")) return "from-rose-50 to-white";
  return "from-slate-50 to-white";
}

export function statusTone(value?: string | null) {
  const raw = String(value || "").trim().toLowerCase();

  if (["completed", "done", "improved", "closed", "accepted"].some((key) => raw.includes(key))) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["dismissed", "failed", "worsened", "error", "canceled"].some((key) => raw.includes(key))) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (["recommended", "todo", "flat", "unknown", "pending"].some((key) => raw.includes(key))) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function stageMeta(stage?: string | null) {
  const value = normalizeStage(stage ?? null);

  switch (value) {
    case "critical":
    case "last_chance":
      return {
        label: "마지막 기회",
        tone: "border-rose-200 bg-rose-50 text-rose-700",
        panelTone:
          "border-rose-200 bg-[radial-gradient(circle_at_top_left,rgba(254,226,226,0.86),transparent_36%),linear-gradient(to_bottom,#ffffff,#fff5f5)]",
      };
    case "urgent":
      return {
        label: "긴급",
        tone: "border-amber-200 bg-amber-50 text-amber-700",
        panelTone:
          "border-amber-200 bg-[radial-gradient(circle_at_top_left,rgba(254,243,199,0.86),transparent_36%),linear-gradient(to_bottom,#ffffff,#fffbeb)]",
      };
    case "caution":
      return {
        label: "주의",
        tone: "border-orange-200 bg-orange-50 text-orange-700",
        panelTone:
          "border-orange-200 bg-[radial-gradient(circle_at_top_left,rgba(255,237,213,0.86),transparent_36%),linear-gradient(to_bottom,#ffffff,#fff7ed)]",
      };
    case "stable":
      return {
        label: "안정",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
        panelTone:
          "border-emerald-200 bg-[radial-gradient(circle_at_top_left,rgba(220,252,231,0.86),transparent_36%),linear-gradient(to_bottom,#ffffff,#f7fff9)]",
      };
    case "observe":
    default:
      return {
        label: "관찰",
        tone: "border-slate-200 bg-slate-50 text-slate-700",
        panelTone:
          "border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(241,245,249,0.86),transparent_36%),linear-gradient(to_bottom,#ffffff,#f8fafc)]",
      };
  }
}