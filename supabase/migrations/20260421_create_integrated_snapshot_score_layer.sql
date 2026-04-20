-- supabase/migrations/20260421_create_integrated_snapshot_score_layer.sql

begin;

create extension if not exists pgcrypto;

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.snapshot_integrated_risk_region_category_day (
  id bigserial primary key,
  snapshot_date date not null,

  source_id bigint,
  source_run_id bigint,

  region_code text not null,
  region_name text,
  category_id integer not null,
  category_name text,

  adjusted_score numeric,
  risk_grade text
    check (risk_grade in ('critical', 'high', 'medium', 'low')),

  pressure_score numeric,
  pressure_grade text
    check (pressure_grade in ('critical', 'high', 'moderate', 'observe')),

  integrated_signal_score numeric,

  resident_population numeric,
  resident_population_change_12m numeric,
  one_person_share numeric,
  households_change_12m numeric,

  avg_living_population numeric,
  living_population_change_3m numeric,

  direct_competitor_count numeric,
  competition_pressure_score numeric,
  saturation_index numeric,

  estimated_sales_index numeric,
  operating_yoy_change_pct numeric,

  avg_rating numeric,
  review_count numeric,

  transit_access_index numeric,
  tourism_demand_score numeric,

  national_share_pct numeric,
  yoy_closed_delta_pct numeric,
  close_rate_pct numeric,
  net_change numeric,

  internal_component_count integer not null default 0,
  external_component_count integer not null default 0,
  external_coverage_missing boolean not null default false,

  source_dates jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_snapshot_integrated_risk_region_category_day
    unique (snapshot_date, region_code, category_id)
);

create index if not exists idx_snapshot_integrated_risk_region_category_day_lookup
  on public.snapshot_integrated_risk_region_category_day (snapshot_date desc, region_code, category_id);

create index if not exists idx_snapshot_integrated_risk_region_category_day_score
  on public.snapshot_integrated_risk_region_category_day (snapshot_date desc, integrated_signal_score desc, adjusted_score desc);

create index if not exists idx_snapshot_integrated_risk_region_category_day_source_run_id
  on public.snapshot_integrated_risk_region_category_day (source_run_id);

drop trigger if exists trg_snapshot_integrated_risk_region_category_day_updated_at
  on public.snapshot_integrated_risk_region_category_day;

create trigger trg_snapshot_integrated_risk_region_category_day_updated_at
before update on public.snapshot_integrated_risk_region_category_day
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
    'integrated_snapshot_risk_daily',
    'Integrated Snapshot Risk Daily Refresh',
    'derived_snapshot',
    'collector.integrated_snapshot_risk_daily',
    true
  )
on conflict (source_key)
do update set
  source_name = excluded.source_name,
  source_type = excluded.source_type,
  parser_key = excluded.parser_key,
  is_active = excluded.is_active;

create or replace view public.v_integrated_risk_top_current as
with latest as (
  select max(snapshot_date) as snapshot_date
  from public.snapshot_integrated_risk_region_category_day
)
select
  t.snapshot_date,
  to_char(t.snapshot_date, 'YYYY-MM') as score_month,
  t.region_code,
  t.region_name,
  t.category_id,
  t.category_name,

  t.adjusted_score,
  t.risk_grade,

  t.region_code as closure_region_code,
  t.region_name as closure_region_name,

  t.pressure_score,
  t.pressure_grade,
  t.integrated_signal_score,

  t.national_share_pct,
  t.yoy_closed_delta_pct,
  t.close_rate_pct,
  t.operating_yoy_change_pct,
  t.net_change,

  t.resident_population,
  t.resident_population_change_12m,
  t.one_person_share,
  t.households_change_12m,
  t.avg_living_population,
  t.living_population_change_3m,
  t.direct_competitor_count,
  t.competition_pressure_score,
  t.saturation_index,
  t.estimated_sales_index,
  t.avg_rating,
  t.review_count,
  t.transit_access_index,
  t.tourism_demand_score,

  t.internal_component_count,
  t.external_component_count,
  t.external_coverage_missing,
  t.source_dates,
  t.evidence,
  t.meta,
  t.created_at,
  t.updated_at
from public.snapshot_integrated_risk_region_category_day t
where t.snapshot_date = (select snapshot_date from latest);

create or replace view public.v_integrated_risk_distribution_current as
with current_rows as (
  select *
  from public.v_integrated_risk_top_current
)
select
  count(*)::bigint as total_rows,
  avg(integrated_signal_score) as avg_integrated_signal_score,
  count(*) filter (where integrated_signal_score >= 80)::bigint as critical_count,
  count(*) filter (where integrated_signal_score >= 65 and integrated_signal_score < 80)::bigint as high_count,
  count(*) filter (where integrated_signal_score >= 45 and integrated_signal_score < 65)::bigint as medium_count,
  count(*) filter (where integrated_signal_score < 45)::bigint as low_count
from current_rows;

create or replace view public.v_integrated_risk_region_aggregates_current as
with current_rows as (
  select *
  from public.v_integrated_risk_top_current
),
grouped as (
  select
    coalesce(nullif(region_name, ''), region_code) as canonical_region_name,
    avg(national_share_pct) as avg_national_share_pct,
    avg(yoy_closed_delta_pct) as avg_yoy_closed_delta_pct,
    avg(adjusted_score) as avg_adjusted_score,
    avg(integrated_signal_score) as avg_integrated_signal_score,
    max(integrated_signal_score) as max_integrated_signal_score,
    max(coalesce(pressure_score, 0)) as max_pressure_score,
    count(*)::bigint as row_count,
    count(*) filter (where integrated_signal_score >= 80)::bigint as critical_count,
    count(*) filter (where integrated_signal_score >= 65 and integrated_signal_score < 80)::bigint as high_count,
    count(*) filter (where integrated_signal_score >= 45 and integrated_signal_score < 65)::bigint as medium_count,
    count(*) filter (where integrated_signal_score < 45)::bigint as low_count
  from current_rows
  group by 1
)
select
  canonical_region_name,
  case
    when max_pressure_score >= 75 then 'critical'
    when max_pressure_score >= 55 then 'high'
    when max_pressure_score >= 35 then 'moderate'
    else 'observe'
  end as pressure_grade,
  avg_national_share_pct,
  avg_yoy_closed_delta_pct,
  avg_adjusted_score,
  avg_integrated_signal_score,
  max_integrated_signal_score,
  row_count,
  critical_count,
  high_count,
  medium_count,
  low_count
from grouped;

create or replace view public.v_integrated_risk_join_gaps_current as
select
  snapshot_date,
  to_char(snapshot_date, 'YYYY-MM') as score_month,
  region_code,
  region_name,
  category_id,
  category_name,
  adjusted_score,
  risk_grade,
  region_code as closure_region_code,
  region_name as closure_region_name,
  pressure_grade,
  integrated_signal_score,
  source_dates,
  evidence
from public.v_integrated_risk_top_current
where external_coverage_missing = true;

commit;