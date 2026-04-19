export type ReasonSourceType = "market" | "intel" | "community" | "manual";
export type ReasonDimension = "market" | "business" | "structure";
export type ReasonSeverity = "low" | "mid" | "high" | "critical";

export type CanonicalReasonCode =
  | "business_closed"
  | "business_suspended"
  | "sales_drop"
  | "shrink_pressure"
  | "closure_pressure"
  | "visibility_low"
  | "search_interest_down"
  | "search_interest_flat"
  | "competition_pressure"
  | "market_decline_high"
  | "market_decline_mid"
  | "community_distress_high"
  | "community_distress_mid"
  | "overheat_rise"
  | "signal_gap";

export type CanonicalReasonSpec = {
  code: CanonicalReasonCode;
  title: string;
  dimension: ReasonDimension;
  severity: ReasonSeverity;
  defaultWeight: number;
  playbookCode: string;
  evidenceNeeded: string[];
  successCriteria: string[];
};

export type RawReasonInput = {
  reason_code?: string | null;
  title?: string | null;
  detail?: string | null;
  weight?: number | null;
  source_type?: string | null;
};

export type NormalizedReason = {
  legacyCode: string;
  canonicalCode: CanonicalReasonCode;
  title: string;
  detail: string;
  sourceType: ReasonSourceType;
  dimension: ReasonDimension;
  severity: ReasonSeverity;
  weight: number;
  playbookCode: string;
  evidenceNeeded: string[];
  successCriteria: string[];
};

const REASON_SPECS: Record<CanonicalReasonCode, CanonicalReasonSpec> = {
  business_closed: {
    code: "business_closed",
    title: "폐업 상태 감지",
    dimension: "business",
    severity: "critical",
    defaultWeight: 100,
    playbookCode: "record_and_verify_closure",
    evidenceNeeded: ["국세청 상태 캡처", "폐업일 확인", "사업장 현황 메모"],
    successCriteria: ["행정 상태 확정", "폐업일 기록", "후속 처리 여부 결정"],
  },
  business_suspended: {
    code: "business_suspended",
    title: "휴업 상태 감지",
    dimension: "business",
    severity: "high",
    defaultWeight: 80,
    playbookCode: "suspension_recovery_check",
    evidenceNeeded: ["휴업 상태 캡처", "재개 예정일", "운영 재개 가능성 메모"],
    successCriteria: ["휴업 원인 확인", "재개 일정 확보 또는 장기휴업 판정"],
  },
  sales_drop: {
    code: "sales_drop",
    title: "매출 하락 압력",
    dimension: "business",
    severity: "high",
    defaultWeight: 70,
    playbookCode: "offer_and_channel_fix",
    evidenceNeeded: ["최근 매출 추이", "주력 상품 변동", "객단가/방문수 변화"],
    successCriteria: ["매출 하락 원인 1개 이상 확정", "즉시 개선 액션 실행"],
  },
  shrink_pressure: {
    code: "shrink_pressure",
    title: "축소 압력",
    dimension: "structure",
    severity: "high",
    defaultWeight: 65,
    playbookCode: "cost_and_capacity_reset",
    evidenceNeeded: ["운영시간 변경 여부", "인력 현황", "고정비 항목 메모"],
    successCriteria: ["축소 요인 파악", "비용 절감 또는 운영 재설계"],
  },
  closure_pressure: {
    code: "closure_pressure",
    title: "폐업 압력 상승",
    dimension: "structure",
    severity: "critical",
    defaultWeight: 90,
    playbookCode: "last_chance_intervention",
    evidenceNeeded: ["대표 인터뷰 메모", "유지/철수 의사", "현금흐름 또는 체납 위험 메모"],
    successCriteria: ["유지/철수 결정", "7일 내 개입 계획 실행"],
  },
  visibility_low: {
    code: "visibility_low",
    title: "노출 약화",
    dimension: "business",
    severity: "mid",
    defaultWeight: 45,
    playbookCode: "listing_and_presence_repair",
    evidenceNeeded: ["지도 노출 캡처", "매장정보 최신화 여부", "리뷰/사진 현황"],
    successCriteria: ["지도/플레이스 정보 정비", "검색 결과 직접 노출 확인"],
  },
  search_interest_down: {
    code: "search_interest_down",
    title: "검색 관심도 하락",
    dimension: "market",
    severity: "high",
    defaultWeight: 55,
    playbookCode: "demand_reactivation",
    evidenceNeeded: ["검색 추세 캡처", "시즌성 여부 판단", "키워드 재정의"],
    successCriteria: ["핵심 키워드 재설정", "관심도 반등 실험 시작"],
  },
  search_interest_flat: {
    code: "search_interest_flat",
    title: "검색 관심도 정체",
    dimension: "market",
    severity: "mid",
    defaultWeight: 35,
    playbookCode: "demand_reactivation",
    evidenceNeeded: ["검색 추세 캡처", "전환되는 채널 후보", "콘텐츠 실험안"],
    successCriteria: ["정체 원인 정의", "테스트 1건 이상 실행"],
  },
  competition_pressure: {
    code: "competition_pressure",
    title: "경쟁 압력",
    dimension: "market",
    severity: "mid",
    defaultWeight: 40,
    playbookCode: "positioning_reset",
    evidenceNeeded: ["경쟁점 리스트", "가격/메뉴 차별점", "반경 내 과밀도"],
    successCriteria: ["포지셔닝 차별점 정의", "정면경쟁 회피안 수립"],
  },
  market_decline_high: {
    code: "market_decline_high",
    title: "시장 하락 심화",
    dimension: "market",
    severity: "high",
    defaultWeight: 60,
    playbookCode: "market_exposure_reduce",
    evidenceNeeded: ["지역·업종 지표 캡처", "전월 대비 악화 근거", "인접 대체 시장"],
    successCriteria: ["시장 의존도 축소안 작성", "대체 채널/상권 검토"],
  },
  market_decline_mid: {
    code: "market_decline_mid",
    title: "시장 하락 주의",
    dimension: "market",
    severity: "mid",
    defaultWeight: 35,
    playbookCode: "market_watch_and_selective_push",
    evidenceNeeded: ["지역·업종 지표 캡처", "하락 지속 여부", "탄력 상품 후보"],
    successCriteria: ["모니터링 주기 단축", "선별 집중 상품 정리"],
  },
  community_distress_high: {
    code: "community_distress_high",
    title: "커뮤니티 악화 신호 심함",
    dimension: "market",
    severity: "high",
    defaultWeight: 55,
    playbookCode: "community_reputation_repair",
    evidenceNeeded: ["부정 언급 캡처", "핵심 불만 유형", "대응 문구/개선안"],
    successCriteria: ["악화 원인 묶음 정의", "대응 실험 시작"],
  },
  community_distress_mid: {
    code: "community_distress_mid",
    title: "커뮤니티 악화 신호 주의",
    dimension: "market",
    severity: "mid",
    defaultWeight: 30,
    playbookCode: "community_reputation_repair",
    evidenceNeeded: ["대표 언급 캡처", "반복 이슈 여부", "응대 정리"],
    successCriteria: ["반복 이슈 차단", "응대 기준 정리"],
  },
  overheat_rise: {
    code: "overheat_rise",
    title: "과열 상승",
    dimension: "market",
    severity: "mid",
    defaultWeight: 30,
    playbookCode: "selective_defense",
    evidenceNeeded: ["급증 경쟁 신호", "진입장벽 여부", "단기 방어안"],
    successCriteria: ["무리한 확장 방지", "선택과 집중 전략 확정"],
  },
  signal_gap: {
    code: "signal_gap",
    title: "추가 신호 필요",
    dimension: "structure",
    severity: "low",
    defaultWeight: 5,
    playbookCode: "manual_triage",
    evidenceNeeded: ["추가 외부 검증", "현장 확인 메모", "기본 운영 정보"],
    successCriteria: ["원인 1건 이상 확정", "다음 검토 입력 완료"],
  },
};

