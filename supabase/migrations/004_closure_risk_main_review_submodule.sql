-- Closure Signal v0
-- Main: 소상공인 폐업위험 예측 엔진
-- Sub: 리뷰 계정 연동 / 리뷰 feature 데이터 모듈

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1) 폐업위험 예측 결과 스냅샷
CREATE TABLE IF NOT EXISTS closure_risk_snapshot (
    closure_risk_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    score_id UUID REFERENCES score_result(score_id) ON DELETE SET NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    risk_score NUMERIC(5,2) NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low','watch','warning','danger','critical')),
    risk_summary TEXT NOT NULL,
    input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    signals_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_data_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    review_data_status_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    debug_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_closure_risk_snapshot_customer_date
    ON closure_risk_snapshot (customer_id, snapshot_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_closure_risk_snapshot_level
    ON closure_risk_snapshot (risk_level);

-- 2) 폐업위험 feature 입력: 매출/비용/상권/폐업률
CREATE TABLE IF NOT EXISTS business_sales_daily (
    business_sales_daily_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    sales_date DATE NOT NULL,
    sales_amount NUMERIC(18,2),
    order_count INTEGER,
    is_open BOOLEAN NOT NULL DEFAULT true,
    source TEXT NOT NULL DEFAULT 'manual',
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (customer_id, sales_date, source)
);
ALTER TABLE business_sales_daily ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE business_sales_daily ADD COLUMN IF NOT EXISTS sales_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE business_sales_daily ADD COLUMN IF NOT EXISTS sales_amount NUMERIC(18,2);
ALTER TABLE business_sales_daily ADD COLUMN IF NOT EXISTS order_count INTEGER;
ALTER TABLE business_sales_daily ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;
ALTER TABLE business_sales_daily ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE business_sales_daily ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE business_sales_daily ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE business_sales_daily ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS ix_business_sales_daily_customer_date
    ON business_sales_daily (customer_id, sales_date DESC);
DROP TRIGGER IF EXISTS trg_business_sales_daily_touch_updated_at ON business_sales_daily;
CREATE TRIGGER trg_business_sales_daily_touch_updated_at
BEFORE UPDATE ON business_sales_daily
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS business_cost_monthly (
    business_cost_monthly_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    cost_month DATE NOT NULL,
    fixed_cost_monthly NUMERIC(18,2),
    rent_monthly NUMERIC(18,2),
    labor_cost_monthly NUMERIC(18,2),
    material_cost_monthly NUMERIC(18,2),
    utility_cost_monthly NUMERIC(18,2),
    source TEXT NOT NULL DEFAULT 'manual',
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (customer_id, cost_month, source)
);
ALTER TABLE business_cost_monthly ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE business_cost_monthly ADD COLUMN IF NOT EXISTS cost_month DATE DEFAULT CURRENT_DATE;
ALTER TABLE business_cost_monthly ADD COLUMN IF NOT EXISTS fixed_cost_monthly NUMERIC(18,2);
ALTER TABLE business_cost_monthly ADD COLUMN IF NOT EXISTS rent_monthly NUMERIC(18,2);
ALTER TABLE business_cost_monthly ADD COLUMN IF NOT EXISTS labor_cost_monthly NUMERIC(18,2);
ALTER TABLE business_cost_monthly ADD COLUMN IF NOT EXISTS material_cost_monthly NUMERIC(18,2);
ALTER TABLE business_cost_monthly ADD COLUMN IF NOT EXISTS utility_cost_monthly NUMERIC(18,2);
ALTER TABLE business_cost_monthly ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE business_cost_monthly ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE business_cost_monthly ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE business_cost_monthly ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS ix_business_cost_monthly_customer_month
    ON business_cost_monthly (customer_id, cost_month DESC);
DROP TRIGGER IF EXISTS trg_business_cost_monthly_touch_updated_at ON business_cost_monthly;
CREATE TRIGGER trg_business_cost_monthly_touch_updated_at
BEFORE UPDATE ON business_cost_monthly
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS regional_market_indicators (
    regional_market_indicator_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    snapshot_month DATE NOT NULL,
    region_code TEXT,
    admin_dong_code TEXT,
    industry_code TEXT,
    region_closure_rate NUMERIC(8,6),
    demand_index NUMERIC(8,4),
    foot_traffic_index NUMERIC(8,4),
    source TEXT NOT NULL DEFAULT 'external',
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE regional_market_indicators ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE regional_market_indicators ADD COLUMN IF NOT EXISTS snapshot_month DATE DEFAULT CURRENT_DATE;
ALTER TABLE regional_market_indicators ADD COLUMN IF NOT EXISTS region_code TEXT;
ALTER TABLE regional_market_indicators ADD COLUMN IF NOT EXISTS admin_dong_code TEXT;
ALTER TABLE regional_market_indicators ADD COLUMN IF NOT EXISTS industry_code TEXT;
ALTER TABLE regional_market_indicators ADD COLUMN IF NOT EXISTS region_closure_rate NUMERIC(8,6);
ALTER TABLE regional_market_indicators ADD COLUMN IF NOT EXISTS demand_index NUMERIC(8,4);
ALTER TABLE regional_market_indicators ADD COLUMN IF NOT EXISTS foot_traffic_index NUMERIC(8,4);
ALTER TABLE regional_market_indicators ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'external';
ALTER TABLE regional_market_indicators ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE regional_market_indicators ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS ix_regional_market_indicators_customer_month
    ON regional_market_indicators (customer_id, snapshot_month DESC);

CREATE TABLE IF NOT EXISTS external_closure_stats (
    external_closure_stat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    snapshot_month DATE NOT NULL,
    region_code TEXT,
    industry_code TEXT,
    region_closure_rate NUMERIC(8,6),
    same_industry_closure_rate NUMERIC(8,6),
    source TEXT NOT NULL DEFAULT 'external',
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE external_closure_stats ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE external_closure_stats ADD COLUMN IF NOT EXISTS snapshot_month DATE DEFAULT CURRENT_DATE;
ALTER TABLE external_closure_stats ADD COLUMN IF NOT EXISTS region_code TEXT;
ALTER TABLE external_closure_stats ADD COLUMN IF NOT EXISTS industry_code TEXT;
ALTER TABLE external_closure_stats ADD COLUMN IF NOT EXISTS region_closure_rate NUMERIC(8,6);
ALTER TABLE external_closure_stats ADD COLUMN IF NOT EXISTS same_industry_closure_rate NUMERIC(8,6);
ALTER TABLE external_closure_stats ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'external';
ALTER TABLE external_closure_stats ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE external_closure_stats ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS ix_external_closure_stats_customer_month
    ON external_closure_stats (customer_id, snapshot_month DESC);

-- 3) 리뷰 연동은 메인이 아니라 폐업위험 예측 feature를 보강하는 서브 데이터 모듈
CREATE TABLE IF NOT EXISTS review_platform_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    platform_label TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    connection_method TEXT NOT NULL DEFAULT 'self_connect',
    connection_status TEXT NOT NULL DEFAULT 'pending',
    account_identifier TEXT,
    account_display_name TEXT,
    help_requested BOOLEAN NOT NULL DEFAULT false,
    consent_status TEXT NOT NULL DEFAULT 'pending',
    sync_status TEXT NOT NULL DEFAULT 'not_started',
    last_synced_at TIMESTAMPTZ,
    owner_name TEXT,
    contact TEXT,
    memo TEXT,
    notes TEXT,
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS store_id UUID;
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS platform_label TEXT;
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS connection_method TEXT DEFAULT 'self_connect';
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'pending';
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS account_identifier TEXT;
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS account_display_name TEXT;
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS help_requested BOOLEAN DEFAULT false;
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS consent_status TEXT DEFAULT 'pending';
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'not_started';
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS memo TEXT;
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE review_platform_connections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE review_platform_connections
SET account_identifier = NULL
WHERE account_identifier IS NOT NULL
  AND btrim(account_identifier) = '';

CREATE INDEX IF NOT EXISTS ix_review_platform_connections_store_platform
    ON review_platform_connections (store_id, platform);
CREATE INDEX IF NOT EXISTS ix_review_platform_connections_account_identifier
    ON review_platform_connections (account_identifier);
CREATE UNIQUE INDEX IF NOT EXISTS ux_review_platform_connections_platform_account_identifier
    ON review_platform_connections (platform, account_identifier)
    WHERE account_identifier IS NOT NULL AND btrim(account_identifier) <> '';
DROP TRIGGER IF EXISTS trg_review_platform_connections_touch_updated_at ON review_platform_connections;
CREATE TRIGGER trg_review_platform_connections_touch_updated_at
BEFORE UPDATE ON review_platform_connections
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE IF NOT EXISTS review_weekly_stats (
    review_weekly_stat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    platform TEXT,
    week_start_date DATE NOT NULL,
    review_count INTEGER,
    avg_rating NUMERIC(3,2),
    negative_review_rate NUMERIC(8,6),
    positive_review_rate NUMERIC(8,6),
    keyword_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    source TEXT NOT NULL DEFAULT 'manual_or_sync',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (customer_id, platform, week_start_date)
);
ALTER TABLE review_weekly_stats ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE review_weekly_stats ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE review_weekly_stats ADD COLUMN IF NOT EXISTS week_start_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE review_weekly_stats ADD COLUMN IF NOT EXISTS review_count INTEGER;
ALTER TABLE review_weekly_stats ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2);
ALTER TABLE review_weekly_stats ADD COLUMN IF NOT EXISTS negative_review_rate NUMERIC(8,6);
ALTER TABLE review_weekly_stats ADD COLUMN IF NOT EXISTS positive_review_rate NUMERIC(8,6);
ALTER TABLE review_weekly_stats ADD COLUMN IF NOT EXISTS keyword_summary_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE review_weekly_stats ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual_or_sync';
ALTER TABLE review_weekly_stats ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS ix_review_weekly_stats_customer_week
    ON review_weekly_stats (customer_id, week_start_date DESC);

CREATE TABLE IF NOT EXISTS review_issue_snapshots (
    review_issue_snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    platform TEXT,
    negative_review_rate NUMERIC(8,6),
    top_negative_keywords TEXT[],
    issues_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE review_issue_snapshots ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE review_issue_snapshots ADD COLUMN IF NOT EXISTS snapshot_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE review_issue_snapshots ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE review_issue_snapshots ADD COLUMN IF NOT EXISTS negative_review_rate NUMERIC(8,6);
ALTER TABLE review_issue_snapshots ADD COLUMN IF NOT EXISTS top_negative_keywords TEXT[];
ALTER TABLE review_issue_snapshots ADD COLUMN IF NOT EXISTS issues_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE review_issue_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS ix_review_issue_snapshots_customer_date
    ON review_issue_snapshots (customer_id, snapshot_date DESC);

CREATE OR REPLACE FUNCTION upsert_review_platform_connection(
    p_store_id uuid,
    p_platform text,
    p_platform_label text DEFAULT NULL,
    p_account_identifier text DEFAULT NULL,
    p_account_display_name text DEFAULT NULL,
    p_connection_method text DEFAULT 'self_connect',
    p_owner_name text DEFAULT NULL,
    p_contact text DEFAULT NULL,
    p_memo text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS review_platform_connections
LANGUAGE plpgsql
AS $$
DECLARE
    v_platform text;
    v_account_identifier text;
    v_existing review_platform_connections%ROWTYPE;
    v_result review_platform_connections%ROWTYPE;
BEGIN
    v_platform := lower(NULLIF(btrim(p_platform), ''));
    v_account_identifier := NULLIF(btrim(p_account_identifier), '');

    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'store_id is required' USING ERRCODE = '22023';
    END IF;

    IF v_platform IS NULL THEN
        RAISE EXCEPTION 'platform is required' USING ERRCODE = '22023';
    END IF;

    IF v_account_identifier IS NOT NULL THEN
        SELECT * INTO v_existing
        FROM review_platform_connections
        WHERE platform = v_platform
          AND account_identifier = v_account_identifier
        ORDER BY created_at DESC
        LIMIT 1;

        IF FOUND THEN
            IF v_existing.store_id <> p_store_id THEN
                RAISE EXCEPTION '이미 다른 매장에 연결된 리뷰 계정입니다. platform=%, account_identifier=%', v_platform, v_account_identifier
                    USING ERRCODE = '23505';
            END IF;

            UPDATE review_platform_connections
            SET platform_label = COALESCE(NULLIF(btrim(p_platform_label), ''), platform_label),
                account_display_name = COALESCE(NULLIF(btrim(p_account_display_name), ''), account_display_name),
                connection_method = COALESCE(NULLIF(btrim(p_connection_method), ''), 'self_connect'),
                connection_status = 'connected',
                status = 'connected',
                help_requested = false,
                error_message = NULL,
                owner_name = COALESCE(NULLIF(btrim(p_owner_name), ''), owner_name),
                contact = COALESCE(NULLIF(btrim(p_contact), ''), contact),
                memo = COALESCE(NULLIF(btrim(p_memo), ''), memo),
                metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb),
                updated_at = now()
            WHERE id = v_existing.id
            RETURNING * INTO v_result;

            RETURN v_result;
        END IF;
    END IF;

    SELECT * INTO v_existing
    FROM review_platform_connections
    WHERE store_id = p_store_id
      AND platform = v_platform
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        UPDATE review_platform_connections
        SET account_identifier = COALESCE(v_account_identifier, account_identifier),
            account_display_name = COALESCE(NULLIF(btrim(p_account_display_name), ''), account_display_name),
            platform_label = COALESCE(NULLIF(btrim(p_platform_label), ''), platform_label),
            connection_method = COALESCE(NULLIF(btrim(p_connection_method), ''), connection_method),
            connection_status = CASE WHEN v_account_identifier IS NULL THEN connection_status ELSE 'connected' END,
            status = CASE WHEN v_account_identifier IS NULL THEN status ELSE 'connected' END,
            help_requested = CASE WHEN v_account_identifier IS NULL THEN help_requested ELSE false END,
            error_message = NULL,
            owner_name = COALESCE(NULLIF(btrim(p_owner_name), ''), owner_name),
            contact = COALESCE(NULLIF(btrim(p_contact), ''), contact),
            memo = COALESCE(NULLIF(btrim(p_memo), ''), memo),
            metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb),
            updated_at = now()
        WHERE id = v_existing.id
        RETURNING * INTO v_result;

        RETURN v_result;
    END IF;

    INSERT INTO review_platform_connections (
        store_id, platform, platform_label, account_identifier, account_display_name,
        connection_method, connection_status, status, help_requested, consent_status,
        sync_status, owner_name, contact, memo, metadata
    )
    VALUES (
        p_store_id, v_platform, NULLIF(btrim(p_platform_label), ''), v_account_identifier,
        NULLIF(btrim(p_account_display_name), ''), COALESCE(NULLIF(btrim(p_connection_method), ''), 'self_connect'),
        CASE WHEN v_account_identifier IS NULL THEN 'pending' ELSE 'connected' END,
        CASE WHEN v_account_identifier IS NULL THEN 'help_requested' ELSE 'connected' END,
        CASE WHEN v_account_identifier IS NULL THEN true ELSE false END,
        'pending', 'not_started', NULLIF(btrim(p_owner_name), ''), NULLIF(btrim(p_contact), ''),
        NULLIF(btrim(p_memo), ''), COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$;

NOTIFY pgrst, 'reload schema';
