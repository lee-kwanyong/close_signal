-- supabase/migrations/20260421_extend_hq_store_detail_with_status_history.sql

begin;

create index if not exists idx_hq_store_upload_rows_store_created_at
  on public.hq_store_upload_rows (hq_store_id, created_at desc);

drop function if exists public.get_hq_store_detail(bigint);

create or replace function public.get_hq_store_detail(
  p_store_id bigint
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
  snapshot_date date,
  latest_status_snapshot_date date,
  latest_upload_batch_id bigint,
  latest_upload_name text,
  latest_upload_status text,
  latest_upload_created_at timestamptz,
  summary_text text,
  store_risk_score integer,
  recovery_potential_score integer,
  action_priority_score integer,
  recommendation text,
  risk_grade text,
  feature_snapshot jsonb,
  reasons jsonb,
  actions jsonb,
  action_runs jsonb,
  status_history jsonb,
  upload_history jsonb
)
language sql
stable
as $$
  with latest_score as (
    select
      ss.*
    from public.hq_site_scores ss
    where ss.target_kind = 'store'
      and ss.store_id = p_store_id
    order by ss.snapshot_date desc, ss.updated_at desc, ss.id desc
    limit 1
  ),
  latest_feature as (
    select
      fs.*
    from public.hq_site_feature_snapshots fs
    join latest_score ls
      on fs.target_kind = 'store'
     and fs.store_id = ls.store_id
     and fs.snapshot_date = ls.snapshot_date
     and fs.analysis_radius_m = ls.analysis_radius_m
    limit 1
  ),
  latest_status as (
    select
      hs.*
    from public.hq_store_status_snapshots hs
    where hs.store_id = p_store_id
    order by hs.snapshot_date desc, hs.updated_at desc, hs.id desc
    limit 1
  ),
  latest_upload as (
    select
      b.id as batch_id,
      b.upload_name,
      b.upload_status,
      b.created_at
    from public.hq_store_upload_rows r
    join public.hq_store_upload_batches b
      on b.id = r.batch_id
    where r.hq_store_id = p_store_id
    order by b.created_at desc, r.created_at desc, r.id desc
    limit 1
  )
  select
    b.id as brand_id,
    b.brand_name,
    s.id as store_id,
    s.store_name,
    s.store_code,
    s.store_status,
    coalesce(
      ls2.open_state,
      case
        when s.store_status = 'closed'
          or (s.closed_on is not null and s.closed_on <= current_date)
          then 'closed'
        when s.store_status = 'paused'
          then 'paused'
        when s.store_status = 'candidate'
          or (s.opened_on is not null and s.opened_on > current_date)
          then 'candidate'
        else 'operating'
      end
    ) as open_state,
    coalesce(
      ls2.is_open,
      case
        when s.store_status in ('closed', 'paused', 'candidate') then false
        when s.closed_on is not null and s.closed_on <= current_date then false
        when s.opened_on is not null and s.opened_on > current_date then false
        else true
      end
    ) as is_open,
    s.opened_on,
    s.closed_on,
    lss.snapshot_date,
    ls2.snapshot_date as latest_status_snapshot_date,
    lu.batch_id as latest_upload_batch_id,
    lu.upload_name as latest_upload_name,
    lu.upload_status as latest_upload_status,
    lu.created_at as latest_upload_created_at,
    lss.summary_text,
    lss.store_risk_score,
    lss.recovery_potential_score,
    lss.action_priority_score,
    lss.recommendation,
    lss.risk_grade,
    jsonb_build_object(
      'resident_population', lf.resident_population,
      'worker_population', lf.worker_population,
      'living_population', lf.living_population,
      'resident_population_change_3m', lf.resident_population_change_3m,
      'resident_population_change_12m', lf.resident_population_change_12m,
      'living_population_change_3m', lf.living_population_change_3m,
      'living_population_change_12m', lf.living_population_change_12m,
      'same_category_poi_count', lf.same_category_poi_count,
      'direct_competitor_count', lf.direct_competitor_count,
      'franchise_count_500m', lf.franchise_count_500m,
      'estimated_sales_index', lf.estimated_sales_index,
      'saturation_index', lf.saturation_index,
      'competition_density_score', lf.competition_density_score,
      'benchmark_open_growth_index', lf.benchmark_open_growth_index,
      'benchmark_closure_risk_index', lf.benchmark_closure_risk_index,
      'competitor_brand_pressure_index', lf.competitor_brand_pressure_index,
      'search_interest_change_30d', lf.search_interest_change_30d,
      'review_rating_index', lf.review_rating_index,
      'review_volume_change_90d', lf.review_volume_change_90d,
      'subway_station_count_500m', lf.subway_station_count_500m,
      'subway_ridership_index', lf.subway_ridership_index,
      'bus_stop_count_500m', lf.bus_stop_count_500m,
      'bus_flow_index', lf.bus_flow_index,
      'parking_score', lf.parking_score,
      'visibility_score', lf.visibility_score,
      'office_count_500m', lf.office_count_500m,
      'anchor_facility_score', lf.anchor_facility_score,
      'tourism_demand_score', lf.tourism_demand_score,
      'weather_sensitivity_score', lf.weather_sensitivity_score,
      'air_quality_risk_score', lf.air_quality_risk_score,
      'night_safety_score', lf.night_safety_score,
      'late_hour_flow_index', lf.late_hour_flow_index,
      'business_status', lf.business_status,
      'tax_status', lf.tax_status,
      'abnormal_business_flag', lf.abnormal_business_flag
    ) as feature_snapshot,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'rank_order', r.rank_order,
          'reason_code', r.reason_code,
          'reason_label', r.reason_label,
          'reason_bucket', r.reason_bucket,
          'direction', r.direction,
          'metric_key', r.metric_key,
          'metric_value_text', r.metric_value_text,
          'description', r.description
        )
        order by r.rank_order
      )
      from public.hq_site_reasons r
      join latest_score ls
        on ls.id = r.score_id
    ), '[]'::jsonb) as reasons,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'action_id', a.id,
          'action_code', a.action_code,
          'title', a.title,
          'why_text', a.why_text,
          'playbook_text', a.playbook_text,
          'owner_type', a.owner_type,
          'priority', a.priority,
          'status', a.status,
          'due_date', a.due_date,
          'expected_effect', a.expected_effect,
          'created_at', a.created_at
        )
        order by a.priority asc, a.created_at desc
      )
      from public.hq_site_actions a
      join latest_score ls
        on ls.id = a.score_id
    ), '[]'::jsonb) as actions,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'run_id', ar.id,
          'action_id', ar.action_id,
          'run_status', ar.run_status,
          'result_summary', ar.result_summary,
          'evidence', ar.evidence,
          'created_at', ar.created_at
        )
        order by ar.created_at desc
      )
      from public.hq_action_runs ar
      where ar.action_id in (
        select a2.id
        from public.hq_site_actions a2
        join latest_score ls
          on ls.id = a2.score_id
      )
    ), '[]'::jsonb) as action_runs,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'snapshot_date', sh.snapshot_date,
          'store_status', sh.store_status,
          'open_state', sh.open_state,
          'is_open', sh.is_open,
          'event_type', sh.event_type,
          'event_message', sh.event_message,
          'opened_on', sh.opened_on,
          'closed_on', sh.closed_on,
          'batch_id', sh.batch_id,
          'upload_name', ub.upload_name,
          'upload_status', ub.upload_status,
          'upload_created_at', ub.created_at,
          'evidence', sh.evidence
        )
        order by sh.snapshot_date desc, sh.updated_at desc, sh.id desc
      )
      from (
        select *
        from public.hq_store_status_snapshots
        where store_id = p_store_id
        order by snapshot_date desc, updated_at desc, id desc
        limit 12
      ) sh
      left join public.hq_store_upload_batches ub
        on ub.id = sh.batch_id
    ), '[]'::jsonb) as status_history,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'batch_id', b2.id,
          'upload_name', b2.upload_name,
          'upload_status', b2.upload_status,
          'snapshot_date', b2.snapshot_date,
          'row_no', ur.row_no,
          'ingest_status', ur.ingest_status,
          'result_message', ur.result_message,
          'dedupe_key', ur.dedupe_key,
          'created_at', b2.created_at
        )
        order by b2.created_at desc, ur.row_no desc
      )
      from (
        select *
        from public.hq_store_upload_rows
        where hq_store_id = p_store_id
        order by created_at desc, id desc
        limit 12
      ) ur
      join public.hq_store_upload_batches b2
        on b2.id = ur.batch_id
    ), '[]'::jsonb) as upload_history
  from public.hq_stores s
  join public.hq_brands b
    on b.id = s.brand_id
  left join latest_score lss
    on true
  left join latest_feature lf
    on true
  left join latest_status ls2
    on true
  left join latest_upload lu
    on true
  where s.id = p_store_id;
$$;

commit;