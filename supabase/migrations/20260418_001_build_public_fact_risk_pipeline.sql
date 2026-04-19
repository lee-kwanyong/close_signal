set search_path = public;

-- =========================================================
-- 0. helper
-- =========================================================

create or replace function public._safe_int(p_value text)
returns integer
language sql
immutable
as $$
  select case
    when p_value is null or btrim(p_value) = '' then null
    else floor((p_value)::numeric)::int
  end
$$;

create or replace function public._clamp_num(
  p_value numeric,
  p_min numeric,
  p_max numeric
)
returns numeric
language sql
immutable
as $$
  select least(p_max, greatest(p_min, coalesce(p_value, p_min)))
$$;

-- =========================================================
-- 1. normalized monthly source tables
-- =========================================================

create table if not exists public.normalized_nts_business_monthly (
  base_month date not null,
  region_code text not null,
  region_name text,
  category_id integer not null,
  category_name text,
  operating_count integer,
  close_count integer,
  raw_payload jsonb not null default '{}'::jsonb,
  source_key text not null default 'nts_business_monthly',
  observed_at timestamptz,
  collected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (base_month, region_code, category_id)
);

create index if not exists idx_normalized_nts_business_monthly_month
  on public.normalized_nts_business_monthly (base_month desc);

create index if not exists idx_normalized_nts_business_monthly_region_category
  on public.normalized_nts_business_monthly (region_code, category_id, base_month desc);

create table if not exists public.normalized_sbiz_flow_monthly (
  base_month date not null,
  region_code text not null,
  region_name text,
  category_id integer not null,
  category_name text,
  open_count integer,
  close_count integer,
  raw_payload jsonb not null default '{}'::jsonb,
  source_key text not null default 'sbiz_flow_monthly',
  observed_at timestamptz,
  collected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (base_month, region_code, category_id)
);

create index if not exists idx_normalized_sbiz_flow_monthly_month
  on public.normalized_sbiz_flow_monthly (base_month desc);

create index if not exists idx_normalized_sbiz_flow_monthly_region_category
  on public.normalized_sbiz_flow_monthly (region_code, category_id, base_month desc);

-- =========================================================
-- 2. upsert functions for parser/collector
-- =========================================================

create or replace function public.upsert_normalized_nts_business_monthly(
  p_rows jsonb
)
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
begin
  insert into public.normalized_nts_business_monthly (
    base_month,
    region_code,
    region_name,
    category_id,
    category_name,
    operating_count,
    close_count,
    raw_payload,
    source_key,
    observed_at,
    collected_at,
    updated_at
  )
  select
    coalesce(
      nullif(row->>'base_month', '')::date,
      date_trunc('month', coalesce(nullif(row->>'observed_at', '')::timestamptz, now()))::date
    ) as base_month,
    btrim(coalesce(row->>'region_code', '')) as region_code,
    nullif(btrim(coalesce(row->>'region_name', '')), '') as region_name,
    public._safe_int(row->>'category_id') as category_id,
    nullif(btrim(coalesce(row->>'category_name', '')), '') as category_name,
    public._safe_int(row->>'operating_count') as operating_count,
    public._safe_int(row->>'close_count') as close_count,
    coalesce(row, '{}'::jsonb) as raw_payload,
    coalesce(nullif(row->>'source_key', ''), 'nts_business_monthly') as source_key,
    nullif(row->>'observed_at', '')::timestamptz as observed_at,
    coalesce(nullif(row->>'collected_at', '')::timestamptz, now()) as collected_at,
    now() as updated_at
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) as row
  where btrim(coalesce(row->>'region_code', '')) <> ''
    and public._safe_int(row->>'category_id') is not null
  on conflict (base_month, region_code, category_id)
  do update set
    region_name = excluded.region_name,
    category_name = excluded.category_name,
    operating_count = excluded.operating_count,
    close_count = excluded.close_count,
    raw_payload = excluded.raw_payload,
    source_key = excluded.source_key,
    observed_at = excluded.observed_at,
    collected_at = excluded.collected_at,
    updated_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.upsert_normalized_sbiz_flow_monthly(
  p_rows jsonb
)
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
begin
  insert into public.normalized_sbiz_flow_monthly (
    base_month,
    region_code,
    region_name,
    category_id,
    category_name,
    open_count,
    close_count,
    raw_payload,
    source_key,
    observed_at,
    collected_at,
    updated_at
  )
  select
    coalesce(
      nullif(row->>'base_month', '')::date,
      date_trunc('month', coalesce(nullif(row->>'observed_at', '')::timestamptz, now()))::date
    ) as base_month,
    btrim(coalesce(row->>'region_code', '')) as region_code,
    nullif(btrim(coalesce(row->>'region_name', '')), '') as region_name,
    public._safe_int(row->>'category_id') as category_id,
    nullif(btrim(coalesce(row->>'category_name', '')), '') as category_name,
    public._safe_int(row->>'open_count') as open_count,
    public._safe_int(row->>'close_count') as close_count,
    coalesce(row, '{}'::jsonb) as raw_payload,
    coalesce(nullif(row->>'source_key', ''), 'sbiz_flow_monthly') as source_key,
    nullif(row->>'observed_at', '')::timestamptz as observed_at,
    coalesce(nullif(row->>'collected_at', '')::timestamptz, now()) as collected_at,
    now() as updated_at
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) as row
  where btrim(coalesce(row->>'region_code', '')) <> ''
    and public._safe_int(row->>'category_id') is not null
  on conflict (base_month, region_code, category_id)
  do update set
    region_name = excluded.region_name,
    category_name = excluded.category_name,
    open_count = excluded.open_count,
    close_count = excluded.close_count,
    raw_payload = excluded.raw_payload,
    source_key = excluded.source_key,
    observed_at = excluded.observed_at,
    collected_at = excluded.collected_at,
    updated_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- =========================================================