const LEGACY_REASON_ALIASES: Record<string, CanonicalReasonCode> = {
  business_closed: "business_closed",
  business_suspended: "business_suspended",
  business_status_closed: "business_closed",
  business_status_suspended: "business_suspended",
  place_presence_weak: "visibility_low",
  visibility_low: "visibility_low",
  search_interest_down: "search_interest_down",
  search_interest_flat: "search_interest_flat",
  competition_dense: "competition_pressure",
  competition_pressure: "competition_pressure",
  market_decline_high: "market_decline_high",
  market_decline_mid: "market_decline_mid",
  community_distress_high: "community_distress_high",
  community_distress_mid: "community_distress_mid",
  sales_drop: "sales_drop",
  shrink_pressure: "shrink_pressure",
  closure_pressure: "closure_pressure",
  overheat_rise: "overheat_rise",
  signal_gap: "signal_gap",
  unknown: "signal_gap",
};

function safeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeReasonSource(
  input: unknown,
  dimension: ReasonDimension,
): ReasonSourceType {
  const normalized = safeText(input).toLowerCase();

  if (
    normalized === "market" ||
    normalized === "intel" ||
    normalized === "community" ||
    normalized === "manual"
  ) {
    return normalized;
  }

  if (dimension === "market") return "market";
  if (dimension === "business") return "intel";
  return "manual";
}

export function getReasonSpec(code: CanonicalReasonCode) {
  return REASON_SPECS[code];
}

export function normalizeReasonCode(input?: string | null): CanonicalReasonCode {
  const key = safeText(input).toLowerCase();
  return LEGACY_REASON_ALIASES[key] ?? "signal_gap";
}

export function normalizeReason(input: RawReasonInput): NormalizedReason {
  const legacyCode = safeText(input.reason_code);
  const canonicalCode = normalizeReasonCode(legacyCode);
  const spec = getReasonSpec(canonicalCode);

  return {
    legacyCode: legacyCode || canonicalCode,
    canonicalCode,
    title: safeText(input.title) || spec.title,
    detail: safeText(input.detail),
    sourceType: normalizeReasonSource(input.source_type, spec.dimension),
    dimension: spec.dimension,
    severity: spec.severity,
    weight:
      typeof input.weight === "number" && Number.isFinite(input.weight)
        ? input.weight
        : spec.defaultWeight,
    playbookCode: spec.playbookCode,
    evidenceNeeded: spec.evidenceNeeded,
    successCriteria: spec.successCriteria,
  };
}

export function reviewDaysBySeverity(severity: ReasonSeverity) {
  switch (severity) {
    case "critical":
      return 3;
    case "high":
      return 7;
    case "mid":
      return 14;
    case "low":
    default:
      return 21;
  }
}

export function priorityBySeverity(severity: ReasonSeverity) {
  switch (severity) {
    case "critical":
      return 1;
    case "high":
      return 2;
    case "mid":
      return 3;
    case "low":
    default:
      return 4;
  }
}