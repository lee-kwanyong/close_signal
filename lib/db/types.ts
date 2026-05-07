export type JsonRecord = Record<string, unknown>;

export type Customer = {
  customer_id: string;
  business_number_hash?: string | null;
  business_name: string;
  owner_name_hash?: string | null;
  industry_code?: string | null;
  industry_name?: string | null;
  industry_group: string;
  address?: string | null;
  road_address?: string | null;
  lat?: number | null;
  lng?: number | null;
  opened_at?: string | null;
  store_count: number;
  customer_status: string;
};

export type StoreProfile = {
  customer_id: string;
  store_type?: string | null;
  main_channel?: string | null;
  customer_goal?: string | null;
  target_customer?: string | null;
  main_products?: string | null;
  differentiation_keywords?: string[] | null;
  avg_monthly_sales_self_reported?: number | null;
  avg_ticket_size_self_reported?: number | null;
  employee_count?: number | null;
  profile_completeness_score?: number | null;
};

export type ScoreComponents = {
  market_opportunity: number | null;
  competition_position: number | null;
  digital_discovery: number | null;
  conversion_readiness: number | null;
  trust_reaction: number | null;
  action_velocity: number | null;
  operation_basic: number | null;
};

export type Diagnosis = {
  code: string;
  title: string;
  area: string;
  severity: number;
  confidence: number;
  impact: number;
  message: string;
  recommended_action_codes: string[];
};

export type ActionCandidate = {
  action_code: string;
  mission_type: string;
  title: string;
  description: string;
  expected_lift_area: string;
  expected_total_lift: number;
  expected_component_lift: Record<string, number>;
  priority_score: number;
  effectiveness_score: number;
  difficulty_score: number;
  estimated_minutes: number | null;
  guide_json: JsonRecord;
  safety_note?: string | null;
  action_template_id?: string | null;
};
