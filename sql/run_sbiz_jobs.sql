select now() as started_at;

do $$
begin
  if to_regprocedure('public.backfill_raw_records_from_raw_source()') is not null then
    perform public.backfill_raw_records_from_raw_source();
  end if;

  if to_regprocedure('public.backfill_raw_records_category_batch()') is not null then
    perform public.backfill_raw_records_category_batch();
  end if;

  if to_regprocedure('public.backfill_business_snapshots_from_raw()') is not null then
    perform public.backfill_business_snapshots_from_raw();
  end if;

  if to_regprocedure('public.build_raw_business_matches()') is not null then
    perform public.build_raw_business_matches();
  end if;

  if to_regprocedure('public.create_business_snapshots()') is not null then
    perform public.create_business_snapshots();
  end if;

  if to_regprocedure('public.build_regional_daily_metrics()') is not null then
    perform public.build_regional_daily_metrics();
  end if;
end
$$;

select now() as checked_at;

select *
from public.v_collection_tiles_summary
where source_key = 'sbiz_store'
order by status;

select count(*) as regional_daily_metrics_count
from public.regional_daily_metrics;