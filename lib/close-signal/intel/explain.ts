import { buildSalesContext, isSalesDropStatus, isSalesRiseStatus } from "./sales";
import type {
  ActionPlan,
  CauseCandidate,
  EnrichedSignalContext,
  ExplainableRiskInput,
  PersonalPriorityLabel,
  SalesContext,
} from "./types";

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function nullableNum(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function buildCauseCandidatesInternal(
  input: ExplainableRiskInput,
  sales: SalesContext,
): CauseCandidate[] {
  const causes: CauseCandidate[] = [];

  const riskScore = num(input.risk_score);
  const shrinkScore = num(input.shrink_score);
  const closureScore = num(input.closure_score);
  const shortLivedScore = num(input.short_lived_score);
  const overheatScore = num(input.overheat_score);
  const netChange = num(input.net_change_30d);
  const closureRate = num(input.closure_rate_30d) * 100;
  const visibilityScore = nullableNum(input.sbiz_visibility_score);
  const competitionScore = nullableNum(input.sbiz_competition_score);
  const densityScore = nullableNum(input.sbiz_density_score);

  if (isSalesDropStatus(sales.sales_trend_status)) {
    causes.push({
      code: "sales_drop",
      label: "매출 하락",
      score:
        Math.abs(num(sales.sales_change_30d)) * 1.4 +
        Math.abs(num(sales.sales_change_mom)) * 0.8 +
        Math.abs(num(sales.sales_change_7d)) * 0.4 +
        10,
      detail: "최근 흐름 기준으로 매출 하락 신호가 가장 크게 잡혔습니다.",
    });
  }

  if (sales.sales_trend_status === "rebound") {
    causes.push({
      code: "sales_rebound",
      label: "반등 조짐",
      score:
        Math.max(0, num(sales.sales_change_7d)) * 1.2 +
        Math.abs(Math.min(0, num(sales.sales_change_30d))) * 0.6 +
        8,
      detail: "단기 회복은 보이지만 아직 장기 흐름은 완전히 회복되지 않았습니다.",
    });
  }

  if (isSalesRiseStatus(sales.sales_trend_status)) {
    causes.push({
      code: "sales_rise",
      label: "매출 상승",
      score:
        Math.max(0, num(sales.sales_change_30d)) * 1.1 +
        Math.max(0, num(sales.sales_change_mom)) * 0.7 +
        6,
      detail: "최근 매출 흐름이 상승 방향으로 움직이고 있습니다.",
    });
  }

  if (shrinkScore >= 8 || netChange < 0) {
    causes.push({
      code: "shrink_pressure",
      label: "상권 수축 흐름",
      score: shrinkScore * 1.2 + Math.max(0, Math.abs(netChange)) * 2.5,
      detail: "최근 사업체 순감소와 수축 점수가 함께 반영되었습니다.",
    });
  }

  if (closureScore >= 8 || closureRate >= 2) {
    causes.push({
      code: "closure_pressure",
      label: "폐업 압력 증가",
      score: closureScore * 1.1 + closureRate * 1.6,
      detail: "폐업률과 위축 점수가 높아지는 구간입니다.",
    });
  }

  if (shortLivedScore >= 6) {
    causes.push({
      code: "short_lived_pressure",
      label: "단기소멸 압력",
      score: shortLivedScore * 1.15,
      detail: "짧게 생겼다가 빠지는 업장 흐름이 상대적으로 강합니다.",
    });
  }

  if (visibilityScore !== null && visibilityScore < 45) {
    causes.push({
      code: "visibility_low",
      label: "외부 노출 약화",
      score: (55 - visibilityScore) * 1.1 + Math.abs(num(sales.sales_change_30d)) * 0.2,
      detail: "외부 노출 점수가 낮아 유입 약화 가능성이 있습니다.",
    });
  }

  if (
    (competitionScore !== null && competitionScore >= 55) ||
    (densityScore !== null && densityScore >= 60)
  ) {
    causes.push({
      code: "competition_pressure",
      label: "경쟁 압력 증가",
      score:
        Math.max(0, num(competitionScore) - 50) * 0.8 +
        Math.max(0, num(densityScore) - 55) * 0.45,
      detail: "동일 상권 안 경쟁 밀집과 경쟁 강도가 올라와 있습니다.",
    });
  }

  if (overheatScore >= 12 && isSalesRiseStatus(sales.sales_trend_status)) {
    causes.push({
      code: "overheat_rise",
      label: "과열 상승 신호",
      score: overheatScore * 0.95 + Math.max(0, num(sales.sales_change_30d)) * 0.5,
      detail: "상승은 보이지만 과열 가능성을 같이 봐야 하는 구간입니다.",
    });
  }

  if (riskScore >= 60) {
    causes.push({
      code: "overall_risk_high",
      label: "종합 위험도 상승",
      score: riskScore * 0.7,
      detail: "개별 지표 외에도 종합 위험 점수 자체가 높은 구간입니다.",
    });
  }

  return causes
    .filter((cause) => cause.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function buildCauseCandidates(
  input: ExplainableRiskInput,
  sales?: SalesContext,
) {
  return buildCauseCandidatesInternal(input, sales ?? buildSalesContext(input));
}

export function buildCauseSummary(
  candidates: CauseCandidate[],
  sales: SalesContext,
) {
  if (candidates.length === 0) {
    return "현재는 강한 위험 원인이 부족해 관찰 중심으로 보면 됩니다.";
  }

  const labels = candidates.slice(0, 3).map((item) => item.label);

  if (sales.sales_trend_status === "rebound") {
    if (labels.length === 1) {
      return `${labels[0]}이 보이지만 아직 추세 고정 전이라 추가 관찰이 필요합니다.`;
    }

    return `${labels[0]}이 먼저 보이고, ${labels[1]}를 함께 봐야 하는 회복 초입 구간입니다.`;
  }

  if (labels.length === 1) {
    return `${labels[0]}이 현재 흐름에 가장 크게 작용하고 있습니다.`;
  }

  if (labels.length === 2) {
    return `${labels[0]}이 가장 크게 작용하고 있고, ${labels[1]}가 함께 영향을 주고 있습니다.`;
  }

  return `${labels[0]}이 가장 크게 작용하고 있고, ${labels[1]}, ${labels[2]}가 함께 영향을 주고 있습니다.`;
}

export function buildActionPlan(
  input: ExplainableRiskInput,
  sales: SalesContext,
  candidates: CauseCandidate[],
): ActionPlan {
  const codes = new Set(candidates.map((item) => item.code));

  const hasVisibilityLow = codes.has("visibility_low");
  const hasCompetition = codes.has("competition_pressure");
  const hasShrink = codes.has("shrink_pressure");
  const hasClosure = codes.has("closure_pressure");
  const hasOverheat = codes.has("overheat_rise");
  const hasRebound = codes.has("sales_rebound");
  const hasSalesDrop = codes.has("sales_drop");
  const hasSalesRise = codes.has("sales_rise");

  if (hasRebound) {
    return {
      now: hasVisibilityLow
        ? "회복 신호가 꺾이지 않도록 카카오·네이버 플레이스 정보와 대표 노출 채널을 먼저 고정하세요."
        : "최근 반등을 만든 채널과 대표상품을 바로 고정하세요.",
      week: hasCompetition
        ? "이번 주 안에 경쟁점 대비 가격·대표상품·리뷰 차별화를 정리하세요."
        : "이번 주 안에 재방문과 재구매로 이어질 운영 계획을 정리하세요.",
      watch: "다음 score_date에서 반등이 30일 흐름까지 이어지는지 관찰하세요.",
    };
  }

  if (hasSalesDrop || isSalesDropStatus(sales.sales_trend_status)) {
    return {
      now: hasVisibilityLow
        ? "카카오·네이버 플레이스 정보, 대표사진, 카테고리, 전화번호 노출부터 즉시 점검하세요."
        : hasShrink || hasClosure
        ? "고정비, 운영시간, 저효율 메뉴·상품을 즉시 점검하세요."
        : "하락폭이 큰 채널과 상품부터 즉시 확인하세요.",
      week: hasCompetition
        ? "이번 주 안에 경쟁점 대비 가격·리뷰·대표상품 차이를 정리하세요."
        : "이번 주 안에 유입 채널, 재방문, 대표상품 구조를 다시 정리하세요.",
      watch: "다음 score_date에서 매출하락 폭과 순감소 흐름이 줄어드는지 관찰하세요.",
    };
  }

  if (hasSalesRise || isSalesRiseStatus(sales.sales_trend_status)) {
    return {
      now: hasOverheat
        ? "유입 증가가 과열로 번지지 않도록 재방문 구조와 운영 여력을 먼저 점검하세요."
        : "상승 흐름을 유지하는 대표 채널과 대표상품에 바로 집중하세요.",
      week: hasCompetition
        ? "이번 주 안에 경쟁 증가 구간에서도 유지될 차별화 포인트를 정리하세요."
        : "이번 주 안에 증가한 유입을 반복 방문으로 연결할 운영 구조를 만드세요.",
      watch: "상승 뒤 급락 전환이나 과열 진입이 없는지 관찰하세요.",
    };
  }

  return {
    now: hasVisibilityLow
      ? "외부 노출 정보부터 정비하세요."
      : "상위 원인부터 한 가지씩 먼저 점검하세요.",
    week: "이번 주 안에 원인별 대응 우선순위를 정리하세요.",
    watch: "다음 score_date에서 변화 방향을 다시 확인하세요.",
  };
}

export function buildPersonalPriority(
  input: ExplainableRiskInput,
  sales: SalesContext,
  candidates: CauseCandidate[],
) {
  const competitionScore = num(input.sbiz_competition_score);
  const visibilityScore = nullableNum(input.sbiz_visibility_score);

  let score =
    num(input.risk_score) * 0.6 +
    Math.max(0, -num(sales.sales_change_30d)) * 1.4 +
    Math.max(0, -num(sales.sales_change_7d)) * 0.9 +
    num(input.shrink_score) * 0.35 +
    num(input.closure_score) * 0.3;

  if (competitionScore >= 60) {
    score += 6;
  }

  if (visibilityScore !== null && visibilityScore < 45) {
    score += 10;
  }

  if (sales.sales_trend_status === "sharp_rise" && num(input.overheat_score) >= 15) {
    score += 5;
  }

  if (sales.sales_trend_status === "rebound") {
    score -= 8;
  }

  if (sales.sales_basis === "actual") {
    score += 4;
  }

  score = clamp(round1(score), 0, 100);

  let label: PersonalPriorityLabel = "watch";

  if (sales.sales_trend_status === "sharp_drop" || score >= 72) {
    label = "now";
  } else if (
    score >= 42 ||
    sales.sales_trend_status === "drop" ||
    sales.sales_trend_status === "rebound"
  ) {
    label = "soon";
  }

  if (candidates.length === 0 && score < 30) {
    label = "watch";
  }

  return {
    personal_priority_score: score,
    personal_priority_label: label,
  };
}

export function buildEnrichedSignalContext(
  input: ExplainableRiskInput,
): EnrichedSignalContext {
  const sales = buildSalesContext(input);
  const candidates = buildCauseCandidatesInternal(input, sales);
  const summary = buildCauseSummary(candidates, sales);
  const actions = buildActionPlan(input, sales, candidates);
  const priority = buildPersonalPriority(input, sales, candidates);

  return {
    ...sales,
    top_cause_1: candidates[0]?.label ?? null,
    top_cause_2: candidates[1]?.label ?? null,
    top_cause_3: candidates[2]?.label ?? null,
    cause_summary: summary,
    recommended_action_now: actions.now,
    recommended_action_week: actions.week,
    recommended_action_watch: actions.watch,
    personal_priority_score: priority.personal_priority_score,
    personal_priority_label: priority.personal_priority_label,
  };
}