-- Growth Signal 300 - core schema and initial config
-- PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS customer (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_number_hash TEXT,
    business_name TEXT NOT NULL,
    owner_name_hash TEXT,
    industry_code TEXT,
    industry_name TEXT,
    industry_group TEXT NOT NULL DEFAULT 'unknown',
    address TEXT,
    road_address TEXT,
    lat NUMERIC(10, 7),
    lng NUMERIC(10, 7),
    opened_at DATE,
    store_count INTEGER NOT NULL DEFAULT 1 CHECK (store_count > 0),
    customer_status TEXT NOT NULL DEFAULT 'active' CHECK (customer_status IN ('active','inactive','churned','deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
    CHECK (lng IS NULL OR lng BETWEEN -180 AND 180)
);
CREATE INDEX IF NOT EXISTS ix_customer_business_number_hash ON customer (business_number_hash) WHERE business_number_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_customer_industry_group ON customer (industry_group);
CREATE INDEX IF NOT EXISTS ix_customer_location ON customer (lat, lng);
DROP TRIGGER IF EXISTS trg_customer_touch_updated_at ON customer;
CREATE TRIGGER trg_customer_touch_updated_at BEFORE UPDATE ON customer FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS store_profile (
    customer_id UUID PRIMARY KEY REFERENCES customer(customer_id) ON DELETE CASCADE,
    store_type TEXT,
    main_channel TEXT,
    customer_goal TEXT,
    target_customer TEXT,
    main_products TEXT,
    differentiation_keywords TEXT[],
    avg_monthly_sales_self_reported NUMERIC(18,2),
    avg_ticket_size_self_reported NUMERIC(18,2),
    employee_count INTEGER,
    profile_completeness_score NUMERIC(5,2) CHECK (profile_completeness_score IS NULL OR profile_completeness_score BETWEEN 0 AND 100),
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_store_profile_touch_updated_at ON store_profile;
CREATE TRIGGER trg_store_profile_touch_updated_at BEFORE UPDATE ON store_profile FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS business_verification (
    business_verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source TEXT NOT NULL DEFAULT 'nts',
    business_status TEXT NOT NULL DEFAULT 'unknown' CHECK (business_status IN ('active','suspended','closed','unknown')),
    tax_type TEXT,
    is_valid BOOLEAN,
    opened_at DATE,
    closed_at DATE,
    raw_response_hash TEXT,
    raw_response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_business_verification_customer_latest ON business_verification (customer_id, verified_at DESC);

CREATE TABLE IF NOT EXISTS place_match_snapshot (
    place_match_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    platform TEXT NOT NULL CHECK (platform IN ('naver','kakao','google','manual','other')),
    place_found BOOLEAN NOT NULL DEFAULT false,
    external_place_id TEXT,
    place_name TEXT,
    place_category TEXT,
    place_url TEXT,
    place_address TEXT,
    place_road_address TEXT,
    place_lat NUMERIC(10,7),
    place_lng NUMERIC(10,7),
    phone_available BOOLEAN,
    hours_available BOOLEAN,
    menu_available BOOLEAN,
    price_available BOOLEAN,
    photo_available BOOLEAN,
    booking_link_available BOOLEAN,
    access_info_available BOOLEAN,
    rating NUMERIC(3,2) CHECK (rating IS NULL OR rating BETWEEN 0 AND 5),
    review_count INTEGER CHECK (review_count IS NULL OR review_count >= 0),
    recent_review_count_30d INTEGER CHECK (recent_review_count_30d IS NULL OR recent_review_count_30d >= 0),
    recent_review_count_90d INTEGER CHECK (recent_review_count_90d IS NULL OR recent_review_count_90d >= 0),
    name_match_score NUMERIC(5,2) CHECK (name_match_score IS NULL OR name_match_score BETWEEN 0 AND 100),
    address_match_score NUMERIC(5,2) CHECK (address_match_score IS NULL OR address_match_score BETWEEN 0 AND 100),
    category_match_score NUMERIC(5,2) CHECK (category_match_score IS NULL OR category_match_score BETWEEN 0 AND 100),
    coordinate_match_score NUMERIC(5,2) CHECK (coordinate_match_score IS NULL OR coordinate_match_score BETWEEN 0 AND 100),
    match_confidence_score NUMERIC(5,2) CHECK (match_confidence_score IS NULL OR match_confidence_score BETWEEN 0 AND 100),
    raw_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (place_lat IS NULL OR place_lat BETWEEN -90 AND 90),
    CHECK (place_lng IS NULL OR place_lng BETWEEN -180 AND 180)
);
CREATE INDEX IF NOT EXISTS ix_place_match_customer_snapshot ON place_match_snapshot (customer_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS ix_place_match_platform ON place_match_snapshot (platform);

CREATE TABLE IF NOT EXISTS market_snapshot (
    market_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    snapshot_month DATE NOT NULL,
    source TEXT NOT NULL,
    region_code TEXT,
    admin_dong_code TEXT,
    admin_dong_name TEXT,
    commercial_area_code TEXT,
    commercial_area_name TEXT,
    estimated_market_sales NUMERIC(18,2),
    living_population NUMERIC(18,2),
    resident_population NUMERIC(18,2),
    workplace_population NUMERIC(18,2),
    attraction_facility_count INTEGER CHECK (attraction_facility_count IS NULL OR attraction_facility_count >= 0),
    complementary_business_count INTEGER CHECK (complementary_business_count IS NULL OR complementary_business_count >= 0),
    market_demand_percentile NUMERIC(5,2) CHECK (market_demand_percentile IS NULL OR market_demand_percentile BETWEEN 0 AND 100),
    commercial_activity_score NUMERIC(5,2) CHECK (commercial_activity_score IS NULL OR commercial_activity_score BETWEEN 0 AND 100),
    demand_fit_score NUMERIC(5,2) CHECK (demand_fit_score IS NULL OR demand_fit_score BETWEEN 0 AND 100),
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_market_snapshot_customer_month ON market_snapshot (customer_id, snapshot_month DESC);

CREATE TABLE IF NOT EXISTS competition_snapshot (
    competition_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    snapshot_month DATE NOT NULL,
    source TEXT NOT NULL DEFAULT 'semas',
    same_industry_count_100m INTEGER CHECK (same_industry_count_100m IS NULL OR same_industry_count_100m >= 0),
    same_industry_count_300m INTEGER CHECK (same_industry_count_300m IS NULL OR same_industry_count_300m >= 0),
    same_industry_count_500m INTEGER CHECK (same_industry_count_500m IS NULL OR same_industry_count_500m >= 0),
    similar_industry_count_300m INTEGER CHECK (similar_industry_count_300m IS NULL OR similar_industry_count_300m >= 0),
    complementary_industry_count_300m INTEGER CHECK (complementary_industry_count_300m IS NULL OR complementary_industry_count_300m >= 0),
    competition_pressure_index NUMERIC(8,4),
    cluster_benefit_score NUMERIC(5,2) CHECK (cluster_benefit_score IS NULL OR cluster_benefit_score BETWEEN 0 AND 100),
    differentiation_gap_score NUMERIC(5,2) CHECK (differentiation_gap_score IS NULL OR differentiation_gap_score BETWEEN 0 AND 100),
    niche_opportunity_score NUMERIC(5,2) CHECK (niche_opportunity_score IS NULL OR niche_opportunity_score BETWEEN 0 AND 100),
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_competition_snapshot_customer_month ON competition_snapshot (customer_id, snapshot_month DESC);

CREATE TABLE IF NOT EXISTS signal_feature_snapshot (
    signal_feature_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    score_version TEXT NOT NULL DEFAULT 'gs-300-v1',
    feature_group TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    feature_value_numeric NUMERIC(18,6),
    feature_value_text TEXT,
    feature_value_json JSONB,
    feature_score NUMERIC(5,2) CHECK (feature_score IS NULL OR feature_score BETWEEN 0 AND 100),
    source TEXT,
    confidence_score NUMERIC(5,2) CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_signal_feature_customer_date ON signal_feature_snapshot (customer_id, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS score_weight_config (
    score_version TEXT NOT NULL,
    industry_group TEXT NOT NULL DEFAULT 'default',
    weights_json JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (score_version, industry_group)
);
DROP TRIGGER IF EXISTS trg_score_weight_config_touch_updated_at ON score_weight_config;
CREATE TRIGGER trg_score_weight_config_touch_updated_at BEFORE UPDATE ON score_weight_config FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS score_result (
    score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    score_date DATE NOT NULL DEFAULT CURRENT_DATE,
    score_version TEXT NOT NULL DEFAULT 'gs-300-v1',
    growth_signal_score NUMERIC(5,2) NOT NULL CHECK (growth_signal_score BETWEEN 0 AND 100),
    unlock_potential_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (unlock_potential_score BETWEEN 0 AND 100),
    reachable_score NUMERIC(5,2) NOT NULL CHECK (reachable_score BETWEEN 0 AND 100),
    growth_leverage_score NUMERIC(5,2) CHECK (growth_leverage_score IS NULL OR growth_leverage_score BETWEEN 0 AND 100),
    market_opportunity_score NUMERIC(5,2) CHECK (market_opportunity_score IS NULL OR market_opportunity_score BETWEEN 0 AND 100),
    competition_position_score NUMERIC(5,2) CHECK (competition_position_score IS NULL OR competition_position_score BETWEEN 0 AND 100),
    digital_discovery_score NUMERIC(5,2) CHECK (digital_discovery_score IS NULL OR digital_discovery_score BETWEEN 0 AND 100),
    conversion_readiness_score NUMERIC(5,2) CHECK (conversion_readiness_score IS NULL OR conversion_readiness_score BETWEEN 0 AND 100),
    trust_reaction_score NUMERIC(5,2) CHECK (trust_reaction_score IS NULL OR trust_reaction_score BETWEEN 0 AND 100),
    action_velocity_score NUMERIC(5,2) CHECK (action_velocity_score IS NULL OR action_velocity_score BETWEEN 0 AND 100),
    operation_basic_score NUMERIC(5,2) CHECK (operation_basic_score IS NULL OR operation_basic_score BETWEEN 0 AND 100),
    data_confidence_score NUMERIC(5,2) NOT NULL CHECK (data_confidence_score BETWEEN 0 AND 100),
    data_confidence_grade TEXT NOT NULL CHECK (data_confidence_grade IN ('A','B','C','D')),
    weights_used_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    positive_drivers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    negative_drivers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_data_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    component_detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (reachable_score >= growth_signal_score)
);
CREATE INDEX IF NOT EXISTS ix_score_result_customer_date ON score_result (customer_id, score_date DESC);

CREATE TABLE IF NOT EXISTS diagnosis_code_master (
    diagnosis_code TEXT PRIMARY KEY,
    affected_score_area TEXT NOT NULL,
    default_severity INTEGER NOT NULL DEFAULT 50 CHECK (default_severity BETWEEN 0 AND 100),
    title TEXT NOT NULL,
    customer_message_template TEXT NOT NULL,
    internal_message_template TEXT,
    recommended_action_codes TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_diagnosis_code_master_touch_updated_at ON diagnosis_code_master;
CREATE TRIGGER trg_diagnosis_code_master_touch_updated_at BEFORE UPDATE ON diagnosis_code_master FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS diagnosis_result (
    diagnosis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    score_id UUID NOT NULL REFERENCES score_result(score_id) ON DELETE CASCADE,
    diagnosis_code TEXT NOT NULL REFERENCES diagnosis_code_master(diagnosis_code),
    affected_score_area TEXT NOT NULL,
    severity_score NUMERIC(5,2) NOT NULL CHECK (severity_score BETWEEN 0 AND 100),
    confidence_score NUMERIC(5,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    impact_score NUMERIC(6,2),
    customer_message TEXT NOT NULL,
    internal_message TEXT,
    evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_diagnosis_result_customer_score ON diagnosis_result (customer_id, score_id);

CREATE TABLE IF NOT EXISTS action_template (
    action_template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_code TEXT NOT NULL,
    industry_group TEXT NOT NULL DEFAULT 'default',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    default_mission_type TEXT NOT NULL CHECK (default_mission_type IN ('quick_win','high_impact','trust_builder','data_boost','advanced','cs_assist')),
    difficulty_score NUMERIC(5,2) NOT NULL CHECK (difficulty_score BETWEEN 0 AND 100),
    estimated_minutes INTEGER CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
    expected_lift_area TEXT NOT NULL,
    expected_lift_min NUMERIC(5,2) NOT NULL DEFAULT 0,
    expected_lift_max NUMERIC(5,2) NOT NULL DEFAULT 0,
    required_evidence_type TEXT,
    guide_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    safety_note TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (action_code, industry_group),
    CHECK (expected_lift_min >= 0),
    CHECK (expected_lift_max >= expected_lift_min)
);
DROP TRIGGER IF EXISTS trg_action_template_touch_updated_at ON action_template;
CREATE TRIGGER trg_action_template_touch_updated_at BEFORE UPDATE ON action_template FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS mission_policy (
    mission_policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_code TEXT NOT NULL UNIQUE,
    policy_name TEXT NOT NULL,
    target_segment TEXT,
    trigger_conditions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommended_action_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    max_actions INTEGER NOT NULL DEFAULT 3 CHECK (max_actions BETWEEN 1 AND 10),
    default_difficulty_level TEXT NOT NULL DEFAULT 'easy' CHECK (default_difficulty_level IN ('easy','medium','hard','mixed')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_mission_policy_touch_updated_at ON mission_policy;
CREATE TRIGGER trg_mission_policy_touch_updated_at BEFORE UPDATE ON mission_policy FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS merchant_growth_twin (
    customer_id UUID PRIMARY KEY REFERENCES customer(customer_id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    industry_group TEXT NOT NULL,
    market_type TEXT,
    competition_type TEXT,
    digital_maturity_level TEXT CHECK (digital_maturity_level IS NULL OR digital_maturity_level IN ('none','low','medium','high')),
    conversion_readiness_level TEXT CHECK (conversion_readiness_level IS NULL OR conversion_readiness_level IN ('none','low','medium','high')),
    trust_signal_level TEXT CHECK (trust_signal_level IS NULL OR trust_signal_level IN ('none','low','medium','high')),
    action_behavior_type TEXT CHECK (action_behavior_type IS NULL OR action_behavior_type IN ('unknown','needs_easy_first_action','slow_executor','steady_executor','fast_executor','cs_needed')),
    growth_leverage_score NUMERIC(5,2) CHECK (growth_leverage_score IS NULL OR growth_leverage_score BETWEEN 0 AND 100),
    raw_profile_json JSONB NOT NULL DEFAULT '{}'::jsonb
);
DROP TRIGGER IF EXISTS trg_merchant_growth_twin_touch_updated_at ON merchant_growth_twin;
CREATE TRIGGER trg_merchant_growth_twin_touch_updated_at BEFORE UPDATE ON merchant_growth_twin FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS growth_intelligence_recommendation (
    recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    score_id UUID NOT NULL REFERENCES score_result(score_id) ON DELETE CASCADE,
    selected_policy_code TEXT REFERENCES mission_policy(policy_code),
    action_code TEXT NOT NULL,
    action_priority_score NUMERIC(5,2) NOT NULL CHECK (action_priority_score BETWEEN 0 AND 100),
    action_effectiveness_score NUMERIC(5,2) CHECK (action_effectiveness_score IS NULL OR action_effectiveness_score BETWEEN 0 AND 100),
    expected_lift NUMERIC(5,2) NOT NULL DEFAULT 0,
    confidence_score NUMERIC(5,2) CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 100),
    reason_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS growth_sprint (
    sprint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    score_id UUID REFERENCES score_result(score_id) ON DELETE SET NULL,
    sprint_name TEXT NOT NULL DEFAULT '이번 주 성장 스프린트',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL DEFAULT (CURRENT_DATE + 7),
    target_score_lift NUMERIC(5,2) NOT NULL DEFAULT 0,
    sprint_status TEXT NOT NULL DEFAULT 'active' CHECK (sprint_status IN ('active','completed','paused','expired','cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS ix_growth_sprint_customer ON growth_sprint (customer_id, start_date DESC);
DROP TRIGGER IF EXISTS trg_growth_sprint_touch_updated_at ON growth_sprint;
CREATE TRIGGER trg_growth_sprint_touch_updated_at BEFORE UPDATE ON growth_sprint FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS action_instance (
    action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    score_id UUID REFERENCES score_result(score_id) ON DELETE SET NULL,
    sprint_id UUID REFERENCES growth_sprint(sprint_id) ON DELETE SET NULL,
    action_template_id UUID REFERENCES action_template(action_template_id) ON DELETE SET NULL,
    action_code TEXT NOT NULL,
    mission_type TEXT NOT NULL CHECK (mission_type IN ('quick_win','high_impact','trust_builder','data_boost','advanced','cs_assist')),
    title TEXT NOT NULL,
    description TEXT,
    action_priority_score NUMERIC(5,2) CHECK (action_priority_score IS NULL OR action_priority_score BETWEEN 0 AND 100),
    action_effectiveness_score NUMERIC(5,2) CHECK (action_effectiveness_score IS NULL OR action_effectiveness_score BETWEEN 0 AND 100),
    expected_total_lift NUMERIC(5,2) NOT NULL DEFAULT 0,
    expected_component_lift_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','viewed','clicked','in_progress','completed_l0','evidence_submitted_l1','verified_l2','persisted_l3','skipped','expired','cancelled')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    viewed_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_action_instance_customer_status ON action_instance (customer_id, status);
CREATE INDEX IF NOT EXISTS ix_action_instance_code ON action_instance (action_code);
DROP TRIGGER IF EXISTS trg_action_instance_touch_updated_at ON action_instance;
CREATE TRIGGER trg_action_instance_touch_updated_at BEFORE UPDATE ON action_instance FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS sprint_mission (
    mission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_id UUID NOT NULL REFERENCES growth_sprint(sprint_id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES action_instance(action_id) ON DELETE CASCADE,
    day_number INTEGER CHECK (day_number IS NULL OR day_number BETWEEN 1 AND 7),
    mission_type TEXT NOT NULL CHECK (mission_type IN ('quick_win','high_impact','trust_builder','data_boost','advanced','cs_assist')),
    title TEXT NOT NULL,
    expected_lift NUMERIC(5,2) NOT NULL DEFAULT 0,
    estimated_minutes INTEGER CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','viewed','clicked','completed','skipped','expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_sprint_mission_sprint_day ON sprint_mission (sprint_id, day_number);

CREATE TABLE IF NOT EXISTS action_evidence (
    evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES action_instance(action_id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    evidence_type TEXT NOT NULL CHECK (evidence_type IN ('checkbox','text','url','image','screenshot','external_verified','system')),
    evidence_text TEXT,
    evidence_url TEXT,
    evidence_image_url TEXT,
    verification_level TEXT NOT NULL DEFAULT 'L0' CHECK (verification_level IN ('L0','L1','L2','L3')),
    verification_status TEXT NOT NULL DEFAULT 'submitted' CHECK (verification_status IN ('submitted','accepted','rejected','auto_verified')),
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generated_asset (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    action_id UUID REFERENCES action_instance(action_id) ON DELETE SET NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('review_request_sms','review_request_kakao','review_request_store_notice','store_intro','differentiation_keywords','menu_template','service_template','checklist','nudge_message','other')),
    industry_group TEXT NOT NULL DEFAULT 'default',
    title TEXT NOT NULL,
    content_text TEXT,
    content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    copy_variant TEXT,
    language_code TEXT NOT NULL DEFAULT 'ko',
    created_by TEXT NOT NULL DEFAULT 'engine',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_event (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    event_name TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    event_value NUMERIC(18,4),
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS ix_customer_event_customer_time ON customer_event (customer_id, event_time DESC);
CREATE INDEX IF NOT EXISTS ix_customer_event_name_time ON customer_event (event_name, event_time DESC);

CREATE TABLE IF NOT EXISTS customer_journey_state (
    customer_id UUID PRIMARY KEY REFERENCES customer(customer_id) ON DELETE CASCADE,
    current_stage TEXT NOT NULL DEFAULT 'onboarded' CHECK (current_stage IN ('onboarded','scored','report_viewed','first_action_assigned','first_action_completed','sprint_active','sprint_completed','stuck','cs_needed','consultation_ready','inactive')),
    last_report_viewed_at TIMESTAMPTZ,
    last_action_clicked_at TIMESTAMPTZ,
    last_action_completed_at TIMESTAMPTZ,
    mission_completion_rate NUMERIC(5,2) CHECK (mission_completion_rate IS NULL OR mission_completion_rate BETWEEN 0 AND 100),
    action_velocity_level TEXT CHECK (action_velocity_level IS NULL OR action_velocity_level IN ('unknown','low','medium','high')),
    nudge_responsiveness_level TEXT CHECK (nudge_responsiveness_level IS NULL OR nudge_responsiveness_level IN ('unknown','low','medium','high')),
    cs_intervention_needed BOOLEAN NOT NULL DEFAULT false,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_customer_journey_state_touch_updated_at ON customer_journey_state;
CREATE TRIGGER trg_customer_journey_state_touch_updated_at BEFORE UPDATE ON customer_journey_state FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS action_outcome (
    outcome_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES action_instance(action_id) ON DELETE CASCADE,
    action_code TEXT NOT NULL,
    industry_group TEXT,
    market_type TEXT,
    customer_segment TEXT,
    before_score_id UUID REFERENCES score_result(score_id) ON DELETE SET NULL,
    after_score_id UUID REFERENCES score_result(score_id) ON DELETE SET NULL,
    before_growth_score NUMERIC(5,2) CHECK (before_growth_score IS NULL OR before_growth_score BETWEEN 0 AND 100),
    after_growth_score NUMERIC(5,2) CHECK (after_growth_score IS NULL OR after_growth_score BETWEEN 0 AND 100),
    score_lift NUMERIC(6,2),
    before_component_scores_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    after_component_scores_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    component_lift_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    completion_status TEXT NOT NULL CHECK (completion_status IN ('not_completed','completed','verified','persisted','skipped')),
    verification_level TEXT CHECK (verification_level IS NULL OR verification_level IN ('L0','L1','L2','L3')),
    time_to_complete_hours NUMERIC(12,2),
    report_revisited_after BOOLEAN,
    consultation_requested_after BOOLEAN,
    next_action_completed BOOLEAN,
    retention_signal_after BOOLEAN,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS action_effectiveness_summary (
    summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_code TEXT NOT NULL,
    industry_group TEXT NOT NULL DEFAULT 'default',
    market_type TEXT NOT NULL DEFAULT 'all',
    customer_segment TEXT NOT NULL DEFAULT 'all',
    sample_size INTEGER NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
    completion_rate NUMERIC(5,2) CHECK (completion_rate IS NULL OR completion_rate BETWEEN 0 AND 100),
    avg_score_lift NUMERIC(6,2),
    avg_component_lift_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    avg_time_to_complete_hours NUMERIC(12,2),
    report_revisit_rate NUMERIC(5,2) CHECK (report_revisit_rate IS NULL OR report_revisit_rate BETWEEN 0 AND 100),
    consultation_conversion_rate NUMERIC(5,2) CHECK (consultation_conversion_rate IS NULL OR consultation_conversion_rate BETWEEN 0 AND 100),
    next_action_completion_rate NUMERIC(5,2) CHECK (next_action_completion_rate IS NULL OR next_action_completion_rate BETWEEN 0 AND 100),
    retention_lift_rate NUMERIC(5,2) CHECK (retention_lift_rate IS NULL OR retention_lift_rate BETWEEN -100 AND 100),
    confidence_level NUMERIC(5,2) CHECK (confidence_level IS NULL OR confidence_level BETWEEN 0 AND 100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (action_code, industry_group, market_type, customer_segment)
);

CREATE TABLE IF NOT EXISTS growth_nudge (
    nudge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    trigger_code TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('sms','kakao','email','push','in_app','call_task')),
    message TEXT NOT NULL,
    related_action_id UUID REFERENCES action_instance(action_id) ON DELETE SET NULL,
    related_score_id UUID REFERENCES score_result(score_id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    converted_event_name TEXT,
    converted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','sent','clicked','converted','failed','cancelled')),
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_success_queue (
    queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    score_id UUID REFERENCES score_result(score_id) ON DELETE SET NULL,
    segment_code TEXT NOT NULL,
    priority_score NUMERIC(5,2) NOT NULL CHECK (priority_score BETWEEN 0 AND 100),
    recommended_internal_action TEXT NOT NULL,
    assigned_to TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','resolved','dismissed')),
    due_at TIMESTAMPTZ,
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_customer_success_queue_status_priority ON customer_success_queue (status, priority_score DESC);
DROP TRIGGER IF EXISTS trg_customer_success_queue_touch_updated_at ON customer_success_queue;
CREATE TRIGGER trg_customer_success_queue_touch_updated_at BEFORE UPDATE ON customer_success_queue FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS customer_success_note (
    note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID NOT NULL REFERENCES customer_success_queue(queue_id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    note TEXT NOT NULL,
    next_follow_up_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW v_latest_score AS
SELECT DISTINCT ON (sr.customer_id) sr.*
FROM score_result sr
ORDER BY sr.customer_id, sr.score_date DESC, sr.created_at DESC;

CREATE OR REPLACE VIEW v_customer_growth_overview AS
SELECT
    c.customer_id, c.business_name, c.industry_group, c.industry_name, c.address, c.road_address, c.lat, c.lng,
    ls.score_id, ls.score_date, ls.growth_signal_score, ls.unlock_potential_score, ls.reachable_score,
    ls.growth_leverage_score, ls.data_confidence_score, ls.data_confidence_grade,
    ls.market_opportunity_score, ls.competition_position_score, ls.digital_discovery_score,
    ls.conversion_readiness_score, ls.trust_reaction_score, ls.action_velocity_score, ls.operation_basic_score,
    mgt.market_type, mgt.competition_type, mgt.digital_maturity_level, mgt.conversion_readiness_level,
    mgt.trust_signal_level, mgt.action_behavior_type,
    cjs.current_stage, cjs.mission_completion_rate, cjs.cs_intervention_needed
FROM customer c
LEFT JOIN v_latest_score ls ON c.customer_id = ls.customer_id
LEFT JOIN merchant_growth_twin mgt ON c.customer_id = mgt.customer_id
LEFT JOIN customer_journey_state cjs ON c.customer_id = cjs.customer_id;

CREATE OR REPLACE VIEW v_today_customer_success_queue AS
SELECT
    q.queue_id, q.customer_id, c.business_name, c.industry_group,
    q.segment_code, q.priority_score, q.recommended_internal_action,
    q.status, q.assigned_to, q.due_at,
    ls.growth_signal_score, ls.unlock_potential_score, ls.growth_leverage_score,
    ls.data_confidence_grade, q.created_at
FROM customer_success_queue q
JOIN customer c ON q.customer_id = c.customer_id
LEFT JOIN v_latest_score ls ON q.customer_id = ls.customer_id
WHERE q.status IN ('open','assigned','in_progress')
ORDER BY q.priority_score DESC, q.created_at ASC;

CREATE OR REPLACE VIEW v_action_learning_base AS
SELECT
    action_code, industry_group, COALESCE(market_type, 'all') AS market_type,
    COALESCE(customer_segment, 'all') AS customer_segment, customer_id, action_id,
    completion_status, verification_level, before_growth_score, after_growth_score,
    score_lift, time_to_complete_hours, report_revisited_after,
    consultation_requested_after, next_action_completed, retention_signal_after, created_at
FROM action_outcome;

INSERT INTO score_weight_config (score_version, industry_group, weights_json)
VALUES (
    'gs-300-v1',
    'default',
    '{"market_opportunity":0.15,"competition_position":0.15,"digital_discovery":0.15,"conversion_readiness":0.15,"trust_reaction":0.10,"action_velocity":0.20,"operation_basic":0.10}'::jsonb
)
ON CONFLICT (score_version, industry_group) DO UPDATE SET weights_json = EXCLUDED.weights_json, updated_at = now();

INSERT INTO diagnosis_code_master (diagnosis_code, affected_score_area, default_severity, title, customer_message_template, internal_message_template, recommended_action_codes)
VALUES
('PLACE_NOT_FOUND','digital_discovery',90,'지도 검색 미발견','지도/검색에서 매장이 잘 발견되지 않습니다.','지도 등록 또는 상호/주소 매칭 확인 필요',ARRAY['CONNECT_PLACE_URL','FIX_PLACE_NAME','FIX_PLACE_ADDRESS']),
('CATEGORY_MISMATCH','digital_discovery',75,'카테고리 불일치','지도 카테고리와 입력 업종이 일부 다릅니다.','카테고리 정합성 수정 유도',ARRAY['FIX_PLACE_CATEGORY']),
('LOW_CONVERSION_READINESS','conversion_readiness',80,'전환 정보 부족','검색 고객이 방문을 결정할 정보가 부족합니다.','메뉴, 가격, 사진, 영업시간 보강 필요',ARRAY['ADD_BUSINESS_HOURS','ADD_STORE_PHOTOS','ADD_MENU_OR_SERVICE','ADD_PRICE_INFO']),
('LOW_TRUST_SIGNAL','trust_reaction',70,'신뢰 신호 부족','최근 리뷰나 후기 같은 고객 반응 신호가 약합니다.','리뷰 요청 또는 후기 등록 미션 추천',ARRAY['REQUEST_REVIEWS','CREATE_REVIEW_QR','ADD_TESTIMONIAL']),
('HIGH_COMPETITION_PRESSURE','competition_position',70,'경쟁 압력 높음','주변 동일/유사 업종 경쟁이 강합니다.','차별 키워드와 대표 강점 정리 필요',ARRAY['SET_DIFFERENTIATION_KEYWORDS','ADD_SIGNATURE_ITEM','ADD_SIGNATURE_MESSAGE']),
('GOOD_MARKET_LOW_DIGITAL','digital_discovery',85,'좋은 상권 대비 낮은 디지털 준비','상권 기회는 좋은 편이지만 디지털 노출 준비가 부족합니다.','플레이스 최적화 패키지 추천',ARRAY['FIX_PLACE_CATEGORY','ADD_BUSINESS_HOURS','ADD_STORE_PHOTOS','ADD_MENU_OR_SERVICE']),
('LOW_DATA_CONFIDENCE','data_confidence',60,'데이터 신뢰도 부족','더 정확한 진단을 위해 추가 정보가 필요합니다.','목표, 지도 URL, 매출 자가 입력 유도',ARRAY['INPUT_CUSTOMER_GOAL','CONNECT_PLACE_URL','INPUT_MONTHLY_SALES']),
('NO_ACTION_AFTER_VIEW','action_velocity',65,'리포트 조회 후 미실행','진단은 확인했지만 아직 실행한 미션이 없습니다.','5분 이내 Quick Win 하나만 제안',ARRAY['ADD_BUSINESS_HOURS','CONFIRM_BUSINESS_INFO']),
('FAST_EXECUTOR','action_velocity',30,'빠른 실행 고객','추천 미션을 빠르게 완료하고 있습니다.','고급 미션 또는 상담 제안 대상',ARRAY['REQUEST_CONSULTATION','SET_DIFFERENTIATION_KEYWORDS'])
ON CONFLICT (diagnosis_code) DO UPDATE SET
    title = EXCLUDED.title,
    affected_score_area = EXCLUDED.affected_score_area,
    default_severity = EXCLUDED.default_severity,
    customer_message_template = EXCLUDED.customer_message_template,
    internal_message_template = EXCLUDED.internal_message_template,
    recommended_action_codes = EXCLUDED.recommended_action_codes,
    updated_at = now();

INSERT INTO action_template (
    action_code, industry_group, title, description, default_mission_type, difficulty_score,
    estimated_minutes, expected_lift_area, expected_lift_min, expected_lift_max,
    required_evidence_type, guide_json, safety_note
)
VALUES
('CONFIRM_BUSINESS_INFO','default','사업장 기본정보 확인','상호명, 주소, 업종, 영업상태가 올바른지 확인하세요.','quick_win',10,3,'operation_basic',1,2,'checkbox','{"checklist":["상호명 확인","주소 확인","업종 확인"]}'::jsonb,NULL),
('CONNECT_PLACE_URL','default','지도 URL 연결','네이버, 카카오, 구글 중 하나의 지도 상세 URL을 연결하세요.','data_boost',20,5,'data_confidence',2,4,'url','{"checklist":["지도에서 내 매장 검색","상세 페이지 URL 복사","그로스 시그널에 붙여넣기"]}'::jsonb,NULL),
('FIX_PLACE_NAME','default','상호명 통일','플랫폼마다 다르게 보이는 상호명을 통일하세요.','quick_win',30,5,'digital_discovery',1,3,'text_or_url','{"checklist":["사업장 상호 확인","지도 상호 확인","불일치 시 수정 요청"]}'::jsonb,NULL),
('FIX_PLACE_ADDRESS','default','주소 정보 정리','도로명주소와 지도 주소가 일치하는지 확인하세요.','quick_win',30,5,'operation_basic',1,3,'text_or_url','{"checklist":["도로명주소 확인","지도 주소 확인","불일치 시 수정 요청"]}'::jsonb,NULL),
('FIX_PLACE_CATEGORY','default','지도 카테고리 수정','고객이 검색하는 업종과 지도 카테고리가 일치하도록 수정하세요.','high_impact',40,10,'digital_discovery',2,6,'url_or_screenshot','{"checklist":["현재 지도 카테고리 확인","실제 업종과 비교","불일치 시 수정 요청"]}'::jsonb,NULL),
('ADD_BUSINESS_HOURS','default','영업시간 최신화','평일, 주말, 휴무일, 브레이크타임 정보를 최신 상태로 등록하세요.','quick_win',15,5,'conversion_readiness',1,3,'text_or_url','{"checklist":["평일 영업시간 입력","주말 영업시간 입력","휴무일 입력","브레이크타임 입력"]}'::jsonb,NULL),
('ADD_STORE_PHOTOS','default','대표사진 5장 추가','외관, 내부, 대표상품 또는 대표서비스 사진을 추가하세요.','high_impact',45,15,'conversion_readiness',2,5,'image_or_url','{"checklist":["외관 사진","내부 사진","대표 상품/서비스 사진","고객이 방문 전 궁금해할 사진"]}'::jsonb,NULL),
('ADD_MENU_OR_SERVICE','default','대표 메뉴/서비스 등록','대표 메뉴 또는 대표 서비스를 3개 이상 정리해 등록하세요.','high_impact',50,15,'conversion_readiness',3,7,'text_or_url','{"fields":["이름","가격","한 줄 설명","추천 사진"]}'::jsonb,NULL),
('ADD_PRICE_INFO','default','가격 정보 등록','고객이 방문 전에 확인할 수 있도록 대표 가격 정보를 등록하세요.','high_impact',45,10,'conversion_readiness',2,5,'text_or_url','{"fields":["상품/서비스명","가격","설명"]}'::jsonb,NULL),
('SET_DIFFERENTIATION_KEYWORDS','default','차별 키워드 3개 정리','주변 경쟁점 대비 고객이 기억할 만한 차별 키워드를 3개 정리하세요.','high_impact',55,15,'competition_position',2,5,'text','{"examples":["주차 가능","예약 가능","시그니처 메뉴","1:1 상담","소수정예","포장 가능"]}'::jsonb,NULL),
('REQUEST_REVIEWS','default','방문 고객 리뷰 요청','실제 방문 고객에게 정중히 리뷰를 요청하세요.','trust_builder',35,10,'trust_reaction',2,5,'text_or_checkbox','{"copy_texts":{"sms":"안녕하세요. 오늘 방문해주셔서 감사합니다. 이용이 만족스러우셨다면 짧은 리뷰 하나 남겨주시면 큰 힘이 됩니다.","kakao":"오늘 방문 감사드립니다. 괜찮으셨다면 리뷰 한 줄 부탁드려도 될까요? 더 좋은 서비스로 보답하겠습니다."}}'::jsonb,'실제 이용 고객에게만 요청하세요. 긍정 리뷰를 강요하거나 대가를 제공하면 안 됩니다.'),
('CREATE_REVIEW_QR','default','리뷰 QR 안내 만들기','매장에서 고객이 쉽게 리뷰를 남길 수 있도록 QR 안내를 만드세요.','trust_builder',45,15,'trust_reaction',2,4,'image_or_url','{"checklist":["리뷰 페이지 URL 확인","QR 생성","매장 안내문으로 출력"]}'::jsonb,'리뷰 작성 대가를 제공하거나 긍정 리뷰를 유도하는 표현은 사용하지 마세요.'),
('INPUT_CUSTOMER_GOAL','default','이번 달 성장 목표 입력','이번 달 가장 개선하고 싶은 목표를 입력하세요.','data_boost',10,3,'data_confidence',1,2,'text','{"examples":["리뷰 늘리기","예약 문의 늘리기","지도 노출 개선","대표 메뉴 정리","상담 신청 늘리기"]}'::jsonb,NULL),
('INPUT_MONTHLY_SALES','default','월매출 자가 입력','최근 월매출 범위를 입력하면 추천 액션의 정확도가 올라갑니다.','data_boost',20,5,'data_confidence',1,3,'number','{"fields":["최근 월매출","최근 3개월 변화","성수기/비수기 여부"]}'::jsonb,NULL),
('REQUEST_CONSULTATION','default','성장 상담 신청','현재 상황에 맞는 성장 액션을 상담받으세요.','cs_assist',60,10,'action_velocity',1,3,'checkbox','{"checklist":["상담 희망 시간 선택","주요 고민 입력","연락처 확인"]}'::jsonb,NULL)
ON CONFLICT (action_code, industry_group) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    default_mission_type = EXCLUDED.default_mission_type,
    difficulty_score = EXCLUDED.difficulty_score,
    estimated_minutes = EXCLUDED.estimated_minutes,
    expected_lift_area = EXCLUDED.expected_lift_area,
    expected_lift_min = EXCLUDED.expected_lift_min,
    expected_lift_max = EXCLUDED.expected_lift_max,
    required_evidence_type = EXCLUDED.required_evidence_type,
    guide_json = EXCLUDED.guide_json,
    safety_note = EXCLUDED.safety_note,
    updated_at = now();

INSERT INTO mission_policy (policy_code, policy_name, target_segment, trigger_conditions_json, recommended_action_codes_json, max_actions, default_difficulty_level)
VALUES
('FIRST_ACTION_FOR_INACTIVE','리포트 조회 후 미실행 고객 첫 미션','no_action_after_view','{"diagnosis_codes":["NO_ACTION_AFTER_VIEW"],"action_velocity_score_max":50}'::jsonb,'[{"action_code":"CONFIRM_BUSINESS_INFO","mission_type":"quick_win"},{"action_code":"ADD_BUSINESS_HOURS","mission_type":"quick_win"},{"action_code":"INPUT_CUSTOMER_GOAL","mission_type":"data_boost"}]'::jsonb,3,'easy'),
('GOOD_MARKET_LOW_CONVERSION','좋은 상권 낮은 전환준비 고객 미션','high_market_low_conversion','{"market_opportunity_score_min":70,"conversion_readiness_score_max":55}'::jsonb,'[{"action_code":"ADD_BUSINESS_HOURS","mission_type":"quick_win"},{"action_code":"ADD_MENU_OR_SERVICE","mission_type":"high_impact"},{"action_code":"REQUEST_REVIEWS","mission_type":"trust_builder"}]'::jsonb,3,'mixed'),
('HIGH_COMPETITION_LOW_DIFFERENTIATION','경쟁 압력 높고 차별화 부족 고객 미션','high_competition_low_differentiation','{"diagnosis_codes":["HIGH_COMPETITION_PRESSURE"]}'::jsonb,'[{"action_code":"SET_DIFFERENTIATION_KEYWORDS","mission_type":"high_impact"},{"action_code":"ADD_MENU_OR_SERVICE","mission_type":"high_impact"},{"action_code":"ADD_STORE_PHOTOS","mission_type":"trust_builder"}]'::jsonb,3,'medium'),
('LOW_DATA_CONFIDENCE_BOOST','데이터 신뢰도 보강 미션','data_poor','{"data_confidence_score_max":60}'::jsonb,'[{"action_code":"CONNECT_PLACE_URL","mission_type":"data_boost"},{"action_code":"INPUT_CUSTOMER_GOAL","mission_type":"data_boost"},{"action_code":"INPUT_MONTHLY_SALES","mission_type":"data_boost"}]'::jsonb,3,'easy')
ON CONFLICT (policy_code) DO UPDATE SET
    policy_name = EXCLUDED.policy_name,
    target_segment = EXCLUDED.target_segment,
    trigger_conditions_json = EXCLUDED.trigger_conditions_json,
    recommended_action_codes_json = EXCLUDED.recommended_action_codes_json,
    max_actions = EXCLUDED.max_actions,
    default_difficulty_level = EXCLUDED.default_difficulty_level,
    updated_at = now();
