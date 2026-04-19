export type RiskLayerLabel = "시장" | "사업장" | "구조" | "종합";

export type RiskReason = {
  code: string;
  title: string;
  description: string;
  weight: number | null;
  layerLabel: string;
  sourceType: string | null;
};

export type RiskAction = {
  title: string;
  description: string;
  priority: number;
  targetDays: number | null;
  playbookCode: string | null;
  status: string;
  evidenceNeeded: unknown[];
  successCriteria: unknown[];
};

export type ClosingIntelScoreResult = {
  marketRiskScore: number;
  businessRiskScore: number;
  structuralRecoverabilityScore: number;
  finalClosingRiskScore: number;
  riskScore: number;
  grade: "critical" | "caution" | "stable";
  reasons: RiskReason[];
  actions: RiskAction[];
  whySummary: string;
  actionSummary: string;
};

export type NtsStatusInput =
  | string
  | null
  | undefined
  | {
      status?: unknown;
      b_stt?: unknown;
      b_stt_cd?: unknown;
      tax_type?: unknown;
      taxType?: unknown;
      closure?: unknown;
      suspended?: unknown;
      [key: string]: unknown;
    };

export type TrendPointInput = {
  period?: string | null;
  ratio?: number | string | null;
};

export type PlaceLike = {
  name?: unknown;
  place_name?: unknown;
  address?: unknown;
  road_address?: unknown;
  phone?: unknown;
  [key: string]: unknown;
};

export type KakaoPlaceLike = {
  name?: unknown;
  place_name?: unknown;
  address_name?: unknown;
  road_address_name?: unknown;
  phone?: unknown;
  [key: string]: unknown;
};

export type NaverPlaceLike = {
  title?: unknown;
  address?: unknown;
  phone?: unknown;
  [key: string]: unknown;
};

export type ClosingIntelInput = {
  nts?: NtsStatusInput;
  trendDeltaPct?: number | string | null;
  searchTrendDeltaPct?: number | string | null;
  trendData?: TrendPointInput[] | null;
  place?: PlaceLike | null;
  kakao?: KakaoPlaceLike | null;
  naverPlace?: NaverPlaceLike | null;
  nearbyCompetitorCount?: number | string | null;
  competitorCount?: number | string | null;
  recoverabilityScore?: number | string | null;
  rescueChanceScore?: number | string | null;
  [key: string]: unknown;
};

export type SearchTrendDirection = "up" | "down" | "flat";

export type SearchTrendGroupAnalysis = {
  groupName: string;
  keywords: string[];
  points: number;
  baselineRatio: number | null;
  latestRatio: number | null;
  deltaPct: number | null;
  direction: SearchTrendDirection;
  reliability: "high" | "medium" | "low";
};

export type LastChanceStage =
  | "critical"
  | "last_chance"
  | "urgent"
  | "caution"
  | "observe"
  | "stable";

export type LastChanceReevaluation = {
  nextReviewAt: string | null;
  totalRiskDelta: number | null;
  recoverabilityDelta: number | null;
  latestResultStatus: string | null;
  latestResultText: string | null;
};

export type LastChanceCard = {
  id: string | number | null;
  monitorId: number | null;
  businessName: string;
  address: string | null;
  regionName: string | null;
  categoryName: string | null;
  snapshotDate: string | null;
  stage: LastChanceStage | string;
  marketRiskScore: number | null;
  businessRiskScore: number | null;
  recoverabilityScore: number | null;
  finalClosingRiskScore: number | null;
  whySummary: string | null;
  actionSummary: string | null;
  nextReviewAt: string | null;
  reasons: RiskReason[];
  actions: RiskAction[];
  evidence: unknown[];
  successCriteria: unknown[];
  reevaluation: LastChanceReevaluation;
};