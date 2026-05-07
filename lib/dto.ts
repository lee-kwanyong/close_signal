export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  meta?: {
    request_id?: string;
    generated_at?: string;
  };
};

export type DataConfidenceDto = {
  score: number;
  grade: "A" | "B" | "C" | "D";
  message?: string;
};

export type ComponentScoresDto = {
  market_opportunity: number | null;
  competition_position: number | null;
  digital_discovery: number | null;
  conversion_readiness: number | null;
  trust_reaction: number | null;
  action_velocity: number | null;
  operation_basic: number | null;
};

export type DriverDto = {
  code: string;
  label: string;
  description: string;
  impact: number;
};

export type ClosureRiskLevelDto = "low" | "watch" | "warning" | "danger" | "critical";

export type ClosureRiskSignalDto = {
  key: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  contribution: number;
  evidence?: Record<string, unknown>;
};

export type ClosureRiskActionDto = {
  key: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  sourceSignalKeys: string[];
};

export type ClosureRiskLatestDto = {
  score: number;
  level: ClosureRiskLevelDto;
  level_label: string;
  summary: string;
  signals: ClosureRiskSignalDto[];
  actions: ClosureRiskActionDto[];
  missing_data: Array<{
    type: string;
    label: string;
    message: string;
  }>;
  review_data_status: {
    connectedPlatformCount: number;
    hasReviewFeature: boolean;
    status: "not_connected" | "connected_no_stats" | "active";
    message: string;
  };
  debug: {
    salesDrop30d: number | null;
    salesDrop90d: number | null;
    fixedCostRatio: number | null;
    reviewDropRate: number | null;
    competitionIncreaseRate: number | null;
  };
  snapshot_date: string;
};

export type GrowthSignalLatestDto = {
  customer_id: string;
  score_id: string;
  score_date: string;
  growth_signal_score: number;
  unlock_potential_score: number;
  reachable_score: number;
  data_confidence: DataConfidenceDto;
  growth_leverage_score: number;
  summary: string;
  closure_risk: ClosureRiskLatestDto;
  component_scores: ComponentScoresDto;
  positive_drivers: DriverDto[];
  negative_drivers: DriverDto[];
  missing_data: Array<{
    type: string;
    label: string;
    message: string;
  }>;
};

export type DiagnosisDto = {
  diagnosis_id: string;
  diagnosis_code: string;
  affected_score_area: string;
  severity_score: number;
  confidence_score: number;
  impact_score: number;
  customer_message: string;
  recommended_action_codes: string[];
  title?: string;
};

export type DiagnosisListDto = {
  items: DiagnosisDto[];
};

export type MissionDto = {
  mission_id: string;
  day_number: number | null;
  mission_type: "quick_win" | "high_impact" | "trust_builder" | "data_boost" | "advanced" | "cs_assist";
  action_id: string;
  title: string;
  expected_lift: number;
  estimated_minutes: number | null;
  status: "assigned" | "viewed" | "clicked" | "completed" | "skipped" | "expired";
};

export type CurrentSprintDto = {
  sprint_id: string | null;
  sprint_name: string;
  start_date: string | null;
  end_date: string | null;
  target_score_lift: number;
  sprint_status: "active" | "completed" | "paused" | "expired" | "cancelled";
  today_mission: MissionDto | null;
  weekly_missions: MissionDto[];
};

export type ActionDetailDto = {
  action_id: string;
  customer_id: string;
  action_code: string;
  mission_type: MissionDto["mission_type"];
  title: string;
  description: string;
  status: string;
  expected_total_lift: number;
  expected_component_lift: Record<string, number>;
  estimated_minutes: number | null;
  guide: {
    checklist?: string[];
    fields?: string[];
    examples?: string[];
    copy_texts?: Record<string, string>;
  };
  safety_note?: string | null;
};

export type AssetDto = {
  asset_id: string;
  asset_type: string;
  title: string;
  content_text?: string;
  content_json?: Record<string, unknown>;
};

export type ActionAssetsDto = {
  action_id: string;
  assets: AssetDto[];
  safety_note?: string | null;
};

export type CompleteActionResponseDto = {
  action_id: string;
  status: string;
  score_feedback?: {
    message: string;
    before_growth_signal_score?: number;
    after_growth_signal_score?: number;
    changed_components?: Record<string, { before: number; after: number }>;
  };
};

export type CustomerSuccessQueueItemDto = {
  queue_id: string;
  customer_id: string;
  business_name: string;
  industry_group: string;
  segment_code: string;
  priority_score: number;
  recommended_internal_action: string;
  growth_signal_score: number | null;
  unlock_potential_score: number | null;
  growth_leverage_score: number | null;
  data_confidence_grade: string | null;
  status: string;
  created_at: string;
};

export type CustomerSuccessQueueDto = {
  items: CustomerSuccessQueueItemDto[];
};
