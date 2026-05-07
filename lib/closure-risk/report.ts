import type { DriverDto } from "@/lib/dto";
import type { ClosureRiskResult } from "@/lib/closure-risk/types";

export function closureRiskToReportBlock(result: ClosureRiskResult) {
  return {
    score: result.score,
    level: result.level,
    level_label: result.levelLabel,
    summary: result.summary,
    signals: result.signals,
    actions: result.actions,
    missing_data: result.missingData,
    review_data_status: result.reviewDataStatus,
    debug: result.debug,
    snapshot_date: result.snapshotDate,
  };
}

export function closureRiskToNegativeDrivers(
  result: ClosureRiskResult
): DriverDto[] {
  return result.signals.slice(0, 3).map((signal) => ({
    code: signal.key.toUpperCase(),
    label: signal.title,
    description: signal.description,
    impact: -Math.abs(Math.round(signal.contribution)),
  }));
}

export function fallbackClosureRiskReport(customerId?: string) {
  return {
    score: 0,
    level: "low" as const,
    level_label: "안정",
    summary: customerId
      ? "아직 Risk Radar 결과가 없습니다. Growth Signal 진단을 실행하면 조기 리스크 신호가 표시됩니다."
      : "아직 Risk Radar 결과가 없습니다.",
    signals: [],
    actions: [
      {
        key: "run_first_growth_signal",
        title: "첫 Growth Signal 진단 실행",
        description:
          "매출, 리뷰, 상권, 운영 데이터를 연결한 뒤 Growth Signal 진단을 실행하세요.",
        priority: "medium" as const,
        sourceSignalKeys: [],
      },
    ],
    missing_data: [
      {
        type: "sales",
        label: "최근 매출 데이터",
        message:
          "최근 30일 매출 데이터가 있으면 Growth Report와 Risk Radar가 더 정확해집니다.",
      },
      {
        type: "review",
        label: "리뷰 데이터",
        message:
          "리뷰 연동은 고객 반응 신호를 보강하는 Growth Signal 서브 데이터입니다.",
      },
    ],
    review_data_status: {
      connectedPlatformCount: 0,
      hasReviewFeature: false,
      status: "not_connected" as const,
      message:
        "리뷰 채널은 아직 Growth Signal 보조 데이터로 연결되지 않았습니다.",
    },
    debug: {
      salesDrop30d: null,
      salesDrop90d: null,
      fixedCostRatio: null,
      reviewDropRate: null,
      competitionIncreaseRate: null,
    },
    snapshot_date: new Date().toISOString().slice(0, 10),
  };
}
