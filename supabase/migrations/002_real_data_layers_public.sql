-- Growth Signal 300 - external real data layers
-- Apply after the base growth_signal schema.

CREATE TABLE IF NOT EXISTS external_semas_store (
    semas_store_id TEXT PRIMARY KEY,
    store_name TEXT NOT NULL,

    industry_large_code TEXT,
    industry_large_name TEXT,
    industry_middle_code TEXT,
    industry_middle_name TEXT,
    industry_small_code TEXT,
    industry_small_name TEXT,

    standard_industry_code TEXT,
    standard_industry_name TEXT,

    sido_code TEXT,
    sido_name TEXT,
    sigungu_code TEXT,
    sigungu_name TEXT,
    admin_dong_code TEXT,
    admin_dong_name TEXT,
    legal_dong_code TEXT,
    legal_dong_name TEXT,

    address TEXT,
    road_address TEXT,
    lat NUMERIC(10, 7),
    lng NUMERIC(10, 7),

    source_file_name TEXT,
    source_row_hash TEXT,
    raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,

    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
    CHECK (lng IS NULL OR lng BETWEEN -180 AND 180)
);

CREATE INDEX IF NOT EXISTS ix_external_semas_store_location
    ON external_semas_store (lat, lng);

CREATE INDEX IF NOT EXISTS ix_external_semas_store_small_code
    ON external_semas_store (industry_small_code);

CREATE INDEX IF NOT EXISTS ix_external_semas_store_middle_code
    ON external_semas_store (industry_middle_code);

CREATE INDEX IF NOT EXISTS ix_external_semas_store_large_code
    ON external_semas_store (industry_large_code);

CREATE INDEX IF NOT EXISTS ix_external_semas_store_admin_dong
    ON external_semas_store (admin_dong_code);

CREATE INDEX IF NOT EXISTS ix_external_semas_store_name_trgm_fallback
    ON external_semas_store (store_name);

CREATE TRIGGER trg_external_semas_store_touch_updated_at
BEFORE UPDATE ON external_semas_store
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


CREATE TABLE IF NOT EXISTS external_seoul_market_sales (
    external_market_sales_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    snapshot_month DATE NOT NULL,
    year_quarter_code TEXT,

    commercial_area_code TEXT,
    commercial_area_name TEXT,
    commercial_area_type_code TEXT,
    commercial_area_type_name TEXT,

    service_industry_code TEXT,
    service_industry_name TEXT,

    estimated_sales NUMERIC(18, 2),
    sales_count NUMERIC(18, 2),

    weekday_sales NUMERIC(18, 2),
    weekend_sales NUMERIC(18, 2),

    source_file_name TEXT,
    source_row_hash TEXT NOT NULL,
    raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,

    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (source_row_hash)
);

CREATE INDEX IF NOT EXISTS ix_external_seoul_market_sales_area
    ON external_seoul_market_sales (commercial_area_code, service_industry_code);

CREATE INDEX IF NOT EXISTS ix_external_seoul_market_sales_service
    ON external_seoul_market_sales (service_industry_code, service_industry_name);

CREATE INDEX IF NOT EXISTS ix_external_seoul_market_sales_month
    ON external_seoul_market_sales (snapshot_month DESC);

CREATE INDEX IF NOT EXISTS ix_external_seoul_market_sales_amount
    ON external_seoul_market_sales (estimated_sales);


CREATE TABLE IF NOT EXISTS external_seoul_living_population (
    external_living_population_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    snapshot_date DATE NOT NULL,
    hour_code INTEGER,

    admin_dong_code TEXT NOT NULL,
    admin_dong_name TEXT,

    total_population NUMERIC(18, 2),

    male_population NUMERIC(18, 2),
    female_population NUMERIC(18, 2),

    source_file_name TEXT,
    source_row_hash TEXT NOT NULL,
    raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,

    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (source_row_hash),
    CHECK (hour_code IS NULL OR hour_code BETWEEN 0 AND 23)
);

CREATE INDEX IF NOT EXISTS ix_external_living_population_dong_date
    ON external_seoul_living_population (admin_dong_code, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS ix_external_living_population_total
    ON external_seoul_living_population (total_population);


CREATE TABLE IF NOT EXISTS external_data_import_job (
    import_job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_type TEXT NOT NULL CHECK (dataset_type IN ('semas_store', 'seoul_market_sales', 'seoul_living_population')),
    source_file_name TEXT,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    rows_seen INTEGER NOT NULL DEFAULT 0,
    rows_imported INTEGER NOT NULL DEFAULT 0,
    rows_failed INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_external_data_import_job_dataset_time
    ON external_data_import_job (dataset_type, started_at DESC);
