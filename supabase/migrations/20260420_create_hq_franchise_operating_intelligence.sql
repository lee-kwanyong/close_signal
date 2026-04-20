-- supabase/migrations/20260420_create_hq_franchise_operating_intelligence.sql

begin;

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.hq_brands (
  id bigserial primary key,
  brand_key text not null unique,
  brand_name text not null,
  category_id integer,
  category_name text,
  brand_type text not null default 'franchise'
    check (brand_type in ('franchise', 'multi_store', 'independent')),
  size_band text not null default '20_300'
    check (size_band in ('1_19', '20_300', '301_plus')),
  head_office_region_code text,
  head_office_region_name text,
  is_active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hq_brands_category_id
  on public.hq_brands (category_id);

create index if not exists idx_hq_brands_is_active
  on public.hq_brands (is_active);

drop trigger if exists trg_hq_brands_updated_at on public.hq_brands;
create trigger trg_hq_brands_updated_at
before update on public.hq_brands
for each row
execute function public.tg_set_updated_at();

create table if not exists public.hq_stores (
  id bigserial primary key,
  brand_id bigint not null references public.hq_brands(id) on delete cascade,
  external_store_id text,
  store_code text,
  store_name text not null,
  category_id integer,
  category_name text,
  store_kind text not null default 'franchisee'
    check (store_kind in ('direct', 'franchisee', 'test', 'unknown')),
  store_status text not null default 'active'
    check (store_status in ('active', 'warning', 'paused', 'closed', 'candidate')),
  business_number text,
  opened_on date,
  closed_on date,
  address text not null,
  road_address text,
  region_code text,
  region_name text,
  admin_dong_code text,
  admin_dong_name text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  building_name text,
  floor_info text,
  area_m2 numeric(12, 2),
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_hq_stores_brand_external_store_id
  on public.hq_stores (brand_id, external_store_id)
  where external_store_id is not null;

create unique index if not exists uq_hq_stores_brand_store_code
  on public.hq_stores (brand_id, store_code)
  where store_code is not null;

create index if not exists idx_hq_stores_brand_id
  on public.hq_stores (brand_id);

create index if not exists idx_hq_stores_region_code
  on public.hq_stores (region_code);

create index if not exists idx_hq_stores_category_id
  on public.hq_stores (category_id);

create index if not exists idx_hq_stores_store_status
  on public.hq_stores (store_status);

drop trigger if exists trg_hq_stores_updated_at on public.hq_stores;
create trigger trg_hq_stores_updated_at
before update on public.hq_stores
for each row
execute function public.tg_set_updated_at();

create table if not exists public.hq_candidate_sites (
  id bigserial primary key,
  brand_id bigint not null references public.hq_brands(id) on delete cascade,
  external_site_id text,
  site_name text,
  category_id integer,
  category_name text,
  review_status text not null default 'draft'
    check (review_status in ('draft', 'review', 'approved', 'rejected', 'opened')),
  address text not null,
  road_address text,
  region_code text,
  region_name text,
  admin_dong_code text,
  admin_dong_name text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  building_name text,
  floor_info text,
  notes text,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_hq_candidate_sites_brand_external_site_id
  on public.hq_candidate_sites (brand_id, external_site_id)
  where external_site_id is not null;

create index if not exists idx_hq_candidate_sites_brand_id
  on public.hq_candidate_sites (brand_id);

create index if not exists idx_hq_candidate_sites_region_code
  on public.hq_candidate_sites (region_code);

create index if not exists idx_hq_candidate_sites_category_id
  on public.hq_candidate_sites (category_id);

create index if not exists idx_hq_candidate_sites_review_status
  on public.hq_candidate_sites (review_status);

drop trigger if exists trg_hq_candidate_sites_updated_at on public.hq_candidate_sites;
create trigger trg_hq_candidate_sites_updated_at
before update on public.hq_candidate_sites
for each row
execute function public.tg_set_updated_at();

create table if not exists public.hq_site_feature_snapshots (
  id bigserial primary key,
  target_kind text not null
    check (target_kind in ('store', 'candidate_site')),
  store_id bigint references public.hq_stores(id) on delete cascade,
  candidate_site_id bigint references public.hq_candidate_sites(id) on delete cascade,
  snapshot_date date not null,
  analysis_radius_m integer not null default 500
    check (analysis_radius_m in (300, 500, 1000)),

  brand_id bigint references public.hq_brands(id) on delete cascade,
  region_code text,
  region_name text,
  category_id integer,
  category_name text,

  resident_population numeric(18, 2),
  worker_population numeric(18, 2),
  living_population numeric(18, 2),
  daytime_population numeric(18, 2),
  nighttime_population numeric(18, 2),
  resident_population_change_3m numeric(10, 4),
  resident_population_change_12m numeric(10, 4),
  living_population_change_3m numeric(10, 4),
  living_population_change_12m numeric(10, 4),
  worker_population_change_12m numeric(10, 4),

  female_20_39_ratio numeric(10, 4),
  family_household_ratio numeric(10, 4),
  single_household_ratio numeric(10, 4),
  inbound_ratio numeric(10, 4),
  foreigner_ratio numeric(10, 4),
  tourist_ratio numeric(10, 4),

  same_category_poi_count integer,
  direct_competitor_count integer,
  franchise_competitor_count integer,
  own_brand_store_count_1km integer,
  competitor_growth_90d numeric(10, 4),

  saturation_index numeric(10, 2),
  category_specialization_index numeric(10, 2),
  demand_gap_index numeric(10, 2),

  estimated_sales_index numeric(10, 2),
  estimated_transaction_index numeric(10, 2),
  weekday_sales_ratio numeric(10, 4),
  weekend_sales_ratio numeric(10, 4),
  avg_ticket_index numeric(10, 2),

  nearest_subway_distance_m integer,
  subway_station_count_500m integer,
  subway_ridership_index numeric(10, 2),
  bus_stop_count_500m integer,
  bus_flow_index numeric(10, 2),
  parking_score numeric(10, 2),
  visibility_score numeric(10, 2),

  building_age_years numeric(10, 2),
  building_floor_count integer,
  building_commercial_fit_score numeric(10, 2),
  residential_complex_households_500m integer,

  school_count_1km integer,
  hospital_count_1km integer,
  office_count_500m integer,
  anchor_facility_score numeric(10, 2),

  business_status text,
  tax_status text,
  abnormal_business_flag boolean,
  search_interest_change_30d numeric(10, 4),
  review_rating_index numeric(10, 2),
  review_volume_change_90d numeric(10, 4),

  benchmark_open_growth_index numeric(10, 2),
  benchmark_closure_risk_index numeric(10, 2),
  competitor_brand_pressure_index numeric(10, 2),

  tourism_demand_score numeric(10, 2),
  tourism_diversity_score numeric(10, 2),

  weather_sensitivity_score numeric(10, 2),
  air_quality_risk_score numeric(10, 2),

  night_safety_score numeric(10, 2),
  late_hour_flow_index numeric(10, 2),

  demand_payload jsonb not null default '{}'::jsonb,
  competition_payload jsonb not null default '{}'::jsonb,
  sales_payload jsonb not null default '{}'::jsonb,
  access_payload jsonb not null default '{}'::jsonb,
  building_payload jsonb not null default '{}'::jsonb,
  anchor_payload jsonb not null default '{}'::jsonb,
  anomaly_payload jsonb not null default '{}'::jsonb,
  benchmark_payload jsonb not null default '{}'::jsonb,
  tourism_payload jsonb not null default '{}'::jsonb,
  environment_payload jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint hq_site_feature_target_ck
    check (
      (target_kind = 'store' and store_id is not null and candidate_site_id is null)
      or
      (target_kind = 'candidate_site' and candidate_site_id is not null and store_id is null)
    )
);

create unique index if not exists uq_hq_site_feature_snapshots_store
  on public.hq_site_feature_snapshots (store_id, snapshot_date, analysis_radius_m)
  where target_kind = 'store' and store_id is not null;

create unique index if not exists uq_hq_site_feature_snapshots_candidate
  on public.hq_site_feature_snapshots (candidate_site_id, snapshot_date, analysis_radius_m)
  where target_kind = 'candidate_site' and candidate_site_id is not null;

create index if not exists idx_hq_site_feature_snapshots_brand_region_category
  on public.hq_site_feature_snapshots (brand_id, region_code, category_id, snapshot_date desc);

create index if not exists idx_hq_site_feature_snapshots_snapshot_date
  on public.hq_site_feature_snapshots (snapshot_date desc);

drop trigger if exists trg_hq_site_feature_snapshots_updated_at on public.hq_site_feature_snapshots;
create trigger trg_hq_site_feature_snapshots_updated_at
before update on public.hq_site_feature_snapshots
for each row
execute function public.tg_set_updated_at();

create table if not exists public.hq_region_market_snapshots (
  id bigserial primary key,
  brand_id bigint not null references public.hq_brands(id) on delete cascade,
  region_code text not null,
  region_name text,
  category_id integer,
  category_name text,
  snapshot_month date not null,

  resident_population numeric(18, 2),
  living_population numeric(18, 2),
  worker_population numeric(18, 2),
  resident_population_change_3m numeric(10, 4),
  resident_population_change_12m numeric(10, 4),
  living_population_change_3m numeric(10, 4),
  living_population_change_12m numeric(10, 4),

  same_category_poi_count integer,
  competitor_growth_90d numeric(10, 4),
  saturation_index numeric(10, 2),
  estimated_sales_index numeric(10, 2),
  tourism_demand_score numeric(10, 2),

  population_growth_score integer not null default 0 check (population_growth_score between 0 and 100),
  market_heat_score integer not null default 0 check (market_heat_score between 0 and 100),
  opening_fit_score integer not null default 0 check (opening_fit_score between 0 and 100),
  growth_grade text not null default 'stable'
    check (growth_grade in ('declining', 'stable', 'growing', 'surging')),

  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_hq_region_market_snapshots_brand_region_category_month
    unique (brand_id, region_code, category_id, snapshot_month)
);

create index if not exists idx_hq_region_market_snapshots_brand_month
  on public.hq_region_market_snapshots (brand_id, snapshot_month desc);

create index if not exists idx_hq_region_market_snapshots_growth
  on public.hq_region_market_snapshots (brand_id, opening_fit_score desc, population_growth_score desc);

drop trigger if exists trg_hq_region_market_snapshots_updated_at on public.hq_region_market_snapshots;
create trigger trg_hq_region_market_snapshots_updated_at
before update on public.hq_region_market_snapshots
for each row
execute function public.tg_set_updated_at();

create table if not exists public.hq_site_scores (
  id bigserial primary key,
  target_kind text not null
    check (target_kind in ('store', 'candidate_site')),
  store_id bigint references public.hq_stores(id) on delete cascade,
  candidate_site_id bigint references public.hq_candidate_sites(id) on delete cascade,
  brand_id bigint references public.hq_brands(id) on delete cascade,
  snapshot_date date not null,
  analysis_radius_m integer not null default 500
    check (analysis_radius_m in (300, 500, 1000)),

  demand_score integer not null default 0 check (demand_score between 0 and 100),
  competition_score integer not null default 0 check (competition_score between 0 and 100),
  saturation_score integer not null default 0 check (saturation_score between 0 and 100),
  sales_potential_score integer not null default 0 check (sales_potential_score between 0 and 100),
  access_score integer not null default 0 check (access_score between 0 and 100),
  building_fit_score integer not null default 0 check (building_fit_score between 0 and 100),
  anchor_score integer not null default 0 check (anchor_score between 0 and 100),
  anomaly_score integer not null default 0 check (anomaly_score between 0 and 100),
  benchmark_score integer not null default 0 check (benchmark_score between 0 and 100),
  tourism_score integer not null default 0 check (tourism_score between 0 and 100),
  environment_score integer not null default 0 check (environment_score between 0 and 100),
  safety_score integer not null default 0 check (safety_score between 0 and 100),

  opening_fit_score integer not null default 0 check (opening_fit_score between 0 and 100),
  store_risk_score integer not null default 0 check (store_risk_score between 0 and 100),
  recovery_potential_score integer not null default 0 check (recovery_potential_score between 0 and 100),
  cannibalization_score integer not null default 0 check (cannibalization_score between 0 and 100),
  competition_pressure_score integer not null default 0 check (competition_pressure_score between 0 and 100),
  action_priority_score integer not null default 0 check (action_priority_score between 0 and 100),

  final_score integer not null default 0 check (final_score between 0 and 100),
  risk_grade text not null default 'low'
    check (risk_grade in ('low', 'medium', 'high', 'critical')),
  recommendation text not null default 'observe'
    check (recommendation in ('open', 'review', 'improve', 'hold', 'close', 'observe')),

  summary_text text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint hq_site_scores_target_ck
    check (
      (target_kind = 'store' and store_id is not null and candidate_site_id is null)
      or
      (target_kind = 'candidate_site' and candidate_site_id is not null and store_id is null)
    )
);

create unique index if not exists uq_hq_site_scores_store
  on public.hq_site_scores (store_id, snapshot_date, analysis_radius_m)
  where target_kind = 'store' and store_id is not null;

create unique index if not exists uq_hq_site_scores_candidate
  on public.hq_site_scores (candidate_site_id, snapshot_date, analysis_radius_m)
  where target_kind = 'candidate_site' and candidate_site_id is not null;

create index if not exists idx_hq_site_scores_brand_priority
  on public.hq_site_scores (brand_id, action_priority_score desc, store_risk_score desc, opening_fit_score desc);

create index if not exists idx_hq_site_scores_snapshot_date
  on public.hq_site_scores (snapshot_date desc);

drop trigger if exists trg_hq_site_scores_updated_at on public.hq_site_scores;
create trigger trg_hq_site_scores_updated_at
before update on public.hq_site_scores
for each row
execute function public.tg_set_updated_at();

create table if not exists public.hq_site_reasons (
  id bigserial primary key,
  score_id bigint not null references public.hq_site_scores(id) on delete cascade,
  rank_order smallint not null default 1,
  reason_code text not null,
  reason_label text not null,
  reason_bucket text not null
    check (
      reason_bucket in (
        'demand',
        'competition',
        'saturation',
        'sales',
        'access',
        'building',
        'anchor',
        'anomaly',
        'benchmark',
        'tourism',
        'environment',
        'safety',
        'operations'
      )
    ),
  direction text not null default 'risk'
    check (direction in ('risk', 'opportunity', 'action')),
  metric_key text,
  metric_value_text text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint uq_hq_site_reasons_score_rank unique (score_id, rank_order)
);

create index if not exists idx_hq_site_reasons_score_id
  on public.hq_site_reasons (score_id, rank_order);

create index if not exists idx_hq_site_reasons_reason_code
  on public.hq_site_reasons (reason_code);

create table if not exists public.hq_site_actions (
  id bigserial primary key,
  score_id bigint not null references public.hq_site_scores(id) on delete cascade,
  reason_id bigint references public.hq_site_reasons(id) on delete set null,
  action_code text not null,
  title text not null,
  why_text text,
  playbook_text text,
  owner_type text not null default 'hq'
    check (owner_type in ('hq', 'sv', 'store_owner')),
  priority smallint not null default 3
    check (priority between 1 and 5),
  status text not null default 'recommended'
    check (status in ('recommended', 'accepted', 'in_progress', 'done', 'dismissed')),
  due_date date,
  expected_effect text,
  action_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_hq_site_actions_score_code unique (score_id, action_code)
);

create index if not exists idx_hq_site_actions_score_id
  on public.hq_site_actions (score_id);

create index if not exists idx_hq_site_actions_status_priority
  on public.hq_site_actions (status, priority);

drop trigger if exists trg_hq_site_actions_updated_at on public.hq_site_actions;
create trigger trg_hq_site_actions_updated_at
before update on public.hq_site_actions
for each row
execute function public.tg_set_updated_at();

create table if not exists public.hq_action_runs (
  id bigserial primary key,
  action_id bigint not null references public.hq_site_actions(id) on delete cascade,
  store_id bigint references public.hq_stores(id) on delete cascade,
  run_status text not null default 'planned'
    check (run_status in ('planned', 'started', 'done', 'dismissed')),
  started_at timestamptz,
  finished_at timestamptz,
  before_risk_score integer check (before_risk_score between 0 and 100),
  after_risk_score integer check (after_risk_score between 0 and 100),
  before_sales_index numeric(10, 2),
  after_sales_index numeric(10, 2),
  result_summary text,
  owner_note text,
  result_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hq_action_runs_action_id
  on public.hq_action_runs (action_id);

create index if not exists idx_hq_action_runs_store_id
  on public.hq_action_runs (store_id);

create index if not exists idx_hq_action_runs_run_status
  on public.hq_action_runs (run_status);

drop trigger if exists trg_hq_action_runs_updated_at on public.hq_action_runs;
create trigger trg_hq_action_runs_updated_at
before update on public.hq_action_runs
for each row
execute function public.tg_set_updated_at();

create table if not exists public.hq_brand_portfolio_snapshots (
  id bigserial primary key,
  brand_id bigint not null references public.hq_brands(id) on delete cascade,
  snapshot_month date not null,

  total_store_count integer not null default 0,
  active_store_count integer not null default 0,
  high_risk_store_count integer not null default 0,
  critical_store_count integer not null default 0,
  recoverable_store_count integer not null default 0,
  close_review_store_count integer not null default 0,
  candidate_site_count integer not null default 0,

  avg_store_risk_score numeric(10, 2),
  avg_opening_fit_score numeric(10, 2),
  avg_recovery_potential_score numeric(10, 2),
  avg_action_priority_score numeric(10, 2),

  open_action_count integer not null default 0,
  done_action_count integer not null default 0,

  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_hq_brand_portfolio_snapshots_brand_month
    unique (brand_id, snapshot_month)
);

create index if not exists idx_hq_brand_portfolio_snapshots_brand_month
  on public.hq_brand_portfolio_snapshots (brand_id, snapshot_month desc);

drop trigger if exists trg_hq_brand_portfolio_snapshots_updated_at on public.hq_brand_portfolio_snapshots;
create trigger trg_hq_brand_portfolio_snapshots_updated_at
before update on public.hq_brand_portfolio_snapshots
for each row
execute function public.tg_set_updated_at();

create or replace view public.v_hq_store_latest_scores as
with latest_scores as (
  select distinct on (ss.store_id)
    ss.*
  from public.hq_site_scores ss
  where ss.target_kind = 'store'
    and ss.store_id is not null
  order by ss.store_id, ss.snapshot_date desc, ss.updated_at desc
)
select
  b.id as brand_id,
  b.brand_key,
  b.brand_name,
  s.id as store_id,
  s.store_name,
  s.store_code,
  s.store_kind,
  s.store_status,
  s.region_code,
  s.region_name,
  s.category_id,
  s.category_name,
  ls.snapshot_date,
  ls.analysis_radius_m,
  ls.demand_score,
  ls.competition_score,
  ls.saturation_score,
  ls.sales_potential_score,
  ls.access_score,
  ls.building_fit_score,
  ls.anchor_score,
  ls.anomaly_score,
  ls.benchmark_score,
  ls.tourism_score,
  ls.environment_score,
  ls.safety_score,
  ls.opening_fit_score,
  ls.store_risk_score,
  ls.recovery_potential_score,
  ls.cannibalization_score,
  ls.competition_pressure_score,
  ls.action_priority_score,
  ls.final_score,
  ls.risk_grade,
  ls.recommendation,
  ls.summary_text,
  fs.resident_population,
  fs.worker_population,
  fs.living_population,
  fs.resident_population_change_12m,
  fs.living_population_change_3m,
  fs.direct_competitor_count,
  fs.franchise_competitor_count,
  fs.own_brand_store_count_1km,
  fs.saturation_index,
  fs.estimated_sales_index,
  fs.nearest_subway_distance_m,
  fs.bus_stop_count_500m,
  fs.building_commercial_fit_score,
  fs.anchor_facility_score,
  fs.business_status,
  fs.abnormal_business_flag,
  fs.competitor_brand_pressure_index,
  fs.tourism_demand_score,
  fs.weather_sensitivity_score,
  fs.night_safety_score,
  rr.top_reasons,
  aa.pending_actions
from latest_scores ls
join public.hq_stores s
  on s.id = ls.store_id
join public.hq_brands b
  on b.id = s.brand_id
left join public.hq_site_feature_snapshots fs
  on fs.target_kind = 'store'
 and fs.store_id = s.id
 and fs.snapshot_date = ls.snapshot_date
 and fs.analysis_radius_m = ls.analysis_radius_m
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'rank_order', r.rank_order,
      'reason_code', r.reason_code,
      'reason_label', r.reason_label,
      'reason_bucket', r.reason_bucket,
      'direction', r.direction,
      'metric_key', r.metric_key,
      'metric_value_text', r.metric_value_text
    )
    order by r.rank_order
  ) as top_reasons
  from public.hq_site_reasons r
  where r.score_id = ls.id
    and r.rank_order <= 3
) rr on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'action_id', a.id,
      'action_code', a.action_code,
      'title', a.title,
      'status', a.status,
      'priority', a.priority,
      'owner_type', a.owner_type,
      'due_date', a.due_date
    )
    order by a.priority asc, a.created_at desc
  ) as pending_actions
  from public.hq_site_actions a
  where a.score_id = ls.id
    and a.status in ('recommended', 'accepted', 'in_progress')
) aa on true;

