import {
  ClosingIntelInput,
  ClosingIntelScoreResult,
  RiskAction,
  RiskReason,
} from "./type";
import { normalizeNtsStatus } from "./nts";
import { analyzeTrendSlope } from "./naver-datalab";

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function pushReason(
  reasons: RiskReason[],
  reason: RiskReason,
) {
  if (!reasons.some((item) => item.code === reason.code)) {
    reasons.push(reason);
  }
}

function pushAction(
  actions: RiskAction[],
  action: RiskAction,
) {
  if (!actions.some((item) => item.title === action.title)) {
    actions.push(action);
  }
}

function trendDeltaFromInput(input: ClosingIntelInput) {
  const explicitDelta = num(
    (input as Record<string, unknown>).trendDeltaPct,
    (input as Record<string, unknown>).searchTrendDeltaPct,
  );

  if (explicitDelta != null) return explicitDelta;

  const trendData = asArray((input as Record<string, unknown>).trendData);
  if (trendData.length > 0) {
    return analyzeTrendSlope(
      trendData as Array<{ period?: string; ratio?: number | string | null }>,
    ).deltaPct;
  }

  return null;
}

function businessStateScore(input: ClosingIntelInput) {
  let score = 0;
  const reasons: RiskReason[] = [];
  const actions: RiskAction[] = [];

  const ntsNormalized = normalizeNtsStatus(input.nts);

  if (ntsNormalized === "closed") {
    score += 90;
    pushReason(reasons, {
      code: "business_closed",
      title: "사업자 상태가 폐업으로 확인됨",
      description: "국세청 사업자 상태 기준 폐업으로 확인되었습니다.",
      weight: 90,
      layerLabel: "사업장",
      sourceType: "nts",
    });

    pushAction(actions, {
      title: "폐업 여부 재확인",
      description: "국세청 상태와 실제 영업 상태가 일치하는지 먼저 확인합니다.",
      priority: 1,
      targetDays: 1,
      playbookCode: "VERIFY_CLOSED_STATUS",
      status: "recommended",
      evidenceNeeded: ["국세청 상태 조회 결과", "현장 영업 여부 확인"],
      successCriteria: [
        {
          title: "실제 영업 여부 확인",
          description: "폐업 또는 운영 여부를 명확히 확인하면 다음 단계로 진행합니다.",
        },
      ],
    });
  } else if (ntsNormalized === "suspended") {
    score += 55;
    pushReason(reasons, {
      code: "business_suspended",
      title: "사업자 상태가 휴업으로 확인됨",
      description: "휴업 상태가 확인되어 정상 영업 여부 재확인이 필요합니다.",
      weight: 55,
      layerLabel: "사업장",
      sourceType: "nts",
    });

    pushAction(actions, {
      title: "휴업 해소 여부 확인",
      description: "휴업 사유와 영업 재개 가능성을 먼저 점검합니다.",
      priority: 1,
      targetDays: 3,
      playbookCode: "VERIFY_SUSPENDED_STATUS",
      status: "recommended",
      evidenceNeeded: ["휴업 상태 조회 결과", "영업 재개 일정"],
      successCriteria: [
        {
          title: "정상 영업 계획 확인",
          description: "재개 일정이나 현재 운영 여부가 확인되면 개선으로 봅니다.",
        },
      ],
    });
  }

  return {
    score,
    reasons,
    actions,
  };
}

