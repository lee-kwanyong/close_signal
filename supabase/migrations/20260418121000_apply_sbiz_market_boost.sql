set search_path = public;

-- =========================================================
-- 1. 월별 SBIZ 시장 메트릭 최신값 뷰
-- =========================================================

create or replace view public.v_sbiz_market_metrics_monthly as
with ranked as (
  select
    date_trunc('month', score_date)::date as base_month,
    region_code,
    region_name,
    category_id::integer as category_id,
    category_code,
    category_name,
    store_count,
    active_tile_count,
    source_record_count,
    coalesce(store_density_score, 0)::numeric as store_density_score,
    coalesce(competition_score, 0)::numeric as competition_score,
    coalesce(freshness_score, 0)::numeric as freshness_score,
    coalesce(visibility_score, 0)::numeric as visibility_score,
    coalesce(sbiz_composite_score, 0)::numeric as sbiz_composite_score,
    metadata,
    score_date,
    created_at,
    updated_at,
    row_number() over (
      partition by date_trunc('month', score_date)::date, region_code, category_id
      order by
        score_date desc,
        updated_at desc nulls last,
        created_at desc nulls last,
        id desc
    ) as rn
  from public.sbiz_region_category_metrics
  where score_date is not null
    and region_code is not null
    and category_id is not null
)
select
  base_month,
  region_code,
  region_name,
  category_id,
  category_code,
  category_name,
  store_count,
  active_tile_count,
  source_record_count,
  store_density_score,
  competition_score,
  freshness_score,
  visibility_score,
  sbiz_composite_score,
  metadata,
  score_date as observed_date,
  created_at,
  updated_at
from ranked
where rn = 1;

-- =========================================================
-- 2. SBIZ 시장 보정 점수를 반영한 월별 위험 점수 뷰
-- =========================================================

