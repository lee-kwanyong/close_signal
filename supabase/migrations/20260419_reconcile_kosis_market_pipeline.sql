begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.kosis_safe_numeric(p_value text)
returns numeric
language plpgsql
immutable
as $$
declare
  v text;
begin
  if p_value is null then
    return null;
  end if;

  v := btrim(p_value);

  if v = '' then
    return null;
  end if;

  v := replace(v, ',', '');
  v := replace(v, '%', '');
  v := regexp_replace(v, '[^0-9\.\-]', '', 'g');

  if v = '' then
    return null;
  end if;

  return v::numeric;
exception
  when others then
    return null;
end;
$$;

create or replace function public.scale_score(
  p_value numeric,
  p_min numeric,
  p_max numeric,
  p_reverse boolean default false
)
returns numeric
language sql
immutable
as $$
  select case
    when p_value is null then null
    when p_min = p_max then 50::numeric
    when p_reverse = false then greatest(0::numeric, least(100::numeric, ((p_value - p_min) / nullif(p_max - p_min, 0)) * 100))
    else greatest(0::numeric, least(100::numeric, ((p_max - p_value) / nullif(p_max - p_min, 0)) * 100))
  end;
$$;

create table if not exists public.kosis_indicator_catalog (
  indicator_key text primary key
);

alter table public.kosis_indicator_catalog
  add column if not exists stage smallint,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists source_group text,
  add column if not exists endpoint_path text,
  add column if not exists table_id text,
  add column if not exists cycle text,
  add column if not exists value_unit text,
  add column if not exists region_required boolean,
  add column if not exists category_required boolean,
  add column if not exists request_params jsonb,
  add column if not exists response_data_path text[],
  add column if not exists period_field text,
  add column if not exists value_field text,
  add column if not exists label_field text,
  add column if not exists is_active boolean,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.kosis_indicator_catalog
set
  stage = coalesce(stage, 1),
  title = coalesce(title, indicator_key),
  source_group = coalesce(source_group, 'kosis'),
  endpoint_path = coalesce(endpoint_path, '/openapi/Param/statisticsParameterData.do'),
  cycle = coalesce(cycle, 'M'),
  region_required = coalesce(region_required, true),
  category_required = coalesce(category_required, false),
  request_params = coalesce(request_params, '{}'::jsonb),
  response_data_path = coalesce(response_data_path, '{}'::text[]),
  period_field = coalesce(period_field, 'PRD_DE'),
  value_field = coalesce(value_field, 'DT'),
  label_field = coalesce(label_field, 'C1_NM'),
  is_active = coalesce(is_active, true),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.kosis_indicator_catalog
  alter column stage set default 1,
  alter column title set default '',
  alter column source_group set default 'kosis',
  alter column endpoint_path set default '/openapi/Param/statisticsParameterData.do',
  alter column cycle set default 'M',
  alter column region_required set default true,
  alter column category_required set default false,
  alter column request_params set default '{}'::jsonb,
  alter column response_data_path set default '{}'::text[],
  alter column period_field set default 'PRD_DE',
  alter column value_field set default 'DT',
  alter column label_field set default 'C1_NM',
  alter column is_active set default true,
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.kosis_indicator_catalog
  alter column stage set not null,
  alter column title set not null,
  alter column source_group set not null,
  alter column endpoint_path set not null,
  alter column table_id set not null,
  alter column cycle set not null,
  alter column region_required set not null,
  alter column category_required set not null,
  alter column request_params set not null,
  alter column response_data_path set not null,
  alter column period_field set not null,
  alter column value_field set not null,
  alter column label_field set not null,
  alter column is_active set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kosis_indicator_catalog_stage_check'
  ) then
    alter table public.kosis_indicator_catalog
      add constraint kosis_indicator_catalog_stage_check
      check (stage in (1, 2));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'kosis_indicator_catalog_cycle_check'
  ) then
    alter table public.kosis_indicator_catalog
      add constraint kosis_indicator_catalog_cycle_check
      check (cycle in ('M', 'Q', 'A'));
  end if;