function trendScore(input: ClosingIntelInput) {
  let score = 0;
  const reasons: RiskReason[] = [];
  const actions: RiskAction[] = [];

  const deltaPct = trendDeltaFromInput(input);

  if (deltaPct == null) {
    return { score, reasons, actions };
  }

  if (deltaPct <= -20) {
    score += 35;
    pushReason(reasons, {
      code: "search_interest_down",
      title: "검색 관심도 급락",
      description: `최근 검색 추세가 ${deltaPct.toFixed(1)}% 하락했습니다.`,
      weight: 35,
      layerLabel: "시장",
      sourceType: "naver_datalab",
    });

    pushAction(actions, {
      title: "검색 수요 반등 액션 실행",
      description: "대표 키워드와 지역+업종 키워드의 반등 여부를 점검합니다.",
      priority: 1,
      targetDays: 7,
      playbookCode: "SEARCH_TREND_RECOVERY",
      status: "recommended",
      evidenceNeeded: ["대표 키워드 추세", "지역+업종 키워드 추세"],
      successCriteria: [
        {
          title: "하락폭 축소",
          description: "최근 4주 기준 하락폭이 줄거나 반등하면 개선으로 봅니다.",
        },
      ],
    });
  } else if (deltaPct <= -10) {
    score += 22;
    pushReason(reasons, {
      code: "search_interest_down",
      title: "검색 관심도 하락",
      description: `최근 검색 추세가 ${deltaPct.toFixed(1)}% 하락했습니다.`,
      weight: 22,
      layerLabel: "시장",
      sourceType: "naver_datalab",
    });

    pushAction(actions, {
      title: "검색 추세 재점검",
      description: "대표 키워드와 브랜드 키워드를 나눠 반응을 확인합니다.",
      priority: 2,
      targetDays: 7,
      playbookCode: "SEARCH_TREND_CHECK",
      status: "recommended",
      evidenceNeeded: ["브랜드 키워드", "지역+업종 키워드"],
      successCriteria: [
        {
          title: "추세 안정화",
          description: "하락 추세가 멈추거나 안정화되면 개선으로 봅니다.",
        },
      ],
    });
  }

  return {
    score,
    reasons,
    actions,
  };
}

function placeScore(input: ClosingIntelInput) {
  let score = 0;
  const reasons: RiskReason[] = [];
  const actions: RiskAction[] = [];

  const place = (input as Record<string, unknown>).place as Record<string, unknown> | undefined;
  const kakao = (input as Record<string, unknown>).kakao as Record<string, unknown> | undefined;
  const naverPlace = (input as Record<string, unknown>).naverPlace as Record<string, unknown> | undefined;

  const missingName =
    !text(place?.name, kakao?.name, naverPlace?.name) &&
    !text(place?.place_name, kakao?.place_name, naverPlace?.title);

  const missingAddress =
    !text(place?.address, place?.road_address, kakao?.address_name, kakao?.road_address_name, naverPlace?.address);

  const missingPhone =
    !text(place?.phone, kakao?.phone, naverPlace?.phone);

  const missingCount = [missingName, missingAddress, missingPhone].filter(Boolean).length;

  if (missingCount >= 2) {
    score += 28;
    pushReason(reasons, {
      code: "place_presence_weak",
      title: "플레이스 기본 정보 약함",
      description: "상호, 주소, 전화번호 등 기본 노출 정보가 불완전합니다.",
      weight: 28,
      layerLabel: "사업장",
      sourceType: "place",
    });

    pushAction(actions, {
      title: "플레이스 정합성 수정",
      description: "상호명, 주소, 전화번호, 영업시간 등 핵심 필드를 정리합니다.",
      priority: 1,
      targetDays: 3,
      playbookCode: "PLACE_PRESENCE_FIX",
      status: "recommended",
      evidenceNeeded: ["카카오 플레이스", "네이버 플레이스", "수정 반영 캡처"],
      successCriteria: [
        {
          title: "기본 정보 일치",
          description: "카카오/네이버/내부 정보가 일치하면 개선으로 봅니다.",
        },
      ],
    });
  }

  return {
    score,
    reasons,
    actions,
  };
}

function competitionScore(input: ClosingIntelInput) {
  let score = 0;
  const reasons: RiskReason[] = [];
  const actions: RiskAction[] = [];

  const nearbyCompetitorCount = num(
    (input as Record<string, unknown>).nearbyCompetitorCount,
    (input as Record<string, unknown>).competitorCount,
  );

  if (nearbyCompetitorCount != null && nearbyCompetitorCount >= 10) {
    score += 18;

    pushReason(reasons, {
      code: "competition_dense",
      title: "경쟁 밀집 구간",
      description: `주변 경쟁점이 ${nearbyCompetitorCount}개 이상으로 확인됩니다.`,
      weight: 18,
      layerLabel: "사업장",
      sourceType: "competition",
    });

    pushAction(actions, {
      title: "경쟁 대응 포지셔닝 조정",
      description: "대표 상품, 가격, 차별 포인트를 경쟁점 기준으로 다시 정리합니다.",
      priority: 2,
      targetDays: 10,
      playbookCode: "COMPETITOR_REPOSITION",
      status: "recommended",
      evidenceNeeded: ["근처 경쟁점 리스트", "가격/상품 비교표"],
      successCriteria: [
        {
          title: "차별 포인트 명확화",
          description: "경쟁점과 구분되는 핵심 메시지가 정리되면 개선으로 봅니다.",
        },
      ],
    });
  }

  return {
    score,
    reasons,
    actions,
  };
}