-- 3. monthly merged fact table
-- =========================================================

create table if not exists public.business_fact_monthly (
  base_month date not null,
  region_code text not null,
  region_name text,
  category_id integer not null,
  category_name text,

  operating_count_nts integer,
  close_count_nts integer,

  open_count_sbiz integer,
  close_count_sbiz integer,

  operating_count integer,
  open_count integer,
  close_count integer,

  source_nts_loaded_at timestamptz,
  source_sbiz_loaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (base_month, region_code, category_id)
);

create index if not exists idx_business_fact_monthly_month
  on public.business_fact_monthly (base_month desc);

create index if not exists idx_business_fact_monthly_region_category
  on public.business_fact_monthly (region_code, category_id, base_month desc);

create or replace function public.refresh_business_fact_monthly(
  p_from_month date default null
)
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
begin
  insert into public.business_fact_monthly (
    base_month,
    region_code,
    region_name,
    category_id,
    category_name,
    operating_count_nts,
    close_count_nts,
    open_count_sbiz,
    close_count_sbiz,
    operating_count,
    open_count,
    close_count,
    source_nts_loaded_at,
    source_sbiz_loaded_at,
    updated_at
  )
  with nts as (
    select *
    from public.normalized_nts_business_monthly
    where p_from_month is null or base_month >= p_from_month
  ),
  sbiz as (
    select *
    from public.normalized_sbiz_flow_monthly
    where p_from_month is null or base_month >= p_from_month
  ),
  merged as (
    select
      coalesce(n.base_month, s.base_month) as base_month,
      coalesce(n.region_code, s.region_code) as region_code,
      coalesce(n.region_name, s.region_name) as region_name,
      coalesce(n.category_id, s.category_id) as category_id,
      coalesce(n.category_name, s.category_name) as category_name,
      n.operating_count as operating_count_nts,
      n.close_count as close_count_nts,
      s.open_count as open_count_sbiz,
      s.close_count as close_count_sbiz,
      n.collected_at as source_nts_loaded_at,
      s.collected_at as source_sbiz_loaded_at
    from nts n
    full outer join sbiz s
      on n.base_month = s.base_month
     and n.region_code = s.region_code
     and n.category_id = s.category_id
  )
  select
    base_month,
    region_code,
    region_name,
    category_id,
    category_name,
    operating_count_nts,
    close_count_nts,
    open_count_sbiz,
    close_count_sbiz,
    coalesce(operating_count_nts, 0) as operating_count,
    coalesce(open_count_sbiz, 0) as open_count,
    coalesce(close_count_nts, close_count_sbiz, 0) as close_count,
    source_nts_loaded_at,
    source_sbiz_loaded_at,
    now() as updated_at
  from merged
  on conflict (base_month, region_code, category_id)
  do update set
    region_name = excluded.region_name,
    category_name = excluded.category_name,
    operating_count_nts = excluded.operating_count_nts,
    close_count_nts = excluded.close_count_nts,
    open_count_sbiz = excluded.open_count_sbiz,
    close_count_sbiz = excluded.close_count_sbiz,
    operating_count = excluded.operating_count,
    open_count = excluded.open_count,
    close_count = excluded.close_count,
    source_nts_loaded_at = excluded.source_nts_loaded_at,
    source_sbiz_loaded_at = excluded.source_sbiz_loaded_at,
    updated_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- =========================================================
