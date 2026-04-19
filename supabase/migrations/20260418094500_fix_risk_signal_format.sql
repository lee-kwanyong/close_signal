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
    format(
      '%s · %s 폐업 집중 구간',
      coalesce(region_name, region_code),
      coalesce(category_name, category_id::text)
    ) as title,
    format(
      '최근 월 기준 폐업 %s건, 운영중 %s건, 폐업률 %s%%로 고위험 구간입니다.',
      coalesce(close_count, 0),
      coalesce(operating_count, 0),
      to_char(coalesce(close_rate_pct, 0), 'FM999999990.00')
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
    format(
      '%s · %s 순감소 전환',
      coalesce(region_name, region_code),
      coalesce(category_name, category_id::text)
    ),
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
    format(
      '%s · %s 운영 감소 구간',
      coalesce(region_name, region_code),
      coalesce(category_name, category_id::text)
    ),
    format(
      '운영중 사업자 수가 전년동월 대비 %s%% 감소했습니다.',
      to_char(abs(coalesce(operating_yoy_change_pct, 0)), 'FM999999990.00')
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