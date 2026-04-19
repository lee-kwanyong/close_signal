export type NtsBusinessStatusItem = {
  b_no: string;
  b_stt?: string;
  b_stt_cd?: string;
  tax_type?: string;
  tax_type_cd?: string;
  end_dt?: string;
  utcc_yn?: string;
  tax_type_change_dt?: string;
  invoice_apply_dt?: string;
};

export type KakaoPlaceDocument = {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
  distance?: string;
};

export type NaverTrendPoint = {
  period: string;
  ratio: number;
};

export type NaverTrendResult = {
  title: string;
  keywords: string[];
  data: NaverTrendPoint[];
};

export type SearchTrendResponse = {
  startDate: string;
  endDate: string;
  timeUnit: "date" | "week" | "month";
  results: NaverTrendResult[];
};

export type BusinessStatusResult = {
  source: "nts";
  valid: boolean;
  status: string | null;
  taxType: string | null;
  closedAt: string | null;
  raw: Record<string, unknown> | null;
  error?: string;
};

export type PlacePresenceItem = {
  name: string;
  address: string | null;
  category: string | null;
  phone: string | null;
  url: string | null;
  x: string | null;
  y: string | null;
};

export type PlacePresenceResult = {
  source: "kakao";
  matched: boolean;
  confidence: "low" | "medium" | "high";
  totalCount: number;
  items: PlacePresenceItem[];
  queryUsed: string;
  error?: string;
};

export type SearchTrendResult = {
  source: "naver-datalab";
  keyword: string;
  timeUnit: "date" | "week" | "month";
  points: NaverTrendPoint[];
  averageRatio: number | null;
  latestRatio: number | null;
  error?: string;
};

export type RiskReason = {
  code:
    | "business_closed"
    | "business_suspended"
    | "place_presence_weak"
    | "competition_dense"
    | "search_interest_down"
    | "search_interest_flat"
    | "unknown";
  title: string;
  detail: string;
  weight: number;
};

export type IntelSignalSummary = {
  score: number;
  grade: "low" | "moderate" | "elevated" | "high" | "critical";
  reasons: RiskReason[];
  raw: {
    nts?: NtsBusinessStatusItem | null;
    kakao?: {
      totalCount: number;
      matchedCount: number;
      competitorCount: number;
      matchedPlaces: KakaoPlaceDocument[];
    } | null;
    naver?: {
      trendDeltaPct: number | null;
      latestRatio: number | null;
      baselineRatio: number | null;
      series: NaverTrendPoint[];
    } | null;
  };
};

export type SalesBasis = "estimated" | "actual";

export type SalesTrendStatus =
  | "sharp_drop"
  | "drop"
  | "flat"
  | "rise"
  | "sharp_rise"
  | "rebound";

export type PersonalPriorityLabel = "now" | "soon" | "watch";

export type EnrichedSignalContext = {
  sales_basis: SalesBasis;
  sales_change_7d: number | null;
  sales_change_30d: number | null;
  sales_change_mom: number | null;
  sales_change_yoy: number | null;
  sales_trend_status: SalesTrendStatus;

  top_cause_1: string | null;
  top_cause_2: string | null;
  top_cause_3: string | null;
  cause_summary: string | null;

  recommended_action_now: string | null;
  recommended_action_week: string | null;
  recommended_action_watch: string | null;

  personal_priority_score: number | null;
  personal_priority_label: PersonalPriorityLabel;
};

export type ExplainableRiskInput = {
  score_date?: string | null;
  region_code?: string | null;
  region_name?: string | null;
  category_id?: number | null;
  category_code?: string | null;
  category_name?: string | null;

  business_count?: number | null;
  opened_count_30d?: number | null;
  closed_count_30d?: number | null;
  short_lived_count_30d?: number | null;
  reopened_count_30d?: number | null;
  net_change_30d?: number | null;

  closure_rate_30d?: number | null;
  short_lived_rate_30d?: number | null;
  new_entry_rate_30d?: number | null;

  closure_score?: number | null;
  short_lived_score?: number | null;
  shrink_score?: number | null;
  overheat_score?: number | null;
  risk_score?: number | null;
  risk_grade?: string | null;

  sbiz_store_count?: number | null;
  sbiz_density_score?: number | null;
  sbiz_competition_score?: number | null;
  sbiz_freshness_score?: number | null;
  sbiz_visibility_score?: number | null;
  sbiz_composite_score?: number | null;

  actual_sales_change_7d?: number | null;
  actual_sales_change_30d?: number | null;
  actual_sales_change_mom?: number | null;
  actual_sales_change_yoy?: number | null;

  external_presence_count?: number | null;
  external_competitor_count?: number | null;
  search_interest_delta_pct?: number | null;
};

export type CauseCandidate = {
  code: string;
  label: string;
  score: number;
  detail?: string | null;
};

export type ActionPlan = {
  now: string | null;
  week: string | null;
  watch: string | null;
};

export type SalesContext = Pick<
  EnrichedSignalContext,
  | "sales_basis"
  | "sales_change_7d"
  | "sales_change_30d"
  | "sales_change_mom"
  | "sales_change_yoy"
  | "sales_trend_status"
>;