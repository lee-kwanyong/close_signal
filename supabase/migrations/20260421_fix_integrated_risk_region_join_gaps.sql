-- supabase/migrations/20260421_fix_integrated_risk_region_join_gaps.sql

begin;

create or replace function public.integrated_normalize_region_code(p_code text)
returns text
language sql
immutable
as $$
  select case upper(trim(coalesce(p_code, '')))
    when '' then null
    when 'KR' then 'KR'
    when '11' then 'KR-11'
    when '26' then 'KR-26'
    when '27' then 'KR-27'
    when '28' then 'KR-28'
    when '29' then 'KR-29'
    when '30' then 'KR-30'
    when '31' then 'KR-31'
    when '36' then 'KR-36'
    when '41' then 'KR-41'
    when '42' then 'KR-42'
    when '43' then 'KR-43'
    when '44' then 'KR-44'
    when '45' then 'KR-45'
    when '46' then 'KR-46'
    when '47' then 'KR-47'
    when '48' then 'KR-48'
    when '50' then 'KR-50'
    when 'A01' then 'KR-11'
    when 'A02' then 'KR-26'
    when 'A03' then 'KR-41'
    when 'A04' then 'KR-27'
    when 'A05' then 'KR-28'
    when 'A06' then 'KR-29'
    when 'A07' then 'KR-30'
    when 'A08' then 'KR-31'
    when 'A09' then 'KR-36'
    when 'A10' then 'KR-42'
    when 'A11' then 'KR-43'
    when 'A12' then 'KR-44'
    when 'A13' then 'KR-45'
    when 'A14' then 'KR-46'
    when 'A15' then 'KR-47'
    when 'A16' then 'KR-48'
    when 'A17' then 'KR-50'
    else
      case
        when upper(trim(coalesce(p_code, ''))) ~ '^KR-[0-9]{2}$' then upper(trim(p_code))
        else upper(trim(p_code))
      end
  end
$$;

create or replace function public.integrated_canonical_region_name(
  p_region_code text,
  p_region_name text
)
returns text
language sql
immutable
as $$
  select coalesce(
    case public.integrated_normalize_region_code(p_region_code)
      when 'KR' then '전국'
      when 'KR-11' then '서울'
      when 'KR-26' then '부산'
      when 'KR-27' then '대구'
      when 'KR-28' then '인천'
      when 'KR-29' then '광주'
      when 'KR-30' then '대전'
      when 'KR-31' then '울산'
      when 'KR-36' then '세종'
      when 'KR-41' then '경기'
      when 'KR-42' then '강원'
      when 'KR-43' then '충북'
      when 'KR-44' then '충남'
      when 'KR-45' then '전북'
      when 'KR-46' then '전남'
      when 'KR-47' then '경북'
      when 'KR-48' then '경남'
      when 'KR-50' then '제주'
      else null
    end,
    case trim(coalesce(p_region_name, ''))
      when '' then null
      when '전국' then '전국'
      when '서울특별시' then '서울'
      when '서울시' then '서울'
      when '서울' then '서울'
      when '부산광역시' then '부산'
      when '부산시' then '부산'
      when '부산' then '부산'
      when '대구광역시' then '대구'
      when '대구시' then '대구'
      when '대구' then '대구'
      when '인천광역시' then '인천'
      when '인천시' then '인천'
      when '인천' then '인천'
      when '광주광역시' then '광주'
      when '광주시' then '광주'
      when '광주' then '광주'
      when '대전광역시' then '대전'
      when '대전시' then '대전'
      when '대전' then '대전'
      when '울산광역시' then '울산'
      when '울산시' then '울산'
      when '울산' then '울산'
      when '세종특별자치시' then '세종'
      when '세종시' then '세종'
      when '세종' then '세종'
      when '경기도' then '경기'
      when '경기' then '경기'
      when '강원도' then '강원'
      when '강원특별자치도' then '강원'
      when '강원' then '강원'
      when '충청북도' then '충북'
      when '충북' then '충북'
      when '충청남도' then '충남'
      when '충남' then '충남'
      when '전라북도' then '전북'
      when '전북특별자치도' then '전북'
      when '전북' then '전북'
      when '전라남도' then '전남'
      when '전남' then '전남'
      when '경상북도' then '경북'
      when '경북' then '경북'
      when '경상남도' then '경남'
      when '경남' then '경남'
      when '제주특별자치도' then '제주'
      when '제주도' then '제주'
      when '제주' then '제주'
      else trim(p_region_name)
    end
  )
$$;

drop view if exists public.v_integrated_risk_distribution_current;
drop view if exists public.v_integrated_risk_region_aggregates_current;
drop view if exists public.v_integrated_risk_top_current;
drop view if exists public.v_integrated_risk_join_gaps_current;

