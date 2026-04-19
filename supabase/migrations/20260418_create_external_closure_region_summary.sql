create or replace view public.v_external_closure_region_summary as
with base as (
  select
    source_key,
    period_code,
    period_year,
    region_code,
    region_name,
    closure_type_code,
    closure_type_name,
    metric_value
  from public.external_closure_stats
  where source_key = 'kosis_closure_9816_region'
),
latest_year as (
  select max(period_year) as latest_year
  from base
  where period_year is not null
),
yearly_totals as (
  select
    b.period_year,
    sum(
      case
        when b.closure_type_name = '총' then b.metric_value
        else 0
      end
    ) as total_closed_count
  from base b
  where b.period_year is not null
  group by b.period_year
),
region_yearly as (
  select
    b.period_year,
    b.region_code,
    b.region_name,
    sum(
      case
        when b.closure_type_name = '총' then b.metric_value
        else 0
      end
    ) as closed_total,
    sum(
      case
        when b.closure_type_name = '법인' then b.metric_value
        else 0
      end
    ) as closed_corporation,
    sum(
      case
        when b.closure_type_name = '개인사업자' then b.metric_value
        else 0
      end
    ) as closed_individual,
    sum(
      case
        when b.closure_type_name = '일반사업자' then b.metric_value
        else 0
      end
    ) as closed_general,
    sum(
      case
        when b.closure_type_name = '간이사업자' then b.metric_value
        else 0
      end
    ) as closed_simple
  from base b
  where b.period_year is not null
  group by
    b.period_year,
    b.region_code,
    b.region_name
),
region_ranked as (
  select
    ry.*,
    yt.total_closed_count,
    case
      when coalesce(yt.total_closed_count, 0) > 0
        then round((ry.closed_total / yt.total_closed_count) * 100.0, 4)
      else null
    end as national_share_pct,
    lag(ry.closed_total) over (
      partition by ry.region_code
      order by ry.period_year
    ) as prev_closed_total
  from region_yearly ry
  left join yearly_totals yt
    on yt.period_year = ry.period_year
)
select
  rr.period_year,
  rr.region_code,
  rr.region_name,
  rr.closed_total,
  rr.closed_corporation,
  rr.closed_individual,
  rr.closed_general,
  rr.closed_simple,
  rr.total_closed_count as national_closed_total,
  rr.national_share_pct,
  rr.prev_closed_total,
  case
    when rr.prev_closed_total is null then null
    else rr.closed_total - rr.prev_closed_total
  end as yoy_closed_delta,
  case
    when coalesce(rr.prev_closed_total, 0) > 0
      then round(((rr.closed_total - rr.prev_closed_total) / rr.prev_closed_total) * 100.0, 4)
    else null
  end as yoy_closed_delta_pct,
  case
    when rr.period_year = ly.latest_year then true
    else false
  end as is_latest_year,
  case
    when rr.period_year = ly.latest_year and rr.national_share_pct >= 8 then 'critical'
    when rr.period_year = ly.latest_year and rr.national_share_pct >= 4 then 'high'
    when rr.period_year = ly.latest_year and rr.national_share_pct >= 2 then 'moderate'
    else 'observe'
  end as pressure_grade
from region_ranked rr
cross join latest_year ly;