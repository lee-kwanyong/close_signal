import type {
  ClosureRiskAction,
  ClosureRiskLevel,
  ClosureRiskResult,
  ClosureRiskSignal,
  ClosureRiskSignalCategory,
  ClosureRiskSignalSeverity,
  StoreClosureRiskInput,
} from "@/lib/closure-risk/types";

function n(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

function hasNumber(value: number | null | undefined): boolean {
  return n(value) !== null;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(Math.max(value, min), max);
}

function dropRate(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  const c = n(current);
  const p = n(previous);

  if (c === null || p === null || p <= 0) {
    return null;
  }

  return (p - c) / p;
}

function increaseRate(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  const c = n(current);
  const p = n(previous);

  if (c === null || p === null || p <= 0) {
    return null;
  }

  return (c - p) / p;
}

function level(score: number): ClosureRiskLevel {
  if (score >= 85) {
    return "critical";
  }

  if (score >= 70) {
    return "danger";
  }

  if (score >= 50) {
    return "warning";
  }

  if (score >= 30) {
    return "watch";
  }

  return "low";
}

function levelLabel(value: ClosureRiskLevel): string {
  const labels: Record<ClosureRiskLevel, string> = {
    low: "안정",
    watch: "관찰",
    warning: "주의",
    danger: "위험",
    critical: "긴급",
  };

  return labels[value];
}

function severity(contribution: number): ClosureRiskSignalSeverity {
  if (contribution >= 20) {
    return "critical";
  }

  if (contribution >= 14) {
    return "high";
  }

  if (contribution >= 8) {
    return "medium";
  }

  return "low";
}

function addSignal(
  list: ClosureRiskSignal[],
  params: Omit<ClosureRiskSignal, "severity">
): void {
  list.push({
    ...params,
    severity: severity(params.contribution),
  });
}

function action(
  key: string,
  priority: ClosureRiskAction["priority"],
  title: string,
  description: string,
  sourceSignalKeys: string[]
): ClosureRiskAction {
  return {
    key,
    priority,
    title,
    description,
    sourceSignalKeys,
  };
}

function missing(
  input: StoreClosureRiskInput
): ClosureRiskResult["missingData"] {
  const items: ClosureRiskResult["missingData"] = [];

  if (!input.dataCoverage?.sales) {
    items.push({
      type: "sales",
      label: "최근 매출 데이터",
      message:
        "최근 30일/이전 30일 매출을 연결하면 Growth Signal의 핵심 원인을 더 정확히 계산할 수 있습니다.",
    });
  }

  if (!input.dataCoverage?.cost) {
    items.push({
      type: "cost",
      label: "고정비 데이터",
      message:
        "임대료, 인건비, 월 고정비를 입력하면 비용 압박 신호를 계산할 수 있습니다.",
    });
  }

  if (
    !input.dataCoverage?.review &&
    (input.reviewConnectedPlatformCount ?? 0) === 0
  ) {
    items.push({
      type: "review",
      label: "리뷰 데이터 연결",
      message:
        "리뷰 계정을 연결하면 리뷰 감소율, 평점, 부정 리뷰 비율을 Growth Signal의 고객 반응 신호로 반영할 수 있습니다.",
    });
  }

  if (!input.dataCoverage?.region) {
    items.push({
      type: "region",
      label: "지역/업종 지표",
      message:
        "지역과 동일 업종 지표를 연결하면 외부 환경 리스크를 Growth Signal에 반영할 수 있습니다.",
    });
  }

  return items;
}

function getReviewDataStatus(
  input: StoreClosureRiskInput
): ClosureRiskResult["reviewDataStatus"] {
  const connectedPlatformCount = Math.max(
    0,
    Math.round(input.reviewConnectedPlatformCount ?? 0)
  );

  const hasReviewFeature =
    hasNumber(input.reviewCountLast30d) ||
    hasNumber(input.reviewCountPrev30d) ||
    hasNumber(input.avgRatingLast30d) ||
    hasNumber(input.negativeReviewRateLast30d);

  if (connectedPlatformCount === 0) {
    return {
      connectedPlatformCount,
      hasReviewFeature,
      status: "not_connected",
      message:
        "리뷰 채널은 아직 Growth Signal 보조 데이터로 연결되지 않았습니다.",
    };
  }

  if (hasReviewFeature) {
    return {
      connectedPlatformCount,
      hasReviewFeature,
      status: "active",
      message:
        "연결된 리뷰 데이터가 Growth Signal의 고객 반응 신호로 반영되고 있습니다.",
    };
  }

  return {
    connectedPlatformCount,
    hasReviewFeature,
    status: "connected_no_stats",
    message:
      "리뷰 채널은 연결되어 있지만 아직 Growth Signal에 반영할 통계가 충분하지 않습니다.",
  };
}

export function predictClosureRisk(
  input: StoreClosureRiskInput
): ClosureRiskResult {
  const signals: ClosureRiskSignal[] = [];
  let score = 0;

  const salesDrop30d = dropRate(input.salesLast30d, input.salesPrev30d);
  const salesDrop90d = dropRate(input.salesLast90d, input.salesPrev90d);

  const salesLast30d = n(input.salesLast30d);
  const fixedCost =
    n(input.fixedCostMonthly) ??
    (n(input.rentMonthly) ?? 0) + (n(input.laborCostMonthly) ?? 0);

  const fixedCostRatio =
    salesLast30d !== null && salesLast30d > 0 && fixedCost > 0
      ? fixedCost / salesLast30d
      : null;

  const reviewDropRate = dropRate(
    input.reviewCountLast30d,
    input.reviewCountPrev30d
  );

  const competitionIncreaseRate = increaseRate(
    input.competitionCountNearby,
    input.competitionCountPrev
  );

  const operatingDaysLast30d = n(input.operatingDaysLast30d);
  const rating = n(input.avgRatingLast30d);
  const negativeRate = n(input.negativeReviewRateLast30d);
  const regionClosure = n(input.regionClosureRate);
  const industryClosure = n(input.sameIndustryClosureRate);
  const age = n(input.businessAgeMonths);

  if (salesDrop30d !== null) {
    if (salesDrop30d >= 0.5) {
      const contribution = 26;
      score += contribution;

      addSignal(signals, {
        key: "sales_drop_30d_critical",
        category: "sales",
        contribution,
        title: "최근 30일 매출 급감",
        description:
          "직전 30일 대비 최근 30일 매출이 50% 이상 감소했습니다.",
        evidence: {
          salesDrop30d,
        },
      });
    } else if (salesDrop30d >= 0.3) {
      const contribution = 19;
      score += contribution;

      addSignal(signals, {
        key: "sales_drop_30d_high",
        category: "sales",
        contribution,
        title: "최근 30일 매출 하락",
        description:
          "직전 30일 대비 최근 30일 매출이 30% 이상 감소했습니다.",
        evidence: {
          salesDrop30d,
        },
      });
    } else if (salesDrop30d >= 0.15) {
      const contribution = 10;
      score += contribution;

      addSignal(signals, {
        key: "sales_drop_30d_medium",
        category: "sales",
        contribution,
        title: "최근 30일 매출 감소",
        description:
          "직전 30일 대비 최근 30일 매출이 15% 이상 감소했습니다.",
        evidence: {
          salesDrop30d,
        },
      });
    }
  }

  if (salesDrop90d !== null && salesDrop90d >= 0.2) {
    const contribution = salesDrop90d >= 0.4 ? 18 : 10;
    score += contribution;

    addSignal(signals, {
      key:
        contribution >= 18
          ? "sales_drop_90d_high"
          : "sales_drop_90d_medium",
      category: "sales",
      contribution,
      title: "최근 90일 매출 추세 악화",
      description:
        "중기 매출 흐름이 감소 추세입니다. 단기 하락인지 구조적 하락인지 점검이 필요합니다.",
      evidence: {
        salesDrop90d,
      },
    });
  }

  if (fixedCostRatio !== null) {
    if (fixedCostRatio >= 0.8) {
      const contribution = 22;
      score += contribution;

      addSignal(signals, {
        key: "fixed_cost_pressure_critical",
        category: "cost",
        contribution,
        title: "고정비 부담 과다",
        description: "최근 30일 매출 대비 고정비 비율이 매우 높습니다.",
        evidence: {
          fixedCostRatio,
        },
      });
    } else if (fixedCostRatio >= 0.55) {
      const contribution = 14;
      score += contribution;

      addSignal(signals, {
        key: "fixed_cost_pressure_high",
        category: "cost",
        contribution,
        title: "고정비 부담 증가",
        description:
          "매출 대비 고정비 부담이 높은 편입니다. 비용 구조 점검이 필요합니다.",
        evidence: {
          fixedCostRatio,
        },
      });
    } else if (fixedCostRatio >= 0.35) {
      const contribution = 7;
      score += contribution;

      addSignal(signals, {
        key: "fixed_cost_pressure_medium",
        category: "cost",
        contribution,
        title: "고정비 관리 필요",
        description: "고정비 비율이 관찰이 필요한 수준입니다.",
        evidence: {
          fixedCostRatio,
        },
      });
    }
  }

  if (operatingDaysLast30d !== null) {
    if (operatingDaysLast30d <= 15) {
      const contribution = 14;
      score += contribution;

      addSignal(signals, {
        key: "low_operating_days_high",
        category: "operation",
        contribution,
        title: "영업일 수 부족",
        description:
          "최근 30일 영업일 수가 낮아 매출 안정성이 떨어질 수 있습니다.",
        evidence: {
          operatingDaysLast30d,
        },
      });
    } else if (operatingDaysLast30d <= 22) {
      const contribution = 7;
      score += contribution;

      addSignal(signals, {
        key: "low_operating_days_medium",
        category: "operation",
        contribution,
        title: "영업일 수 감소 가능성",
        description:
          "최근 영업일 수가 충분하지 않아 운영 흐름 관찰이 필요합니다.",
        evidence: {
          operatingDaysLast30d,
        },
      });
    }
  }

  if (reviewDropRate !== null && reviewDropRate >= 0.25) {
    const contribution = reviewDropRate >= 0.5 ? 12 : 7;
    score += contribution;

    addSignal(signals, {
      key:
        contribution >= 12
          ? "review_count_drop_high"
          : "review_count_drop_medium",
      category: "review",
      contribution,
      title: "리뷰 유입 감소",
      description:
        "최근 리뷰 수가 이전 기간 대비 감소했습니다. 고객 반응 신호가 약해지고 있을 수 있습니다.",
      evidence: {
        reviewDropRate,
      },
    });
  }

  if (rating !== null && rating > 0 && rating <= 3.8) {
    const contribution = rating <= 3.2 ? 14 : 8;
    score += contribution;

    addSignal(signals, {
      key: contribution >= 14 ? "low_rating_high" : "low_rating_medium",
      category: "review",
      contribution,
      title: "평점 관리 필요",
      description:
        "최근 평균 평점이 주의 구간입니다. 고객 경험 개선이 필요할 수 있습니다.",
      evidence: {
        avgRatingLast30d: rating,
      },
    });
  }

  if (negativeRate !== null && negativeRate >= 0.2) {
    const contribution = negativeRate >= 0.35 ? 15 : 8;
    score += contribution;

    addSignal(signals, {
      key:
        contribution >= 15
          ? "negative_review_rate_high"
          : "negative_review_rate_medium",
      category: "review",
      contribution,
      title: "부정 리뷰 비율 상승",
      description:
        "최근 부정 리뷰 비율이 높아 고객 이탈 신호로 이어질 수 있습니다.",
      evidence: {
        negativeRate,
      },
    });
  }

  if (competitionIncreaseRate !== null && competitionIncreaseRate >= 0.25) {
    const contribution = competitionIncreaseRate >= 0.5 ? 10 : 6;
    score += contribution;

    addSignal(signals, {
      key:
        contribution >= 10
          ? "competition_increase_high"
          : "competition_increase_medium",
      category: "competition",
      contribution,
      title: "경쟁 강도 상승",
      description:
        "주변 경쟁 환경이 이전보다 강화되고 있습니다. 차별화 포인트 점검이 필요합니다.",
      evidence: {
        competitionIncreaseRate,
      },
    });
  }

  if (regionClosure !== null && regionClosure >= 0.05) {
    const contribution = regionClosure >= 0.08 ? 12 : 7;
    score += contribution;

    addSignal(signals, {
      key: "region_market_risk",
      category: "region",
      contribution,
      title: "지역 상권 리스크 주의",
      description:
        "해당 지역의 상권 지표가 주의 구간입니다. 외부 환경 변화가 매장 성과에 영향을 줄 수 있습니다.",
      evidence: {
        regionClosure,
      },
    });
  }

  if (industryClosure !== null && industryClosure >= 0.06) {
    const contribution = industryClosure >= 0.1 ? 12 : 7;
    score += contribution;

    addSignal(signals, {
      key: "same_industry_market_risk",
      category: "region",
      contribution,
      title: "동일 업종 리스크 주의",
      description:
        "같은 업종의 시장 지표가 주의 구간입니다. 업종 전반의 흐름을 함께 확인해야 합니다.",
      evidence: {
        industryClosure,
      },
    });
  }

  if (age !== null && age <= 12) {
    const contribution = age <= 6 ? 8 : 5;
    score += contribution;

    addSignal(signals, {
      key: "early_stage_business",
      category: "lifecycle",
      contribution,
      title: "초기 안정화 구간",
      description:
        "개업 초기 사업장은 운영 안정화 전까지 지표 변동성이 큽니다.",
      evidence: {
        businessAgeMonths: age,
      },
    });
  }

  signals.sort((a, b) => b.contribution - a.contribution);

  const actions: ClosureRiskAction[] = [];

  const byCategory = (category: ClosureRiskSignalCategory) =>
    signals
      .filter((signal) => signal.category === category)
      .map((signal) => signal.key);

  const salesSignalKeys = byCategory("sales");
  const costSignalKeys = byCategory("cost");
  const operationSignalKeys = byCategory("operation");
  const reviewSignalKeys = byCategory("review");
  const competitionSignalKeys = byCategory("competition");
  const regionSignalKeys = byCategory("region");
  const lifecycleSignalKeys = byCategory("lifecycle");

  if (salesSignalKeys.length) {
    actions.push(
      action(
        "review_sales_drop_reason",
        "high",
        "매출 하락 원인 분해",
        "요일별, 시간대별, 채널별 매출을 나눠 하락 구간을 먼저 찾으세요.",
        salesSignalKeys
      )
    );
  }

  if (costSignalKeys.length) {
    actions.push(
      action(
        "reduce_fixed_cost_pressure",
        "high",
        "고정비 부담 점검",
        "임대료, 인건비, 구독비, 재료비를 분리해 부담이 큰 항목부터 조정하세요.",
        costSignalKeys
      )
    );
  }

  if (operationSignalKeys.length) {
    actions.push(
      action(
        "stabilize_operation_schedule",
        "medium",
        "운영 일정 안정화",
        "영업일, 영업시간, 휴무 패턴을 점검해 매출 공백이 생기는 구간을 줄이세요.",
        operationSignalKeys
      )
    );
  }

  if (reviewSignalKeys.length) {
    actions.push(
      action(
        "recover_review_quality",
        "medium",
        "리뷰 품질 회복",
        "최근 부정 리뷰 키워드를 분류하고 반복되는 불만 항목을 먼저 개선하세요.",
        reviewSignalKeys
      )
    );
  }

  if (competitionSignalKeys.length) {
    actions.push(
      action(
        "differentiate_from_competitors",
        "medium",
        "경쟁 매장 대비 차별점 강화",
        "주변 경쟁 매장과 가격, 메뉴, 리뷰 키워드를 비교해 차별 포인트를 정리하세요.",
        competitionSignalKeys
      )
    );
  }

  if (regionSignalKeys.length) {
    actions.push(
      action(
        "monitor_market_context",
        "medium",
        "상권 변화 모니터링",
        "지역과 동일 업종 흐름을 함께 보면서 가격, 메뉴, 영업전략을 조정하세요.",
        regionSignalKeys
      )
    );
  }

  if (lifecycleSignalKeys.length) {
    actions.push(
      action(
        "build_early_stage_routine",
        "low",
        "초기 운영 루틴 정착",
        "개업 초기에는 매출, 리뷰, 고객 유입 데이터를 매주 확인하는 루틴을 만드세요.",
        lifecycleSignalKeys
      )
    );
  }

  if (!actions.length) {
    actions.push(
      action(
        "continue_monitoring",
        "low",
        "주요 지표 모니터링 유지",
        "현재는 강한 리스크 신호가 없으므로 매출, 리뷰, 경쟁 환경 변화를 주기적으로 확인하세요.",
        []
      )
    );
  }

  const reviewDataStatus = getReviewDataStatus(input);

  const finalScore = Math.round(clamp(score));
  const finalLevel = level(finalScore);
  const topSignal = signals[0];

  const summary = topSignal
    ? `Growth Signal 리스크 ${finalScore}점으로 ${levelLabel(
        finalLevel
      )} 구간입니다. 가장 큰 신호는 “${topSignal.title}”입니다.`
    : `Growth Signal 리스크 ${finalScore}점으로 ${levelLabel(
        finalLevel
      )} 구간입니다. 현재는 강한 리스크 신호가 많지 않습니다.`;

  return {
    customerId: input.customerId,
    snapshotDate: input.snapshotDate ?? new Date().toISOString().slice(0, 10),
    score: finalScore,
    level: finalLevel,
    levelLabel: levelLabel(finalLevel),
    summary,
    signals,
    actions,
    missingData: missing(input),
    reviewDataStatus,
    debug: {
      salesDrop30d,
      salesDrop90d,
      fixedCostRatio,
      reviewDropRate,
      competitionIncreaseRate,
    },
  };
}