create or replace view public.v_business_risk_scores_monthly as
with f as (
  select *
  from public.v_business_risk_features_monthly
),
m as (
  select *
  from public.v_sbiz_market_metrics_monthly
),
s as (
  select
    f.base_month,
    f.region_code,
    coalesce(f.region_name, m.region_name) as region_name,
    f.category_id,
    coalesce(f.category_name, m.category_name) as category_name,

    f.operating_count,
    f.open_count,
    f.close_count,
    f.operating_count_nts,
    f.close_count_nts,
    f.open_count_sbiz,
    f.close_count_sbiz,

    f.source_nts_loaded_at,
    f.source_sbiz_loaded_at,

    f.net_change,
    f.close_rate_pct,
    f.open_rate_pct,
    f.close_open_ratio,
    f.operating_mom_change_pct,
    f.operating_yoy_change_pct,
    f.close_accel_count,
    f.close_accel_pct,
    f.national_close_rate_avg_pct,
    f.national_open_rate_avg_pct,
    f.national_operating_yoy_avg_pct,

    m.store_count as store_count_sbiz,
    m.active_tile_count,
    m.source_record_count,
    m.store_density_score,
    m.competition_score,
    m.freshness_score,
    m.visibility_score,
    m.sbiz_composite_score,
    m.metadata as sbiz_metadata,
    m.observed_date as sbiz_observed_date,

    public._clamp_num(coalesce(f.close_rate_pct, 0) * 2.4, 0, 100) as close_rate_score,
    public._clamp_num(
      case
        when coalesce(f.operating_count, 0) > 0 and coalesce(f.net_change, 0) < 0
        then (abs(f.net_change)::numeric / f.operating_count::numeric) * 1800
        else 0
      end,
      0,
      100
    ) as net_outflow_score,
    public._clamp_num(
      abs(least(coalesce(f.operating_mom_change_pct, 0), 0)) * 8,
      0,
      100
    ) as operating_decline_score,
    public._clamp_num(coalesce(f.close_accel_pct, 0) * 0.9, 0, 100) as close_accel_score,
    public._clamp_num(
      case
        when f.open_rate_pct is null or f.close_rate_pct is null then 0
        when f.close_rate_pct > f.open_rate_pct then (f.close_rate_pct - f.open_rate_pct) * 3
        else 0
      end,
      0,
      100
    ) as open_close_gap_score,

    public._clamp_num(coalesce(m.store_density_score, 0), 0, 100) as density_pressure_score,
    public._clamp_num(coalesce(m.competition_score, 0), 0, 100) as competition_pressure_score,
    public._clamp_num(100 - coalesce(m.visibility_score, 50), 0, 100) as visibility_weak_score,
    public._clamp_num(100 - coalesce(m.freshness_score, 50), 0, 100) as freshness_weak_score,
    public._clamp_num(100 - coalesce(m.sbiz_composite_score, 50), 0, 100) as market_composite_weak_score

  from f
  left join m
    on m.base_month = f.base_month
   and m.region_code = f.region_code
   and m.category_id = f.category_id
),
scored as (
  select
    *,
    round(
      close_rate_score * 0.35 +
      net_outflow_score * 0.20 +
      operating_decline_score * 0.20 +
      close_accel_score * 0.15 +
      open_close_gap_score * 0.10
    , 1) as base_score,

    round(
      density_pressure_score * 0.30 +
      competition_pressure_score * 0.30 +
      visibility_weak_score * 0.20 +
      freshness_weak_score * 0.10 +
      market_composite_weak_score * 0.10
    , 1) as market_structure_risk_score
  from s
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

  store_count_sbiz,
  active_tile_count,
  source_record_count,
  store_density_score,
  competition_score,
  freshness_score,
  visibility_score,
  sbiz_composite_score,
  sbiz_metadata,
  sbiz_observed_date,

  close_rate_score,
  net_outflow_score,
  operating_decline_score,
  close_accel_score,
  open_close_gap_score,

  density_pressure_score,
  competition_pressure_score,
  visibility_weak_score,
  freshness_weak_score,
  market_composite_weak_score,
  market_structure_risk_score,

  base_score,

  round(
    public._clamp_num(
      base_score * 0.50 + market_structure_risk_score * 0.50,
      0,
      100
    ),
    1
  ) as adjusted_score,

  case
    when public._clamp_num(base_score * 0.50 + market_structure_risk_score * 0.50, 0, 100) >= 80 then 'critical'
    when public._clamp_num(base_score * 0.50 + market_structure_risk_score * 0.50, 0, 100) >= 65 then 'high'
    when public._clamp_num(base_score * 0.50 + market_structure_risk_score * 0.50, 0, 100) >= 45 then 'medium'
    else 'low'
  end as risk_grade
from scored;

create or replace view public.v_business_risk_scores_current as
select *
from public.v_business_risk_scores_monthly
where base_month = (select max(base_month) from public.v_business_risk_scores_monthly);

-- =========================================================
-- 3. 시장 압력 시그널 추가
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

  union all

  select
    base_month,
    region_code,
    region_name,
    category_id,
    category_name,
    'market_pressure'::text,
    greatest(adjusted_score, market_structure_risk_score)::numeric,
    format(
      '%s · %s 시장 압력 구간',
      coalesce(region_name, region_code),
      coalesce(category_name, category_id::text)
    ),
    format(
      'SBIZ 기준 밀도 %s, 경쟁 %s, 가시성 %s, 종합 %s로 시장 압력이 감지되었습니다.',
      to_char(coalesce(store_density_score, 0), 'FM999999990.00'),
      to_char(coalesce(competition_score, 0), 'FM999999990.00'),
      to_char(coalesce(visibility_score, 0), 'FM999999990.00'),
      to_char(coalesce(sbiz_composite_score, 0), 'FM999999990.00')
    ),
    jsonb_build_object(
      'base_month', base_month,
      'store_count_sbiz', store_count_sbiz,
      'store_density_score', store_density_score,
      'competition_score', competition_score,
      'freshness_score', freshness_score,
      'visibility_score', visibility_score,
      'sbiz_composite_score', sbiz_composite_score,
      'market_structure_risk_score', market_structure_risk_score,
      'source_sbiz_loaded_at', source_sbiz_loaded_at
    )
  from src
  where coalesce(store_count_sbiz, 0) > 0
    and market_structure_risk_score >= 55
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