-- 4. features view
-- =========================================================

create or replace view public.v_business_risk_features_monthly as
with base as (
  select
    f.*,
    lag(f.operating_count) over (
      partition by f.region_code, f.category_id
      order by f.base_month
    ) as prev_operating_count,
    lag(f.open_count) over (
      partition by f.region_code, f.category_id
      order by f.base_month
    ) as prev_open_count,
    lag(f.close_count) over (
      partition by f.region_code, f.category_id
      order by f.base_month
    ) as prev_close_count,
    lag(f.operating_count, 12) over (
      partition by f.region_code, f.category_id
      order by f.base_month
    ) as prev_operating_count_12m
  from public.business_fact_monthly f
),
calc as (
  select
    base_month,
    region_code,
    region_name,
    category_id,
    category_name,
    operating_count,
    open_count,
    close_count,
    operating_count_nts,
    close_count_nts,
    open_count_sbiz,
    close_count_sbiz,
    source_nts_loaded_at,
    source_sbiz_loaded_at,

    (open_count - close_count) as net_change,

    case
      when operating_count > 0
      then round((close_count::numeric / operating_count::numeric) * 100, 4)
      else null
    end as close_rate_pct,

    case
      when operating_count > 0
      then round((open_count::numeric / operating_count::numeric) * 100, 4)
      else null
    end as open_rate_pct,

    case
      when open_count > 0
      then round((close_count::numeric / open_count::numeric), 4)
      else null
    end as close_open_ratio,

    case
      when prev_operating_count > 0
      then round(((operating_count - prev_operating_count)::numeric / prev_operating_count::numeric) * 100, 4)
      else null
    end as operating_mom_change_pct,

    case
      when prev_operating_count_12m > 0
      then round(((operating_count - prev_operating_count_12m)::numeric / prev_operating_count_12m::numeric) * 100, 4)
      else null
    end as operating_yoy_change_pct,

    case
      when prev_close_count is not null
      then (close_count - prev_close_count)
      else null
    end as close_accel_count,

    case
      when prev_close_count > 0
      then round(((close_count - prev_close_count)::numeric / prev_close_count::numeric) * 100, 4)
      else null
    end as close_accel_pct
  from base
)
select
  *,
  avg(close_rate_pct) over (partition by base_month, category_id) as national_close_rate_avg_pct,
  avg(open_rate_pct) over (partition by base_month, category_id) as national_open_rate_avg_pct,
  avg(coalesce(operating_yoy_change_pct, 0)) over (partition by base_month, category_id) as national_operating_yoy_avg_pct
from calc;

-- =========================================================
-- 5. score view
-- =========================================================

