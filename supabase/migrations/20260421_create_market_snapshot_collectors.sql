-- supabase/migrations/20260421_create_market_snapshot_collectors.sql

begin;

create extension if not exists pgcrypto;

create table if not exists public.snapshot_competition_region_category_day (
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
  direct_competitor_count numeric,
  franchise_competitor_count numeric,
  independent_competitor_count numeric,
  same_category_poi_count numeric,
  competitor_growth_30d numeric,
  competitor_growth_90d numeric,
  saturation_index numeric,
  nearest_competitor_distance_m numeric,
  observed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_snapshot_competition_region_category_day
    unique (snapshot_date, region_level, region_code, category_id)
);

create index if not exists idx_snapshot_competition_region_category_day_lookup
  on public.snapshot_competition_region_category_day (region_code, category_id, snapshot_date desc);

create index if not exists idx_snapshot_competition_region_category_day_source_run_id
  on public.snapshot_competition_region_category_day (source_run_id);

drop trigger if exists trg_snapshot_competition_region_category_day_updated_at
  on public.snapshot_competition_region_category_day;

create trigger trg_snapshot_competition_region_category_day_updated_at
before update on public.snapshot_competition_region_category_day
for each row
execute function public.tg_set_updated_at();


create table if not exists public.snapshot_spending_region_category_day (
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
  resident_spending_index numeric,
  floating_spending_index numeric,
  total_spending_index numeric,
  card_sales_index numeric,
  average_ticket_size_index numeric,
  spending_change_3m numeric,
  spending_change_12m numeric,
  observed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_snapshot_spending_region_category_day
    unique (snapshot_date, region_level, region_code, category_id)
);

create index if not exists idx_snapshot_spending_region_category_day_lookup
  on public.snapshot_spending_region_category_day (region_code, category_id, snapshot_date desc);

create index if not exists idx_snapshot_spending_region_category_day_source_run_id
  on public.snapshot_spending_region_category_day (source_run_id);

drop trigger if exists trg_snapshot_spending_region_category_day_updated_at
  on public.snapshot_spending_region_category_day;

create trigger trg_snapshot_spending_region_category_day_updated_at
before update on public.snapshot_spending_region_category_day
for each row
execute function public.tg_set_updated_at();


create table if not exists public.snapshot_rent_region_day (
  id bigserial primary key,
  snapshot_date date not null,
  source_id bigint,
  source_run_id bigint,
  region_level text not null default 'sigungu'
    check (region_level in ('nation', 'sido', 'sigungu', 'emd')),
  region_code text not null,
  region_name text,
  avg_deposit numeric,
  avg_monthly_rent numeric,
  avg_rent_per_m2 numeric,
  vacancy_rate numeric,
  listing_count numeric,
  rent_change_12m numeric,
  vacancy_change_12m numeric,
  observed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_snapshot_rent_region_day
    unique (snapshot_date, region_level, region_code)
);

create index if not exists idx_snapshot_rent_region_day_lookup
  on public.snapshot_rent_region_day (region_code, snapshot_date desc);

create index if not exists idx_snapshot_rent_region_day_source_run_id
  on public.snapshot_rent_region_day (source_run_id);

drop trigger if exists trg_snapshot_rent_region_day_updated_at
  on public.snapshot_rent_region_day;

create trigger trg_snapshot_rent_region_day_updated_at
before update on public.snapshot_rent_region_day
for each row
execute function public.tg_set_updated_at();


create table if not exists public.snapshot_search_trend_region_category_day (
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
  search_interest_index numeric,
  brand_search_interest_index numeric,
  category_search_interest_index numeric,
  search_change_4w numeric,
  search_change_12w numeric,
  top_keywords jsonb not null default '[]'::jsonb,
  rising_keywords jsonb not null default '[]'::jsonb,
  observed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_snapshot_search_trend_region_category_day
    unique (snapshot_date, region_level, region_code, category_id)
);

create index if not exists idx_snapshot_search_trend_region_category_day_lookup
  on public.snapshot_search_trend_region_category_day (region_code, category_id, snapshot_date desc);

create index if not exists idx_snapshot_search_trend_region_category_day_source_run_id
  on public.snapshot_search_trend_region_category_day (source_run_id);

drop trigger if exists trg_snapshot_search_trend_region_category_day_updated_at
  on public.snapshot_search_trend_region_category_day;

create trigger trg_snapshot_search_trend_region_category_day_updated_at
before update on public.snapshot_search_trend_region_category_day
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
    'competition_region_category_daily',
    'Competition Region Category Daily Snapshot',
    'external_api',
    'collector.competition_region_category_daily',
    true
  ),
  (
    'spending_region_category_daily',
    'Spending Region Category Daily Snapshot',
    'external_api',
    'collector.spending_region_category_daily',
    true
  ),
  (
    'rent_region_daily',
    'Rent Region Daily Snapshot',
    'external_api',
    'collector.rent_region_daily',
    true
  ),
  (
    'search_trend_region_category_daily',
    'Search Trend Region Category Daily Snapshot',
    'external_api',
    'collector.search_trend_region_category_daily',
    true
  )
on conflict (source_key)
do update set
  source_name = excluded.source_name,
  source_type = excluded.source_type,
  parser_key = excluded.parser_key,
  is_active = excluded.is_active;

commit;