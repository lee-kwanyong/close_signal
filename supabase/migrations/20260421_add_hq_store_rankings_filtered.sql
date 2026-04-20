-- supabase/migrations/20260421_add_hq_store_rankings_filtered.sql

begin;

create index if not exists idx_hq_site_scores_target_brand_snapshot_store
  on public.hq_site_scores (target_kind, brand_id, snapshot_date desc, store_id)
  where target_kind = 'store' and store_id is not null;

drop function if exists public.get_hq_store_rankings_filtered(
  bigint,
  text,
  text,
  text,
  date,
  integer,
  integer
);

create or replace function public.get_hq_store_rankings_filtered(
  p_brand_id bigint default null,
  p_region_code text default null,
  p_store_status text default null,
  p_open_state text default null,
  p_snapshot_date date default null,
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
  open_state text,
  is_open boolean,
  opened_on date,
  closed_on date,
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
  with selected_scores as (
    select distinct on (ss.store_id)
      ss.id,
      ss.store_id,
      ss.brand_id,
      ss.snapshot_date,
      ss.analysis_radius_m,
      ss.store_risk_score,
      ss.recovery_potential_score,
      ss.action_priority_score,
      ss.cannibalization_score,
      ss.competition_pressure_score,
      ss.risk_grade,
      ss.recommendation
    from public.hq_site_scores ss
    where ss.target_kind = 'store'
      and ss.store_id is not null
      and (p_brand_id is null or ss.brand_id = p_brand_id)
      and (p_snapshot_date is null or ss.snapshot_date = p_snapshot_date)
    order by
      ss.store_id,
      ss.snapshot_date desc,
      ss.updated_at desc,
      ss.id desc
  ),
  ranked as (
    select
      b.id as brand_id,
      b.brand_name,
      s.id as store_id,
      s.store_name,
      s.store_code,
      s.store_status,
      case
        when s.store_status = 'closed'
          or (s.closed_on is not null and s.closed_on <= coalesce(p_snapshot_date, sc.snapshot_date, current_date))
          then 'closed'
        when s.store_status = 'paused'
          then 'paused'
        when s.store_status = 'candidate'
          or (s.opened_on is not null and s.opened_on > coalesce(p_snapshot_date, sc.snapshot_date, current_date))
          then 'candidate'
        else 'operating'
      end as open_state,
      case
        when s.store_status = 'closed'
          or s.store_status = 'paused'
          or s.store_status = 'candidate'
          then false
        when s.closed_on is not null and s.closed_on <= coalesce(p_snapshot_date, sc.snapshot_date, current_date)
          then false
        when s.opened_on is not null and s.opened_on > coalesce(p_snapshot_date, sc.snapshot_date, current_date)
          then false
        else true
      end as is_open,
      s.opened_on,
      s.closed_on,
      s.region_code,
      s.region_name,
      s.category_id,
      s.category_name,
      sc.snapshot_date,
      sc.store_risk_score,
      sc.recovery_potential_score,
      sc.action_priority_score,
      sc.cannibalization_score,
      sc.competition_pressure_score,
      sc.risk_grade,
      sc.recommendation,
      fs.direct_competitor_count,
      fs.resident_population,
      fs.resident_population_change_12m,
      fs.living_population_change_3m,
      fs.estimated_sales_index,
      rr.top_reasons,
      aa.pending_actions
    from selected_scores sc
    join public.hq_stores s
      on s.id = sc.store_id
    join public.hq_brands b
      on b.id = s.brand_id
    left join public.hq_site_feature_snapshots fs
      on fs.target_kind = 'store'
     and fs.store_id = s.id
     and fs.snapshot_date = sc.snapshot_date
     and fs.analysis_radius_m = sc.analysis_radius_m
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
      where r.score_id = sc.id
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
      where a.score_id = sc.id
        and a.status in ('recommended', 'accepted', 'in_progress')
    ) aa on true
  )
  select
    brand_id,
    brand_name,
    store_id,
    store_name,
    store_code,
    store_status,
    open_state,
    is_open,
    opened_on,
    closed_on,
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
  from ranked
  where (p_region_code is null or region_code = p_region_code)
    and (p_store_status is null or store_status = p_store_status)
    and (p_open_state is null or open_state = p_open_state)
  order by
    action_priority_score desc,
    store_risk_score desc,
    recovery_potential_score desc,
    snapshot_date desc,
    store_id desc
  limit greatest(coalesce(p_limit, 50), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

commit;