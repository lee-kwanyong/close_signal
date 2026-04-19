import {
  normalizeReason,
  priorityBySeverity,
  reviewDaysBySeverity,
  type RawReasonInput,
} from "@/lib/monitors/reason-taxonomy";

export type RecommendedActionDraft = {
  playbookCode: string;
  title: string;
  description: string;
  priority: number;
  dueInDays: number;
  status: "recommended";
  evidenceNeeded: string[];
  successCriteria: string[];
  sourceReasonCodes: string[];
};

const PLAYBOOK_META: Record<
  string,
  { title: string; description: string }
> = {
  record_and_verify_closure: {
    title: "폐업 상태 기록 및 사실 확정",
    description: "행정상 폐업 여부와 시점을 확정하고 후속 조치를 분기합니다.",
  },
  suspension_recovery_check: {
    title: "휴업 원인 확인 및 재개 가능성 점검",
    description: "휴업이 일시적인지, 장기화되는지 확인하고 재개 가능성을 판정합니다.",
  },
  offer_and_channel_fix: {
    title: "주력 상품·채널 긴급 보정",
    description: "매출 하락 원인을 빠르게 확인하고 주력 상품, 채널, 가격 제안을 조정합니다.",
  },
  cost_and_capacity_reset: {
    title: "비용 구조 및 운영 여력 재설계",
    description: "축소 압력의 원인을 비용·운영 측면에서 정리하고 유지 가능한 구조로 재설계합니다.",
  },
  last_chance_intervention: {
    title: "마지막 기회 개입안 실행",
    description: "유지 여부 결정을 미루지 않고 짧은 주기로 개입과 재평가를 돌립니다.",
  },
  listing_and_presence_repair: {
    title: "지도/플레이스 노출 복구",
    description: "기본 정보, 사진, 리뷰, 카테고리를 정비해 직접 노출을 복구합니다.",
  },
  demand_reactivation: {
    title: "수요 재활성화 실험",
    description: "검색 관심도 저하를 회복할 수 있도록 키워드·콘텐츠·제안 실험을 시작합니다.",
  },
  positioning_reset: {
    title: "경쟁 회피형 포지셔닝 재정의",
    description: "과밀 경쟁을 정면으로 받지 않도록 차별 포인트와 집중 영역을 다시 잡습니다.",
  },
  market_exposure_reduce: {
    title: "시장 의존도 축소",
    description: "하락 중인 지역·업종 의존도를 낮추고 대체 채널을 검토합니다.",
  },
  market_watch_and_selective_push: {
    title: "시장 하락 감시 + 선별 집중",
    description: "하락 강도가 높은 구간을 피하고 탄력 있는 상품/시간대에 집중합니다.",
  },
  community_reputation_repair: {
    title: "커뮤니티 평판 회복",
    description: "반복되는 불만과 부정 언급을 묶어서 응대 기준과 개선안을 실행합니다.",
  },
  selective_defense: {
    title: "과열 구간 선택적 방어",
    description: "무리한 확장보다 방어 가능한 영역에 선택적으로 자원을 배분합니다.",
  },
  manual_triage: {
    title: "추가 검증 및 수동 트리아지",
    description: "신호가 부족한 상태이므로 외부 검증과 현장 확인으로 원인을 먼저 확정합니다.",
  },
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function buildRecommendedActionsFromReasons(
  rawReasons: RawReasonInput[],
): RecommendedActionDraft[] {
  const normalized = rawReasons.map(normalizeReason);

  const grouped = new Map<string, RecommendedActionDraft>();

  for (const reason of normalized) {
    const meta = PLAYBOOK_META[reason.playbookCode] ?? {
      title: reason.title,
      description: reason.detail || reason.title,
    };

    const existing = grouped.get(reason.playbookCode);

    if (!existing) {
      grouped.set(reason.playbookCode, {
        playbookCode: reason.playbookCode,
        title: meta.title,
        description: meta.description,
        priority: priorityBySeverity(reason.severity),
        dueInDays: reviewDaysBySeverity(reason.severity),
        status: "recommended",
        evidenceNeeded: [...reason.evidenceNeeded],
        successCriteria: [...reason.successCriteria],
        sourceReasonCodes: [reason.canonicalCode],
      });
      continue;
    }

    existing.priority = Math.min(existing.priority, priorityBySeverity(reason.severity));
    existing.dueInDays = Math.min(existing.dueInDays, reviewDaysBySeverity(reason.severity));
    existing.evidenceNeeded = uniqueStrings([
      ...existing.evidenceNeeded,
      ...reason.evidenceNeeded,
    ]);
    existing.successCriteria = uniqueStrings([
      ...existing.successCriteria,
      ...reason.successCriteria,
    ]);
    existing.sourceReasonCodes = uniqueStrings([
      ...existing.sourceReasonCodes,
      reason.canonicalCode,
    ]);
  }

  return Array.from(grouped.values()).sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.dueInDays !== b.dueInDays) return a.dueInDays - b.dueInDays;
    return a.title.localeCompare(b.title, "ko");
  });
}

export function summarizeWhy(rawReasons: RawReasonInput[]) {
  const top = rawReasons
    .map(normalizeReason)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((reason) => reason.title);

  return top.length > 0 ? top.join(" · ") : "주요 원인 미정";
}

export function summarizeAction(rawReasons: RawReasonInput[]) {
  const actions = buildRecommendedActionsFromReasons(rawReasons)
    .slice(0, 2)
    .map((action) => action.title);

  return actions.length > 0 ? actions.join(" → ") : "추천 액션 미정";
}