create or replace view public.v_business_risk_scores_monthly as
with f as (
  select *
  from public.v_business_risk_features_monthly
),
s as (
  select
    base_month,
    region_code,
    region_name,
    category_id,
    category_name,
    operating_count,
    open_count,
    close_count,
    operating_count_nts,
    close_count_nts,
    open_count_sbiz,
    close_count_sbiz,
    source_nts_loaded_at,
    source_sbiz_loaded_at,

    net_change,
    close_rate_pct,
    open_rate_pct,
    close_open_ratio,
    operating_mom_change_pct,
    operating_yoy_change_pct,
    close_accel_count,
    close_accel_pct,
    national_close_rate_avg_pct,
    national_open_rate_avg_pct,
    national_operating_yoy_avg_pct,

    public._clamp_num(coalesce(close_rate_pct, 0) * 2.4, 0, 100) as close_rate_score,
    public._clamp_num(
      case
        when operating_count > 0 and net_change < 0
        then (abs(net_change)::numeric / operating_count::numeric) * 1800
        else 0
      end,
      0,
      100
    ) as net_outflow_score,
    public._clamp_num(abs(least(coalesce(operating_mom_change_pct, 0), 0)) * 8, 0, 100) as operating_decline_score,
    public._clamp_num(coalesce(close_accel_pct, 0) * 0.9, 0, 100) as close_accel_score,
    public._clamp_num(
      case
        when open_rate_pct is null or close_rate_pct is null then 0
        when close_rate_pct > open_rate_pct then (close_rate_pct - open_rate_pct) * 3
        else 0
      end,
      0,
      100
    ) as open_close_gap_score
  from f
)
select
  base_month,
  region_code,
  region_name,
  category_id,
  category_name,

  operating_count,
  open_count,
  close_count,
  operating_count_nts,
  close_count_nts,
  open_count_sbiz,
  close_count_sbiz,

  source_nts_loaded_at,
  source_sbiz_loaded_at,

  net_change,
  close_rate_pct,
  open_rate_pct,
  close_open_ratio,
  operating_mom_change_pct,
  operating_yoy_change_pct,
  close_accel_count,
  close_accel_pct,
  national_close_rate_avg_pct,
  national_open_rate_avg_pct,
  national_operating_yoy_avg_pct,

  close_rate_score,
  net_outflow_score,
  operating_decline_score,
  close_accel_score,
  open_close_gap_score,

  round(
    close_rate_score * 0.35 +
    net_outflow_score * 0.20 +
    operating_decline_score * 0.20 +
    close_accel_score * 0.15 +
    open_close_gap_score * 0.10
  , 1) as base_score,

  round(
    close_rate_score * 0.35 +
    net_outflow_score * 0.20 +
    operating_decline_score * 0.20 +
    close_accel_score * 0.15 +
    open_close_gap_score * 0.10
  , 1) as adjusted_score,

  case
    when (
      close_rate_score * 0.35 +
      net_outflow_score * 0.20 +
      operating_decline_score * 0.20 +
      close_accel_score * 0.15 +
      open_close_gap_score * 0.10
    ) >= 80 then 'critical'
    when (
      close_rate_score * 0.35 +
      net_outflow_score * 0.20 +
      operating_decline_score * 0.20 +
      close_accel_score * 0.15 +
      open_close_gap_score * 0.10
    ) >= 65 then 'high'
    when (
      close_rate_score * 0.35 +
      net_outflow_score * 0.20 +
      operating_decline_score * 0.20 +
      close_accel_score * 0.15 +
      open_close_gap_score * 0.10
    ) >= 45 then 'medium'
    else 'low'
  end as risk_grade
from s;

create or replace view public.v_business_risk_scores_current as
select *
from public.v_business_risk_scores_monthly
where base_month = (select max(base_month) from public.v_business_risk_scores_monthly);

-- =========================================================
-- 6. public signals view
-- =========================================================

create or replace view public.v_risk_signals_public as
with src as (
  select *
  from public.v_business_risk_scores_current
),
signal_union as (
  select
    base_month as signal_date,
    region_code,
    region_name,
    category_id,
    category_name,
    'closure_cluster'::text as signal_type,
    adjusted_score::numeric as signal_strength,
    format('%s · %s 폐업 집중 구간', coalesce(region_name, region_code), coalesce(category_name, category_id::text)) as title,
    format(
      '최근 월 기준 폐업 %s건, 운영중 %s건, 폐업률 %.2f%%로 고위험 구간입니다.',
      coalesce(close_count, 0),
      coalesce(operating_count, 0),
      coalesce(close_rate_pct, 0)
    ) as description,
    jsonb_build_object(
      'base_month', base_month,
      'operating_count', operating_count,
      'close_count', close_count,
      'close_rate_pct', close_rate_pct,
      'source_nts_loaded_at', source_nts_loaded_at,
      'source_sbiz_loaded_at', source_sbiz_loaded_at
    ) as evidence
  from src
  where close_rate_pct >= 3.0

  union all

  select
    base_month,
    region_code,
    region_name,
    category_id,
    category_name,
    'net_outflow'::text,
    adjusted_score::numeric,
    format('%s · %s 순감소 전환', coalesce(region_name, region_code), coalesce(category_name, category_id::text)),
    format(
      '최근 월 기준 신생 %s건, 폐업 %s건으로 순증감 %s입니다.',
      coalesce(open_count, 0),
      coalesce(close_count, 0),
      coalesce(net_change, 0)
    ),
    jsonb_build_object(
      'base_month', base_month,
      'open_count', open_count,
      'close_count', close_count,
      'net_change', net_change,
      'source_nts_loaded_at', source_nts_loaded_at,
      'source_sbiz_loaded_at', source_sbiz_loaded_at
    )
  from src
  where net_change < 0

  union all

  select
    base_month,
    region_code,
    region_name,
    category_id,
    category_name,
    'survival_drop'::text,
    adjusted_score::numeric,
    format('%s · %s 운영 감소 구간', coalesce(region_name, region_code), coalesce(category_name, category_id::text)),
    format(
      '운영중 사업자 수가 전년동월 대비 %.2f%% 감소했습니다.',
      abs(coalesce(operating_yoy_change_pct, 0))
    ),
    jsonb_build_object(
      'base_month', base_month,
      'operating_count', operating_count,
      'operating_yoy_change_pct', operating_yoy_change_pct,
      'source_nts_loaded_at', source_nts_loaded_at
    )
  from src
  where operating_yoy_change_pct <= -5.0
)
select
  row_number() over (
    order by signal_date desc, signal_strength desc nulls last, region_code, category_id, signal_type
  )::bigint as id,
  signal_date,
  region_code,
  region_name,
  category_id,
  category_name,
  signal_type,
  signal_strength,
  title,
  description,
  evidence,
  now() as created_at