create or replace view public.v_hq_candidate_site_latest_scores as
with latest_scores as (
  select distinct on (ss.candidate_site_id)
    ss.*
  from public.hq_site_scores ss
  where ss.target_kind = 'candidate_site'
    and ss.candidate_site_id is not null
  order by ss.candidate_site_id, ss.snapshot_date desc, ss.updated_at desc
)
select
  b.id as brand_id,
  b.brand_key,
  b.brand_name,
  c.id as candidate_site_id,
  c.site_name,
  c.review_status,
  c.region_code,
  c.region_name,
  c.category_id,
  c.category_name,
  ls.snapshot_date,
  ls.analysis_radius_m,
  ls.demand_score,
  ls.competition_score,
  ls.saturation_score,
  ls.sales_potential_score,
  ls.access_score,
  ls.building_fit_score,
  ls.anchor_score,
  ls.benchmark_score,
  ls.tourism_score,
  ls.environment_score,
  ls.safety_score,
  ls.opening_fit_score,
  ls.cannibalization_score,
  ls.competition_pressure_score,
  ls.final_score,
  ls.risk_grade,
  ls.recommendation,
  ls.summary_text,
  fs.resident_population,
  fs.worker_population,
  fs.living_population,
  fs.resident_population_change_12m,
  fs.living_population_change_3m,
  fs.direct_competitor_count,
  fs.franchise_competitor_count,
  fs.own_brand_store_count_1km,
  fs.saturation_index,
  fs.estimated_sales_index,
  fs.nearest_subway_distance_m,
  fs.bus_stop_count_500m,
  fs.building_commercial_fit_score,
  fs.anchor_facility_score,
  fs.competitor_brand_pressure_index,
  fs.tourism_demand_score,
  rr.top_reasons