function recoverabilityScore(input: ClosingIntelInput) {
  let score = 0;
  const reasons: RiskReason[] = [];
  const actions: RiskAction[] = [];

  const recoverability = num(
    (input as Record<string, unknown>).recoverabilityScore,
    (input as Record<string, unknown>).rescueChanceScore,
  );

  if (recoverability != null && recoverability <= 40) {
    score += 22;

    pushReason(reasons, {
      code: "structural_recovery_low",
      title: "구조 회복 가능성 낮음",
      description: "단기 노출 개선만으로 회복되기 어려운 상태로 보입니다.",
      weight: 22,
      layerLabel: "구조",
      sourceType: "recoverability",
    });

    pushAction(actions, {
      title: "운영 구조 점검",
      description: "운영 시간, 상품 구성, 비용 구조, 반복 방문 장치를 점검합니다.",
      priority: 3,
      targetDays: 14,
      playbookCode: "STRUCTURE_RECOVERY_CHECK",
      status: "recommended",
      evidenceNeeded: ["운영 구조 메모", "비용/상품 점검표"],
      successCriteria: [
        {
          title: "구조 조정안 확보",
          description: "실행 가능한 구조 조정안이 1개 이상 정리되면 개선으로 봅니다.",
        },
      ],
    });
  }

  return {
    score,
    reasons,
    actions,
  };
}

export function scoreClosingIntel(input: ClosingIntelInput): ClosingIntelScoreResult {
  const marketReasons: RiskReason[] = [];
  const businessReasons: RiskReason[] = [];
  const structureReasons: RiskReason[] = [];

  const allActions: RiskAction[] = [];

  const businessState = businessStateScore(input);
  const trend = trendScore(input);
  const place = placeScore(input);
  const competition = competitionScore(input);
  const recoverability = recoverabilityScore(input);

  marketReasons.push(...trend.reasons);
  businessReasons.push(...businessState.reasons, ...place.reasons, ...competition.reasons);
  structureReasons.push(...recoverability.reasons);

  for (const action of [
    ...businessState.actions,
    ...trend.actions,
    ...place.actions,
    ...competition.actions,
    ...recoverability.actions,
  ]) {
    pushAction(allActions, action);
  }

  const marketRiskScore = clampScore(trend.score);
  const businessRiskScore = clampScore(
    businessState.score + place.score + competition.score,
  );

  const recoverabilityInput = num(
    (input as Record<string, unknown>).recoverabilityScore,
    (input as Record<string, unknown>).rescueChanceScore,
  );

  const structuralRecoverabilityScore =
    recoverabilityInput != null
      ? clampScore(recoverabilityInput)
      : clampScore(100 - recoverability.score * 2);

  const finalClosingRiskScore = clampScore(
    marketRiskScore * 0.35 +
      businessRiskScore * 0.45 +
      (100 - structuralRecoverabilityScore) * 0.2,
  );

  const reasons = [...marketReasons, ...businessReasons, ...structureReasons]
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, 6);

  const whySummary =
    reasons.length > 0
      ? reasons
          .slice(0, 3)
          .map((item) => item.title)
          .join(" · ")
      : "핵심 원인 요약이 없습니다.";

  const actionSummary =
    allActions.length > 0
      ? allActions
          .slice(0, 3)
          .map((item) => item.title)
          .join(" · ")
      : "권장 액션이 없습니다.";

  const grade =
    finalClosingRiskScore >= 80
      ? "critical"
      : finalClosingRiskScore >= 55
        ? "caution"
        : "stable";

  return {
    marketRiskScore,
    businessRiskScore,
    structuralRecoverabilityScore,
    finalClosingRiskScore,
    riskScore: finalClosingRiskScore,
    grade,
    reasons,
    actions: allActions.slice(0, 6),
    whySummary,
    actionSummary,
  };
}