from signal_union;

-- =========================================================
-- 7. drop existing rpc functions before recreate
-- =========================================================

do $$
declare
  v_sql text;
begin
  for v_sql in
    select format(
      'drop function if exists %I.%I(%s);',
      n.nspname,
      p.proname,
      pg_get_function_identity_arguments(p.oid)
    )
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'get_dashboard_summary',
        'get_top_risk_rankings',
        'get_risk_rankings',
        'get_region_category_detail_named',
        'get_risk_signals_feed'
      )
  loop
    execute v_sql;
  end loop;
end
$$;

-- =========================================================
-- 8. dashboard / ranking / detail / signal RPC
-- =========================================================

create function public.get_dashboard_summary()
returns table (
  latest_score_date text,
  region_count bigint,
  category_count bigint,
  ranking_count bigint,
  signal_count bigint,
  avg_base_score numeric,
  avg_adjusted_score numeric
)
language sql
stable
as $$
  with latest as (
    select *
    from public.v_business_risk_scores_current
  ),
  signal_latest as (
    select *
    from public.v_risk_signals_public
    where signal_date = (select max(signal_date) from public.v_risk_signals_public)
  )
  select
    to_char((select max(base_month) from latest), 'YYYY-MM-DD') as latest_score_date,
    count(distinct region_code)::bigint as region_count,
    count(distinct category_id)::bigint as category_count,
    count(*)::bigint as ranking_count,
    (select count(*)::bigint from signal_latest) as signal_count,
    round(avg(base_score), 1) as avg_base_score,
    round(avg(adjusted_score), 1) as avg_adjusted_score
  from latest
$$;

create function public.get_top_risk_rankings(
  p_limit integer default 8
)
returns table (
  region_code text,
  category_id integer,
  category_name text,
  score_date text,
  base_score numeric,
  adjusted_score numeric,
  risk_grade text,
  signal_count bigint,
  open_prev_30d integer,
  close_prev_30d integer,
  net_prev_30d integer,
  churn_prev_30d numeric,
  survival_prev_12m numeric,
  national_survival_avg_12m numeric,
  national_churn_avg_30d numeric
)
language sql
stable
as $$
  with latest as (
    select *
    from public.v_business_risk_scores_current
  ),
  signal_counts as (
    select
      region_code,
      category_id,
      count(*)::bigint as signal_count
    from public.v_risk_signals_public
    where signal_date = (select max(signal_date) from public.v_risk_signals_public)
    group by region_code, category_id
  )
  select
    l.region_code,
    l.category_id,
    l.category_name,
    to_char(l.base_month, 'YYYY-MM-DD') as score_date,
    l.base_score,
    l.adjusted_score,
    l.risk_grade,
    coalesce(sc.signal_count, 0) as signal_count,
    l.open_count as open_prev_30d,
    l.close_count as close_prev_30d,
    l.net_change as net_prev_30d,
    round(coalesce(l.close_rate_pct, 0), 2) as churn_prev_30d,
    round(100 + coalesce(l.operating_yoy_change_pct, 0), 2) as survival_prev_12m,
    round(100 + coalesce(l.national_operating_yoy_avg_pct, 0), 2) as national_survival_avg_12m,
    round(coalesce(l.national_close_rate_avg_pct, 0), 2) as national_churn_avg_30d
  from latest l
  left join signal_counts sc
    on sc.region_code = l.region_code
   and sc.category_id = l.category_id
  order by l.adjusted_score desc, l.region_code, l.category_id
  limit greatest(coalesce(p_limit, 8), 1)
$$;