from latest_scores ls
join public.hq_candidate_sites c
  on c.id = ls.candidate_site_id
join public.hq_brands b
  on b.id = c.brand_id
left join public.hq_site_feature_snapshots fs
  on fs.target_kind = 'candidate_site'
 and fs.candidate_site_id = c.id
 and fs.snapshot_date = ls.snapshot_date
 and fs.analysis_radius_m = ls.analysis_radius_m
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'rank_order', r.rank_order,
      'reason_code', r.reason_code,
      'reason_label', r.reason_label,
      'reason_bucket', r.reason_bucket,
      'direction', r.direction,
      'metric_key', r.metric_key,
      'metric_value_text', r.metric_value_text
    )
    order by r.rank_order
  ) as top_reasons
  from public.hq_site_reasons r
  where r.score_id = ls.id
    and r.rank_order <= 3
) rr on true;

create or replace view public.v_hq_region_growth_latest as
select distinct on (r.brand_id, r.region_code, r.category_id)
  r.brand_id,
  r.region_code,
  r.region_name,
  r.category_id,
  r.category_name,
  r.snapshot_month,
  r.resident_population,
  r.living_population,
  r.worker_population,
  r.resident_population_change_3m,
  r.resident_population_change_12m,
  r.living_population_change_3m,
  r.living_population_change_12m,
  r.same_category_poi_count,
  r.competitor_growth_90d,
  r.saturation_index,
  r.estimated_sales_index,
  r.tourism_demand_score,
  r.population_growth_score,
  r.market_heat_score,
  r.opening_fit_score,
  r.growth_grade,
  r.evidence