create or replace view public.v_integrated_risk_top_current as
with latest_snapshot as (
  select max(snapshot_date) as snapshot_date
  from public.integrated_region_category_baselines
),
base as (
  select
    b.snapshot_date as score_month,
    public.integrated_normalize_region_code(b.region_code) as region_code,
    public.integrated_canonical_region_name(b.region_code, b.region_name) as region_name,
    b.category_id,
    b.category_name,

    b.smallbiz_risk_score,
    b.smallbiz_close_rate_7d,
    b.smallbiz_close_rate_30d,
    b.smallbiz_open_rate_7d,
    b.smallbiz_open_rate_30d,
    b.smallbiz_net_change_7d,
    b.smallbiz_net_change_30d,
    b.smallbiz_risk_delta_7d,
    b.smallbiz_risk_delta_30d,

    b.kosis_pressure_score,
    lower(trim(coalesce(b.kosis_pressure_grade, ''))) as pressure_grade,
    b.kosis_pressure_label,
    b.kosis_closed_total,
    b.kosis_national_share_pct as national_share_pct,
    b.kosis_yoy_closed_delta_pct as yoy_closed_delta_pct,

    b.nts_business_score,
    b.nts_label,

    b.integrated_market_score,
    b.integrated_final_score as integrated_signal_score,
    b.integrated_severity as risk_grade,

    b.reason_codes,
    b.summary_text,
    b.recovery_direction
  from public.integrated_region_category_baselines b
  join latest_snapshot ls
    on ls.snapshot_date = b.snapshot_date
)
select
  score_month,
  region_code,
  region_name,
  category_id,
  category_name,

  smallbiz_risk_score,
  smallbiz_close_rate_7d,
  smallbiz_close_rate_30d,
  smallbiz_open_rate_7d,
  smallbiz_open_rate_30d,
  smallbiz_net_change_7d,
  smallbiz_net_change_30d,
  smallbiz_risk_delta_7d,
  smallbiz_risk_delta_30d,

  kosis_pressure_score,
  case
    when pressure_grade in ('critical', 'high', 'moderate', 'observe') then pressure_grade
    else null
  end as pressure_grade,
  kosis_pressure_label,
  kosis_closed_total,
  national_share_pct,
  yoy_closed_delta_pct,

  nts_business_score,
  nts_label,

  integrated_market_score,
  integrated_signal_score,
  risk_grade,
  summary_text,
  reason_codes,
  recovery_direction,

  integrated_signal_score as adjusted_score,

  region_code as closure_region_code,
  region_name as closure_region_name,

  kosis_pressure_score as close_rate_pct,
  null::numeric as operating_yoy_change_pct,
  smallbiz_net_change_30d as net_change
from base;

create or replace view public.v_integrated_risk_distribution_current as
select
  count(*)::bigint as total_rows,
  avg(integrated_signal_score)::numeric as avg_integrated_signal_score,
  count(*) filter (where integrated_signal_score >= 80)::bigint as critical_count,
  count(*) filter (where integrated_signal_score >= 65 and integrated_signal_score < 80)::bigint as high_count,
  count(*) filter (where integrated_signal_score >= 45 and integrated_signal_score < 65)::bigint as medium_count,
  count(*) filter (where integrated_signal_score < 45)::bigint as low_count
from public.v_integrated_risk_top_current;

create or replace view public.v_integrated_risk_region_aggregates_current as
select
  region_name as canonical_region_name,
  max(pressure_grade) filter (where pressure_grade is not null) as pressure_grade,
  avg(national_share_pct)::numeric as avg_national_share_pct,
  avg(yoy_closed_delta_pct)::numeric as avg_yoy_closed_delta_pct,
  avg(adjusted_score)::numeric as avg_adjusted_score,
  avg(integrated_signal_score)::numeric as avg_integrated_signal_score,
  max(integrated_signal_score)::numeric as max_integrated_signal_score,
  count(*)::bigint as row_count,
  count(*) filter (where integrated_signal_score >= 80)::bigint as critical_count,
  count(*) filter (where integrated_signal_score >= 65 and integrated_signal_score < 80)::bigint as high_count,
  count(*) filter (where integrated_signal_score >= 45 and integrated_signal_score < 65)::bigint as medium_count,
  count(*) filter (where integrated_signal_score < 45)::bigint as low_count
from public.v_integrated_risk_top_current
group by region_name;

create or replace view public.v_integrated_risk_join_gaps_current as
select
  score_month,
  region_code,
  region_name,
  category_id,
  category_name,
  adjusted_score,
  risk_grade,
  closure_region_code,
  closure_region_name,
  pressure_grade,
  integrated_signal_score
from public.v_integrated_risk_top_current
where region_name is null
   or closure_region_name is null
   or pressure_grade is null
   or region_code is null
   or category_id is null;

commit;