create function public.get_risk_rankings(
  p_region_code text default null,
  p_category_id integer default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  risk_score_id bigint,
  score_date text,
  region_code text,
  region_name text,
  category_id integer,
  top_category text,
  mid_category text,
  sub_category text,
  category_name text,
  adjusted_score numeric,
  risk_grade text,
  sample_size_active integer,
  sample_size_cohort integer,
  raw_close_accel_rate numeric,
  raw_net_diff integer,
  raw_close_open_ratio numeric,
  raw_survival_drop numeric,
  raw_density_index numeric,
  raw_churn_delta numeric,
  created_at timestamptz
)
language sql
stable
as $$
  with latest as (
    select *
    from public.v_business_risk_scores_current
    where (p_region_code is null or region_code = p_region_code)
      and (p_category_id is null or category_id = p_category_id)
  )
  select
    row_number() over (order by adjusted_score desc, region_code, category_id)::bigint as risk_score_id,
    to_char(base_month, 'YYYY-MM-DD') as score_date,
    region_code,
    region_name,
    category_id,
    null::text as top_category,
    null::text as mid_category,
    null::text as sub_category,
    category_name,
    adjusted_score,
    risk_grade,
    operating_count as sample_size_active,
    (coalesce(open_count, 0) + coalesce(close_count, 0))::integer as sample_size_cohort,
    round(coalesce(close_accel_pct, 0), 2) as raw_close_accel_rate,
    net_change as raw_net_diff,
    round(coalesce(close_open_ratio, 0), 4) as raw_close_open_ratio,
    round(abs(least(coalesce(operating_yoy_change_pct, 0), 0)), 2) as raw_survival_drop,
    coalesce(operating_count, 0)::numeric as raw_density_index,
    round(coalesce(close_rate_pct, 0) - coalesce(open_rate_pct, 0), 2) as raw_churn_delta,
    now() as created_at
  from latest
  order by adjusted_score desc, region_code, category_id
  limit greatest(coalesce(p_limit, 50), 1)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

create function public.get_region_category_detail_named(
  p_region_code text,
  p_category_id integer
)
returns table (
  region_code text,
  region_name text,
  category_id integer,
  category_name text,
  score_date text,
  risk_score numeric,
  risk_grade text,
  open_count integer,
  close_count integer,
  close_rate numeric,
  active_business_count integer,
  closed_business_count integer
)
language sql
stable
as $$
  select
    s.region_code,
    s.region_name,
    s.category_id,
    s.category_name,
    to_char(s.base_month, 'YYYY-MM-DD') as score_date,
    s.adjusted_score as risk_score,
    s.risk_grade,
    s.open_count,
    s.close_count,
    round(coalesce(s.close_rate_pct, 0), 2) as close_rate,
    s.operating_count as active_business_count,
    coalesce(s.close_count_nts, s.close_count_sbiz, s.close_count) as closed_business_count
  from public.v_business_risk_scores_monthly s
  where s.region_code = p_region_code
    and s.category_id = p_category_id
  order by s.base_month desc
  limit 12
$$;

create function public.get_risk_signals_feed(
  p_region_code text default null,
  p_category_id integer default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id bigint,
  signal_date text,
  region_code text,
  region_name text,
  category_id integer,
  category_name text,
  signal_type text,
  signal_strength numeric,
  title text,
  description text,
  evidence jsonb,
  created_at timestamptz
)
language sql
stable
as $$
  select
    s.id,
    to_char(s.signal_date, 'YYYY-MM-DD') as signal_date,
    s.region_code,
    s.region_name,
    s.category_id,
    s.category_name,
    s.signal_type,
    s.signal_strength,
    s.title,
    s.description,
    s.evidence,
    s.created_at
  from public.v_risk_signals_public s
  where (p_region_code is null or s.region_code = p_region_code)
    and (p_category_id is null or s.category_id = p_category_id)
  order by s.signal_date desc, s.signal_strength desc nulls last, s.id desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

-- =========================================================
-- 9. one-shot refresh entry
-- =========================================================

create or replace function public.refresh_public_business_risk_pipeline(
  p_from_month date default null
)
returns jsonb
language plpgsql
as $$
declare
  v_fact_count integer := 0;
begin
  v_fact_count := public.refresh_business_fact_monthly(p_from_month);

  return jsonb_build_object(
    'ok', true,
    'fact_rows_upserted', v_fact_count,
    'latest_month', (
      select max(base_month)
      from public.business_fact_monthly
    )
  );
end;
$$;