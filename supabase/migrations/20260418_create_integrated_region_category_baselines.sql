create table if not exists public.integrated_region_category_baselines (
  id bigserial primary key,
  snapshot_date date not null,
  region_code text not null,
  region_name text,
  category_id integer not null,
  category_name text,

  smallbiz_risk_score numeric(8, 2),
  smallbiz_close_rate_7d numeric(10, 4),
  smallbiz_close_rate_30d numeric(10, 4),
  smallbiz_open_rate_7d numeric(10, 4),
  smallbiz_open_rate_30d numeric(10, 4),
  smallbiz_net_change_7d numeric(12, 2),
  smallbiz_net_change_30d numeric(12, 2),
  smallbiz_risk_delta_7d numeric(10, 4),
  smallbiz_risk_delta_30d numeric(10, 4),

  kosis_pressure_score integer,
  kosis_pressure_grade text,
  kosis_closed_total numeric(18, 2),
  kosis_national_share_pct numeric(10, 4),
  kosis_yoy_closed_delta_pct numeric(10, 4),

  nts_business_score numeric(8, 2),

  integrated_market_score integer not null,
  integrated_final_score integer not null,

  summary_text text,
  reason_codes text[] not null default '{}'::text[],
  raw_payload jsonb not null default '{}'::jsonb,

  collected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint integrated_region_category_baselines_unique
    unique (snapshot_date, region_code, category_id)
);

create index if not exists idx_integrated_rcb_snapshot_date
  on public.integrated_region_category_baselines (snapshot_date desc);

create index if not exists idx_integrated_rcb_region
  on public.integrated_region_category_baselines (region_code);

create index if not exists idx_integrated_rcb_category
  on public.integrated_region_category_baselines (category_id);

create index if not exists idx_integrated_rcb_market_score
  on public.integrated_region_category_baselines (integrated_market_score desc);

create index if not exists idx_integrated_rcb_final_score
  on public.integrated_region_category_baselines (integrated_final_score desc);

create or replace function public.tg_set_integrated_region_category_baselines_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_integrated_region_category_baselines_updated_at
  on public.integrated_region_category_baselines;

create trigger trg_integrated_region_category_baselines_updated_at
before update on public.integrated_region_category_baselines
for each row
execute function public.tg_set_integrated_region_category_baselines_updated_at();