create table if not exists public.external_enrichments (
  id bigserial primary key,
  business_key text not null,
  source text not null,
  external_id text,
  business_number text,
  business_name text,
  address text,
  road_address text,
  region_code text,
  region_name text,
  category_name text,
  x numeric,
  y numeric,
  nts_tax_type text,
  nts_biz_status text,
  nts_close_date text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_external_enrichments_business_source
  on public.external_enrichments (business_key, source);

create index if not exists idx_external_enrichments_business_key
  on public.external_enrichments (business_key);

create index if not exists idx_external_enrichments_source
  on public.external_enrichments (source);

create or replace function public.set_external_enrichments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_external_enrichments_updated_at on public.external_enrichments;

create trigger trg_external_enrichments_updated_at
before update on public.external_enrichments
for each row
execute function public.set_external_enrichments_updated_at();