end $$;

create table if not exists public.region_kosis_map (
  region_code text primary key
);

alter table public.region_kosis_map
  add column if not exists region_name text,
  add column if not exists kosis_region_code text,
  add column if not exists level text,
  add column if not exists fallback_region_code text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.region_kosis_map
set
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.region_kosis_map
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'region_kosis_map'
      and column_name = 'kosis_region_code'
  ) then
    update public.region_kosis_map
    set kosis_region_code = coalesce(kosis_region_code, region_code)
    where kosis_region_code is null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'region_kosis_map'
      and column_name = 'level'
  ) then
    update public.region_kosis_map
    set level = coalesce(level, 'sigungu')
    where level is null;
  end if;
end $$;

alter table public.region_kosis_map
  alter column kosis_region_code set not null,
  alter column level set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'region_kosis_map_level_check'
  ) then
    alter table public.region_kosis_map
      add constraint region_kosis_map_level_check
      check (level in ('sido', 'sigungu', 'emd'));
  end if;
end $$;

create table if not exists public.category_kosis_map (
  category_id text not null,
  indicator_key text not null,
  kosis_class_code text not null,
  primary key (category_id, indicator_key, kosis_class_code)
);

alter table public.category_kosis_map
  add column if not exists label text,
  add column if not exists weight numeric(8,4),
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.category_kosis_map
set
  weight = coalesce(weight, 1.0),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.category_kosis_map
  alter column weight set default 1.0,
  alter column created_at set default now(),
  alter column updated_at set default now(),
  alter column weight set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'category_kosis_map_indicator_key_fkey'
  ) then
    alter table public.category_kosis_map
      add constraint category_kosis_map_indicator_key_fkey
      foreign key (indicator_key)
      references public.kosis_indicator_catalog(indicator_key)
      on delete cascade;
  end if;
end $$;

create table if not exists public.regional_market_indicators_raw (
  id bigserial primary key
);

alter table public.regional_market_indicators_raw
  add column if not exists indicator_key text,
  add column if not exists region_code text,
  add column if not exists category_id text,
  add column if not exists base_period text,
  add column if not exists period_type text,
  add column if not exists value_num numeric,
  add column if not exists value_text text,
  add column if not exists label text,
  add column if not exists source_value jsonb,
  add column if not exists source_table_id text,
  add column if not exists source_region_code text,
  add column if not exists source_class_code text,
  add column if not exists collected_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.regional_market_indicators_raw