from public.hq_region_market_snapshots r
order by r.brand_id, r.region_code, r.category_id, r.snapshot_month desc, r.updated_at desc;

create or replace view public.v_hq_brand_portfolio_latest as
select distinct on (p.brand_id)
  p.brand_id,
  b.brand_key,
  b.brand_name,
  p.snapshot_month,
  p.total_store_count,
  p.active_store_count,
  p.high_risk_store_count,
  p.critical_store_count,
  p.recoverable_store_count,
  p.close_review_store_count,
  p.candidate_site_count,
  p.avg_store_risk_score,
  p.avg_opening_fit_score,
  p.avg_recovery_potential_score,
  p.avg_action_priority_score,
  p.open_action_count,
  p.done_action_count,
  p.evidence
from public.hq_brand_portfolio_snapshots p
join public.hq_brands b
  on b.id = p.brand_id
order by p.brand_id, p.snapshot_month desc, p.updated_at desc;

create or replace function public.get_hq_dashboard_summary(
  p_brand_id bigint default null
)
returns table (
  latest_snapshot_date date,
  brand_count bigint,
  store_count bigint,
  candidate_site_count bigint,
  high_risk_store_count bigint,
  critical_store_count bigint,
  recoverable_store_count bigint,
  open_action_count bigint,
  growth_region_count bigint
)
language sql
stable
as $$
  with latest_store as (
    select *
    from public.v_hq_store_latest_scores
    where p_brand_id is null or brand_id = p_brand_id
  ),
  latest_candidate as (
    select *
    from public.v_hq_candidate_site_latest_scores
    where p_brand_id is null or brand_id = p_brand_id
  ),
  latest_region as (
    select *
    from public.v_hq_region_growth_latest
    where p_brand_id is null or brand_id = p_brand_id
  ),
  open_actions as (
    select count(*) as cnt
    from public.hq_site_actions a
    join public.hq_site_scores s
      on s.id = a.score_id
    where a.status in ('recommended', 'accepted', 'in_progress')
      and (p_brand_id is null or s.brand_id = p_brand_id)
  )
  select
    greatest(
      coalesce((select max(snapshot_date) from latest_store), date '1900-01-01'),
      coalesce((select max(snapshot_date) from latest_candidate), date '1900-01-01'),
      coalesce((select max(snapshot_month) from latest_region), date '1900-01-01')
    ) as latest_snapshot_date,
    count(distinct b.id) as brand_count,
    count(distinct ls.store_id) as store_count,
    count(distinct lc.candidate_site_id) as candidate_site_count,
    count(distinct case when ls.store_risk_score >= 70 then ls.store_id end) as high_risk_store_count,
    count(distinct case when ls.store_risk_score >= 85 then ls.store_id end) as critical_store_count,
    count(distinct case when ls.recovery_potential_score >= 60 then ls.store_id end) as recoverable_store_count,
    coalesce((select cnt from open_actions), 0) as open_action_count,
    count(distinct case when lr.population_growth_score >= 60 then lr.region_code end) as growth_region_count
  from public.hq_brands b
  left join latest_store ls
    on ls.brand_id = b.id
  left join latest_candidate lc
    on lc.brand_id = b.id
  left join latest_region lr
    on lr.brand_id = b.id
  where p_brand_id is null or b.id = p_brand_id;
