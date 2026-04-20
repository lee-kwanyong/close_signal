-- supabase/migrations/20260421_create_quality_snapshot_collectors.sql

begin;

create extension if not exists pgcrypto;

create table if not exists public.snapshot_review_region_category_day (
  id bigserial primary key,
  snapshot_date date not null,
  source_id bigint,
  source_run_id bigint,
  region_level text not null default 'sigungu'
    check (region_level in ('nation', 'sido', 'sigungu', 'emd')),
  region_code text not null,
  region_name text,
  category_id integer not null,
  category_name text,
  review_count numeric,
  avg_rating numeric,
  positive_review_ratio numeric,
  negative_review_ratio numeric,
  repeat_visit_keyword_ratio numeric,
  service_keyword_ratio numeric,
  taste_keyword_ratio numeric,
  value_keyword_ratio numeric,
  review_change_30d numeric,
  mention_change_30d numeric,
  top_positive_keywords jsonb not null default '[]'::jsonb,
  top_negative_keywords jsonb not null default '[]'::jsonb,
  observed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_snapshot_review_region_category_day
    unique (snapshot_date, region_level, region_code, category_id)
);

create index if not exists idx_snapshot_review_region_category_day_lookup
  on public.snapshot_review_region_category_day (region_code, category_id, snapshot_date desc);

create index if not exists idx_snapshot_review_region_category_day_source_run_id
  on public.snapshot_review_region_category_day (source_run_id);

drop trigger if exists trg_snapshot_review_region_category_day_updated_at
  on public.snapshot_review_region_category_day;

create trigger trg_snapshot_review_region_category_day_updated_at
before update on public.snapshot_review_region_category_day
for each row
execute function public.tg_set_updated_at();


create table if not exists public.snapshot_accessibility_region_day (
  id bigserial primary key,
  snapshot_date date not null,
  source_id bigint,
  source_run_id bigint,
  region_level text not null default 'sigungu'
    check (region_level in ('nation', 'sido', 'sigungu', 'emd')),
  region_code text not null,
  region_name text,
  subway_station_count numeric,
  bus_stop_count numeric,
  parking_capacity_index numeric,
  foot_traffic_access_index numeric,
  transit_access_index numeric,
  road_access_index numeric,
  avg_walk_time_to_station_min numeric,
  avg_walk_time_to_bus_stop_min numeric,
  observed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_snapshot_accessibility_region_day
    unique (snapshot_date, region_level, region_code)
);

create index if not exists idx_snapshot_accessibility_region_day_lookup
  on public.snapshot_accessibility_region_day (region_code, snapshot_date desc);

create index if not exists idx_snapshot_accessibility_region_day_source_run_id
  on public.snapshot_accessibility_region_day (source_run_id);

drop trigger if exists trg_snapshot_accessibility_region_day_updated_at
  on public.snapshot_accessibility_region_day;

create trigger trg_snapshot_accessibility_region_day_updated_at
before update on public.snapshot_accessibility_region_day
for each row
execute function public.tg_set_updated_at();


create table if not exists public.snapshot_tourism_region_day (
  id bigserial primary key,
  snapshot_date date not null,
  source_id bigint,
  source_run_id bigint,
  region_level text not null default 'sigungu'
    check (region_level in ('nation', 'sido', 'sigungu', 'emd')),
  region_code text not null,
  region_name text,
  tourist_count numeric,
  visitor_index numeric,
  local_event_count numeric,
  event_demand_index numeric,
  seasonal_peak_index numeric,
  weather_sensitivity_index numeric,
  tourism_change_30d numeric,
  tourism_change_12m numeric,
  top_event_keywords jsonb not null default '[]'::jsonb,
  observed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_snapshot_tourism_region_day
    unique (snapshot_date, region_level, region_code)
);

create index if not exists idx_snapshot_tourism_region_day_lookup
  on public.snapshot_tourism_region_day (region_code, snapshot_date desc);

create index if not exists idx_snapshot_tourism_region_day_source_run_id
  on public.snapshot_tourism_region_day (source_run_id);

drop trigger if exists trg_snapshot_tourism_region_day_updated_at
  on public.snapshot_tourism_region_day;

create trigger trg_snapshot_tourism_region_day_updated_at
before update on public.snapshot_tourism_region_day
for each row
execute function public.tg_set_updated_at();


insert into public.sources (
  source_key,
  source_name,
  source_type,
  parser_key,
  is_active
)
values
  (
    'review_region_category_daily',
    'Review Region Category Daily Snapshot',
    'external_api',
    'collector.review_region_category_daily',
    true
  ),
  (
    'accessibility_region_daily',
    'Accessibility Region Daily Snapshot',
    'external_api',
    'collector.accessibility_region_daily',
    true
  ),
  (
    'tourism_region_daily',
    'Tourism Region Daily Snapshot',
    'external_api',
    'collector.tourism_region_daily',
    true
  )
on conflict (source_key)
do update set
  source_name = excluded.source_name,
  source_type = excluded.source_type,
  parser_key = excluded.parser_key,
  is_active = excluded.is_active;

commit;