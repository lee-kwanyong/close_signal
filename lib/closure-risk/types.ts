export type ClosureRiskLevel = "low" | "watch" | "warning" | "danger" | "critical";
export type ClosureRiskSignalSeverity = "low" | "medium" | "high" | "critical";
export type ClosureRiskSignalCategory = "sales" | "cost" | "operation" | "review" | "competition" | "region" | "lifecycle" | "data";

export type StoreClosureRiskInput = {
  customerId?: string;
  snapshotDate?: string;
  salesLast30d?: number | null;
  salesPrev30d?: number | null;
  salesLast90d?: number | null;
  salesPrev90d?: number | null;
  operatingDaysLast30d?: number | null;
  fixedCostMonthly?: number | null;
  rentMonthly?: number | null;
  laborCostMonthly?: number | null;
  reviewCountLast30d?: number | null;
  reviewCountPrev30d?: number | null;
  avgRatingLast30d?: number | null;
  negativeReviewRateLast30d?: number | null;
  reviewConnectedPlatformCount?: number | null;
  competitionCountNearby?: number | null;
  competitionCountPrev?: number | null;
  regionClosureRate?: number | null;
  sameIndustryClosureRate?: number | null;
  businessAgeMonths?: number | null;
  dataCoverage?: {
    sales: boolean;
    cost: boolean;
    review: boolean;
    competition: boolean;
    region: boolean;
  };
};

export type ClosureRiskSignal = {
  key: string;
  category: ClosureRiskSignalCategory;
  severity: ClosureRiskSignalSeverity;
  title: string;
  description: string;
  contribution: number;
  evidence?: Record<string, unknown>;
};

export type ClosureRiskAction = {
  key: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  sourceSignalKeys: string[];
};

export type ClosureRiskMissingData = {
  type: string;
  label: string;
  message: string;
};

export type ClosureRiskReviewDataStatus = {
  connectedPlatformCount: number;
  hasReviewFeature: boolean;
  status: "not_connected" | "connected_no_stats" | "active";
  message: string;
};

export type ClosureRiskResult = {
  customerId?: string;
  snapshotDate: string;
  score: number;
  level: ClosureRiskLevel;
  levelLabel: string;
  summary: string;
  signals: ClosureRiskSignal[];
  actions: ClosureRiskAction[];
  missingData: ClosureRiskMissingData[];
  reviewDataStatus: ClosureRiskReviewDataStatus;
  debug: {
    salesDrop30d: number | null;
    salesDrop90d: number | null;
    fixedCostRatio: number | null;
    reviewDropRate: number | null;
    competitionIncreaseRate: number | null;
  };
};