$$;

create or replace function public.get_hq_store_rankings(
  p_brand_id bigint default null,
  p_region_code text default null,
  p_store_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  brand_id bigint,
  brand_name text,
  store_id bigint,
  store_name text,
  store_code text,
  store_status text,
  region_code text,
  region_name text,
  category_id integer,
  category_name text,
  snapshot_date date,
  store_risk_score integer,
  recovery_potential_score integer,
  action_priority_score integer,
  cannibalization_score integer,
  competition_pressure_score integer,
  risk_grade text,
  recommendation text,
  direct_competitor_count integer,
  resident_population numeric,
  resident_population_change_12m numeric,
  living_population_change_3m numeric,
  estimated_sales_index numeric,
  top_reasons jsonb,
  pending_actions jsonb
)
language sql
stable
as $$
  select
    brand_id,
    brand_name,
    store_id,
    store_name,
    store_code,
    store_status,
    region_code,
    region_name,
    category_id,
    category_name,
    snapshot_date,
    store_risk_score,
    recovery_potential_score,
    action_priority_score,
    cannibalization_score,
    competition_pressure_score,
    risk_grade,
    recommendation,
    direct_competitor_count,
    resident_population,
    resident_population_change_12m,
    living_population_change_3m,
    estimated_sales_index,
    top_reasons,
    pending_actions
  from public.v_hq_store_latest_scores
  where (p_brand_id is null or brand_id = p_brand_id)
    and (p_region_code is null or region_code = p_region_code)
    and (p_store_status is null or store_status = p_store_status)
  order by
    action_priority_score desc,
    store_risk_score desc,
    recovery_potential_score desc,
    snapshot_date desc,
    store_id desc
  limit greatest(coalesce(p_limit, 50), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.get_hq_candidate_site_rankings(
  p_brand_id bigint default null,
  p_region_code text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  brand_id bigint,
  brand_name text,
  candidate_site_id bigint,
  site_name text,
  review_status text,
  region_code text,
  region_name text,
  category_id integer,
  category_name text,
  snapshot_date date,
  opening_fit_score integer,
  competition_pressure_score integer,
  cannibalization_score integer,
  risk_grade text,
  recommendation text,
  resident_population numeric,
  resident_population_change_12m numeric,
  living_population_change_3m numeric,
  direct_competitor_count integer,
  saturation_index numeric,
  estimated_sales_index numeric,
  top_reasons jsonb
)
language sql
stable
as $$
  select
    brand_id,
    brand_name,
    candidate_site_id,
    site_name,
    review_status,
    region_code,
    region_name,
    category_id,
    category_name,
    snapshot_date,
    opening_fit_score,
    competition_pressure_score,
    cannibalization_score,
    risk_grade,
    recommendation,
    resident_population,
    resident_population_change_12m,
    living_population_change_3m,
    direct_competitor_count,
    saturation_index,
    estimated_sales_index,
    top_reasons
  from public.v_hq_candidate_site_latest_scores
  where (p_brand_id is null or brand_id = p_brand_id)
    and (p_region_code is null or region_code = p_region_code)
  order by
    opening_fit_score desc,
    estimated_sales_index desc nulls last,
    resident_population_change_12m desc nulls last,
    candidate_site_id desc
  limit greatest(coalesce(p_limit, 50), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.get_hq_region_growth_rankings(
  p_brand_id bigint default null,
  p_category_id integer default null,
  p_direction text default 'growth',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  brand_id bigint,
  region_code text,
  region_name text,
  category_id integer,
  category_name text,
  snapshot_month date,
  population_growth_score integer,
  market_heat_score integer,
  opening_fit_score integer,
  growth_grade text,
  resident_population_change_3m numeric,
  resident_population_change_12m numeric,
  living_population_change_3m numeric,
  living_population_change_12m numeric,
  same_category_poi_count integer,
  competitor_growth_90d numeric,
  saturation_index numeric,
  estimated_sales_index numeric,
  tourism_demand_score numeric,
  evidence jsonb
)
language plpgsql
stable
as $$
begin
  if lower(coalesce(p_direction, 'growth')) = 'decline' then
    return query
    select
      brand_id,
      region_code,
      region_name,
      category_id,
      category_name,
      snapshot_month,
      population_growth_score,
      market_heat_score,
      opening_fit_score,
      growth_grade,
      resident_population_change_3m,
      resident_population_change_12m,
      living_population_change_3m,
      living_population_change_12m,
      same_category_poi_count,
      competitor_growth_90d,
      saturation_index,
      estimated_sales_index,
      tourism_demand_score,
      evidence
    from public.v_hq_region_growth_latest
    where (p_brand_id is null or brand_id = p_brand_id)
      and (p_category_id is null or category_id = p_category_id)
    order by
      resident_population_change_12m asc nulls last,
      living_population_change_3m asc nulls last,
      opening_fit_score asc,
      region_code asc
    limit greatest(coalesce(p_limit, 50), 1)
    offset greatest(coalesce(p_offset, 0), 0);
  else
    return query
    select
      brand_id,
      region_code,
      region_name,
      category_id,
      category_name,
      snapshot_month,
      population_growth_score,
      market_heat_score,
      opening_fit_score,
      growth_grade,
      resident_population_change_3m,
      resident_population_change_12m,
      living_population_change_3m,
      living_population_change_12m,
      same_category_poi_count,
      competitor_growth_90d,
      saturation_index,
      estimated_sales_index,
      tourism_demand_score,
      evidence
    from public.v_hq_region_growth_latest
    where (p_brand_id is null or brand_id = p_brand_id)
      and (p_category_id is null or category_id = p_category_id)
    order by
      opening_fit_score desc,
      population_growth_score desc,
      resident_population_change_12m desc nulls last,
      living_population_change_3m desc nulls last,
      region_code asc
    limit greatest(coalesce(p_limit, 50), 1)
    offset greatest(coalesce(p_offset, 0), 0);
  end if;
end;
$$;

create or replace function public.get_hq_action_board(
  p_brand_id bigint default null,
  p_status text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  action_id bigint,
  brand_id bigint,
  brand_name text,
  store_id bigint,
  store_name text,
  region_code text,
  region_name text,
  category_id integer,
  category_name text,
  snapshot_date date,
  action_code text,
  title text,
  why_text text,
  playbook_text text,
  owner_type text,
  priority smallint,
  status text,
  due_date date,
  expected_effect text,
  store_risk_score integer,
  recovery_potential_score integer,
  action_priority_score integer,
  recent_run_status text,
  recent_result_summary text
)
language sql
stable
as $$
  with latest_runs as (
    select distinct on (r.action_id)
      r.action_id,
      r.run_status,
      r.result_summary
    from public.hq_action_runs r
    order by r.action_id, r.created_at desc
  )
  select
    a.id as action_id,
    b.id as brand_id,
    b.brand_name,
    s.id as store_id,
    s.store_name,
    s.region_code,
    s.region_name,
    s.category_id,
    s.category_name,
    sc.snapshot_date,
    a.action_code,
    a.title,
    a.why_text,
    a.playbook_text,
    a.owner_type,
    a.priority,
    a.status,
    a.due_date,
    a.expected_effect,
    sc.store_risk_score,
    sc.recovery_potential_score,
    sc.action_priority_score,
    lr.run_status as recent_run_status,
    lr.result_summary as recent_result_summary
  from public.hq_site_actions a
  join public.hq_site_scores sc
    on sc.id = a.score_id
   and sc.target_kind = 'store'
  join public.hq_stores s
    on s.id = sc.store_id
  join public.hq_brands b
    on b.id = s.brand_id
  left join latest_runs lr
    on lr.action_id = a.id
  where (p_brand_id is null or b.id = p_brand_id)
    and (p_status is null or a.status = p_status)
  order by
    a.status asc,
    a.priority asc,
    sc.action_priority_score desc,
    sc.store_risk_score desc,
    a.created_at desc
  limit greatest(coalesce(p_limit, 100), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.get_hq_store_detail(
  p_store_id bigint
)
returns table (
  brand_id bigint,
  brand_name text,
  store_id bigint,
  store_name text,
  store_code text,
  store_status text,
  region_code text,
  region_name text,
  category_id integer,
  category_name text,
  snapshot_date date,
  summary_text text,
  store_risk_score integer,
  recovery_potential_score integer,
  action_priority_score integer,
  recommendation text,
  risk_grade text,
  feature_snapshot jsonb,
  reasons jsonb,
  actions jsonb,
  action_runs jsonb
)
language sql
stable
as $$
  with latest_score as (
    select
      ss.*
    from public.hq_site_scores ss
    where ss.target_kind = 'store'
      and ss.store_id = p_store_id
    order by ss.snapshot_date desc, ss.updated_at desc
    limit 1
  ),
  latest_feature as (
    select
      fs.*
    from public.hq_site_feature_snapshots fs
    join latest_score ls
      on fs.target_kind = 'store'
     and fs.store_id = ls.store_id
     and fs.snapshot_date = ls.snapshot_date
     and fs.analysis_radius_m = ls.analysis_radius_m
    limit 1
  )
  select
    b.id as brand_id,
    b.brand_name,
    s.id as store_id,
    s.store_name,
    s.store_code,
    s.store_status,
    s.region_code,
    s.region_name,
    s.category_id,
    s.category_name,
    ls.snapshot_date,
    ls.summary_text,
    ls.store_risk_score,
    ls.recovery_potential_score,
    ls.action_priority_score,
    ls.recommendation,
    ls.risk_grade,
    jsonb_build_object(
      'resident_population', lf.resident_population,
      'worker_population', lf.worker_population,
      'living_population', lf.living_population,
      'resident_population_change_3m', lf.resident_population_change_3m,
      'resident_population_change_12m', lf.resident_population_change_12m,
      'living_population_change_3m', lf.living_population_change_3m,
      'living_population_change_12m', lf.living_population_change_12m,
      'same_category_poi_count', lf.same_category_poi_count,
      'direct_competitor_count', lf.direct_competitor_count,
      'franchise_competitor_count', lf.franchise_competitor_count,
      'own_brand_store_count_1km', lf.own_brand_store_count_1km,
      'competitor_growth_90d', lf.competitor_growth_90d,
      'saturation_index', lf.saturation_index,
      'estimated_sales_index', lf.estimated_sales_index,
      'nearest_subway_distance_m', lf.nearest_subway_distance_m,
      'bus_stop_count_500m', lf.bus_stop_count_500m,
      'building_commercial_fit_score', lf.building_commercial_fit_score,
      'anchor_facility_score', lf.anchor_facility_score,
      'business_status', lf.business_status,
      'tax_status', lf.tax_status,
      'abnormal_business_flag', lf.abnormal_business_flag,
      'search_interest_change_30d', lf.search_interest_change_30d,
      'review_rating_index', lf.review_rating_index,
      'review_volume_change_90d', lf.review_volume_change_90d,
      'benchmark_open_growth_index', lf.benchmark_open_growth_index,
      'benchmark_closure_risk_index', lf.benchmark_closure_risk_index,
      'competitor_brand_pressure_index', lf.competitor_brand_pressure_index,
      'tourism_demand_score', lf.tourism_demand_score,
      'tourism_diversity_score', lf.tourism_diversity_score,
      'weather_sensitivity_score', lf.weather_sensitivity_score,
      'air_quality_risk_score', lf.air_quality_risk_score,
      'night_safety_score', lf.night_safety_score,
      'late_hour_flow_index', lf.late_hour_flow_index
    ) as feature_snapshot,
    (
      select jsonb_agg(
        jsonb_build_object(
          'reason_id', r.id,
          'rank_order', r.rank_order,
          'reason_code', r.reason_code,
          'reason_label', r.reason_label,
          'reason_bucket', r.reason_bucket,
          'direction', r.direction,
          'metric_key', r.metric_key,
          'metric_value_text', r.metric_value_text,
          'evidence', r.evidence
        )
        order by r.rank_order
      )
      from public.hq_site_reasons r
      where r.score_id = ls.id
    ) as reasons,
    (
      select jsonb_agg(
        jsonb_build_object(
          'action_id', a.id,
          'action_code', a.action_code,
          'title', a.title,
          'why_text', a.why_text,
          'playbook_text', a.playbook_text,
          'owner_type', a.owner_type,
          'priority', a.priority,
          'status', a.status,
          'due_date', a.due_date,
          'expected_effect', a.expected_effect
        )
        order by a.priority asc, a.created_at desc
      )
      from public.hq_site_actions a
      where a.score_id = ls.id
    ) as actions,
    (
      select jsonb_agg(
        jsonb_build_object(
          'run_id', ar.id,
          'action_id', ar.action_id,
          'run_status', ar.run_status,
          'started_at', ar.started_at,
          'finished_at', ar.finished_at,
          'before_risk_score', ar.before_risk_score,
          'after_risk_score', ar.after_risk_score,
          'before_sales_index', ar.before_sales_index,
          'after_sales_index', ar.after_sales_index,
          'result_summary', ar.result_summary,
          'owner_note', ar.owner_note
        )
        order by ar.created_at desc
      )
      from public.hq_action_runs ar
      join public.hq_site_actions a
        on a.id = ar.action_id
      where a.score_id = ls.id
    ) as action_runs
  from latest_score ls
  join public.hq_stores s
    on s.id = ls.store_id
  join public.hq_brands b
    on b.id = s.brand_id
  left join latest_feature lf
    on true;
$$;

commit;