set
  category_id = coalesce(category_id, '__ALL__'),
  source_value = coalesce(source_value, '{}'::jsonb),
  collected_at = coalesce(collected_at, now()),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.regional_market_indicators_raw
  alter column category_id set default '__ALL__',
  alter column source_value set default '{}'::jsonb,
  alter column collected_at set default now(),
  alter column created_at set default now(),
  alter column updated_at set default now(),
  alter column indicator_key set not null,
  alter column region_code set not null,
  alter column category_id set not null,
  alter column base_period set not null,
  alter column period_type set not null,
  alter column source_value set not null,
  alter column source_table_id set not null,
  alter column collected_at set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'regional_market_indicators_raw_indicator_key_fkey'
  ) then
    alter table public.regional_market_indicators_raw
      add constraint regional_market_indicators_raw_indicator_key_fkey
      foreign key (indicator_key)
      references public.kosis_indicator_catalog(indicator_key)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'regional_market_indicators_raw_period_type_check'
  ) then
    alter table public.regional_market_indicators_raw
      add constraint regional_market_indicators_raw_period_type_check
      check (period_type in ('M', 'Q', 'A'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'regional_market_indicators_raw_unique_key'
  ) then
    create unique index regional_market_indicators_raw_unique_key
      on public.regional_market_indicators_raw (indicator_key, region_code, category_id, base_period);
  end if;
end $$;

create table if not exists public.regional_market_indicators (
  region_code text not null,
  category_id text not null default '__ALL__',
  base_period text not null,
  population_yoy numeric,
  employment_rate numeric,
  unemployment_rate numeric,
  business_count_yoy numeric,
  service_index numeric,
  retail_sales_index numeric,
  food_cpi numeric,
  consumer_cpi numeric,
  household_consumption numeric,
  household_income numeric,
  regional_composite_index numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (region_code, category_id, base_period)
);

alter table public.regional_market_indicators
  add column if not exists population_yoy numeric,
  add column if not exists employment_rate numeric,
  add column if not exists unemployment_rate numeric,
  add column if not exists business_count_yoy numeric,
  add column if not exists service_index numeric,
  add column if not exists retail_sales_index numeric,
  add column if not exists food_cpi numeric,
  add column if not exists consumer_cpi numeric,
  add column if not exists household_consumption numeric,
  add column if not exists household_income numeric,
  add column if not exists regional_composite_index numeric,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.regional_market_indicators
set
  category_id = coalesce(category_id, '__ALL__'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.regional_market_indicators
  alter column category_id set default '__ALL__',
  alter column created_at set default now(),
  alter column updated_at set default now(),
  alter column region_code set not null,
  alter column category_id set not null,
  alter column base_period set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

create table if not exists public.regional_market_scores (
  region_code text not null,
  category_id text not null,
  base_period text not null,
  market_risk_score numeric(5,2) not null,
  external_pressure_score numeric(5,2) not null,
  recoverability_score numeric(5,2) not null,
  price_pressure_score numeric(5,2),
  demand_resilience_score numeric(5,2),
  reasons jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (region_code, category_id, base_period)
);

alter table public.regional_market_scores
  add column if not exists price_pressure_score numeric(5,2),
  add column if not exists demand_resilience_score numeric(5,2),
  add column if not exists reasons jsonb,
  add column if not exists summary jsonb,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.regional_market_scores
set
  reasons = coalesce(reasons, '[]'::jsonb),
  summary = coalesce(summary, '{}'::jsonb),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.regional_market_scores
  alter column reasons set default '[]'::jsonb,
  alter column summary set default '{}'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now(),
  alter column reasons set not null,
  alter column summary set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

create index if not exists idx_kosis_indicator_catalog_active
  on public.kosis_indicator_catalog (is_active, stage, indicator_key);

create index if not exists idx_region_kosis_map_kosis_code
  on public.region_kosis_map (kosis_region_code);

create index if not exists idx_category_kosis_map_indicator
  on public.category_kosis_map (indicator_key, category_id);

create index if not exists idx_regional_market_raw_region_period
  on public.regional_market_indicators_raw (region_code, category_id, base_period);

create index if not exists idx_regional_market_scores_region_period
  on public.regional_market_scores (region_code, category_id, base_period desc);

drop trigger if exists trg_kosis_indicator_catalog_updated_at on public.kosis_indicator_catalog;
create trigger trg_kosis_indicator_catalog_updated_at
before update on public.kosis_indicator_catalog
for each row
execute function public.set_updated_at();

drop trigger if exists trg_region_kosis_map_updated_at on public.region_kosis_map;
create trigger trg_region_kosis_map_updated_at
before update on public.region_kosis_map
for each row
execute function public.set_updated_at();

drop trigger if exists trg_category_kosis_map_updated_at on public.category_kosis_map;
create trigger trg_category_kosis_map_updated_at
before update on public.category_kosis_map
for each row
execute function public.set_updated_at();

drop trigger if exists trg_regional_market_raw_updated_at on public.regional_market_indicators_raw;
create trigger trg_regional_market_raw_updated_at
before update on public.regional_market_indicators_raw
for each row
execute function public.set_updated_at();

drop trigger if exists trg_regional_market_indicators_updated_at on public.regional_market_indicators;
create trigger trg_regional_market_indicators_updated_at
before update on public.regional_market_indicators
for each row
execute function public.set_updated_at();

drop trigger if exists trg_regional_market_scores_updated_at on public.regional_market_scores;
create trigger trg_regional_market_scores_updated_at
before update on public.regional_market_scores
for each row
execute function public.set_updated_at();

commit;