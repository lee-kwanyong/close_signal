import type { Diagnosis, ScoreComponents } from "@/lib/db/types";

export function generateDiagnoses(components: ScoreComponents, featureHints: Record<string, number | null>, dataConfidenceScore: number): Diagnosis[] {
  const diagnoses: Diagnosis[] = [];
  const add = (d: Diagnosis) => diagnoses.push(d);

  if ((components.digital_discovery ?? 100) < 40) {
    add({
      code: "LOW_DISCOVERABILITY",
      title: "지도/검색 발견성 낮음",
      area: "digital_discovery",
      severity: 80,
      confidence: 78,
      impact: -8,
      message: "지도/검색에서 매장이 충분히 발견되지 않습니다.",
      recommended_action_codes: ["CONNECT_PLACE_URL", "FIX_PLACE_NAME", "FIX_PLACE_CATEGORY"]
    });
  }

  if ((featureHints.place_found_any ?? 100) === 0) {
    add({
      code: "PLACE_NOT_FOUND",
      title: "지도 검색 미발견",
      area: "digital_discovery",
      severity: 95,
      confidence: 85,
      impact: -10,
      message: "지도/검색에서 매장이 잘 발견되지 않습니다.",
      recommended_action_codes: ["CONNECT_PLACE_URL", "FIX_PLACE_NAME", "FIX_PLACE_ADDRESS"]
    });
  }

  if (featureHints.category_match_score !== null && featureHints.category_match_score !== undefined && featureHints.category_match_score < 70) {
    add({
      code: "CATEGORY_MISMATCH",
      title: "카테고리 불일치",
      area: "digital_discovery",
      severity: 75,
      confidence: 77,
      impact: -5,
      message: "지도 카테고리와 입력 업종이 일부 다릅니다.",
      recommended_action_codes: ["FIX_PLACE_CATEGORY"]
    });
  }

  if ((components.conversion_readiness ?? 100) < 55) {
    add({
      code: "LOW_CONVERSION_READINESS",
      title: "전환 정보 부족",
      area: "conversion_readiness",
      severity: 80,
      confidence: 82,
      impact: -8,
      message: "검색 고객이 방문을 결정할 정보가 부족합니다.",
      recommended_action_codes: ["ADD_BUSINESS_HOURS", "ADD_STORE_PHOTOS", "ADD_MENU_OR_SERVICE", "ADD_PRICE_INFO"]
    });
  }

  if (components.trust_reaction !== null && components.trust_reaction < 50) {
    add({
      code: "LOW_TRUST_SIGNAL",
      title: "신뢰 신호 부족",
      area: "trust_reaction",
      severity: 70,
      confidence: 69,
      impact: -4,
      message: "최근 리뷰나 후기 같은 고객 반응 신호가 약합니다.",
      recommended_action_codes: ["REQUEST_REVIEWS", "CREATE_REVIEW_QR", "ADD_TESTIMONIAL"]
    });
  }

  if (components.competition_position !== null && components.competition_position < 50) {
    add({
      code: "HIGH_COMPETITION_PRESSURE",
      title: "경쟁 압력 높음",
      area: "competition_position",
      severity: 70,
      confidence: 73,
      impact: -6,
      message: "주변 동일/유사 업종 경쟁이 강합니다.",
      recommended_action_codes: ["SET_DIFFERENTIATION_KEYWORDS", "ADD_SIGNATURE_ITEM", "ADD_SIGNATURE_MESSAGE"]
    });
  }

  if ((components.market_opportunity ?? 0) >= 70 && (components.digital_discovery ?? 100) < 60) {
    add({
      code: "GOOD_MARKET_LOW_DIGITAL",
      title: "좋은 상권 대비 낮은 디지털 준비",
      area: "digital_discovery",
      severity: 85,
      confidence: 80,
      impact: -7,
      message: "상권 기회는 좋은 편이지만 디지털 노출 준비가 부족합니다.",
      recommended_action_codes: ["FIX_PLACE_CATEGORY", "ADD_BUSINESS_HOURS", "ADD_STORE_PHOTOS", "ADD_MENU_OR_SERVICE"]
    });
  }

  if (dataConfidenceScore < 60) {
    add({
      code: "LOW_DATA_CONFIDENCE",
      title: "데이터 신뢰도 부족",
      area: "data_confidence",
      severity: 60,
      confidence: 90,
      impact: -3,
      message: "더 정확한 진단을 위해 추가 정보가 필요합니다.",
      recommended_action_codes: ["INPUT_CUSTOMER_GOAL", "CONNECT_PLACE_URL", "INPUT_MONTHLY_SALES"]
    });
  }

  if ((components.action_velocity ?? 100) < 35) {
    add({
      code: "NO_ACTION_AFTER_VIEW",
      title: "첫 미션 실행 필요",
      area: "action_velocity",
      severity: 65,
      confidence: 70,
      impact: -4,
      message: "진단은 준비됐고, 이제 5분짜리 첫 미션만 완료하면 됩니다.",
      recommended_action_codes: ["ADD_BUSINESS_HOURS", "CONFIRM_BUSINESS_INFO", "INPUT_CUSTOMER_GOAL"]
    });
  }

  return diagnoses.sort((a, b) => b.severity - a.severity).slice(0, 5);
}

export function reportSummary(components: ScoreComponents) {
  if ((components.market_opportunity ?? 0) >= 70 && (components.conversion_readiness ?? 100) < 55) {
    return "상권 기회는 좋은 편이지만, 검색 고객이 방문을 결정할 정보가 부족합니다.";
  }
  if ((components.digital_discovery ?? 100) < 60) {
    return "지도/검색에서 고객이 매장을 발견하기 위한 정보 정리가 우선입니다.";
  }
  if ((components.trust_reaction ?? 100) < 50) {
    return "최근 고객 반응 신호를 만들면 신뢰도를 빠르게 높일 수 있습니다.";
  }
  return "성장 준비도는 양호합니다. 이번 주 미션을 완료해 다음 점수 상승을 만들어보세요.";
}
