begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.kosis_safe_numeric(p_value text)
returns numeric
language plpgsql
immutable
as $$
declare
  v text;
begin
  if p_value is null then
    return null;
  end if;

  v := btrim(p_value);

  if v = '' then
    return null;
  end if;

  v := replace(v, ',', '');
  v := replace(v, '%', '');
  v := regexp_replace(v, '[^0-9\.\-]', '', 'g');

  if v = '' then
    return null;
  end if;

  return v::numeric;
exception
  when others then
    return null;
end;
$$;

create or replace function public.scale_score(
  p_value numeric,
  p_min numeric,
  p_max numeric,
  p_reverse boolean default false
)
returns numeric
language sql
immutable
as $$
  select case
    when p_value is null then null
    when p_min = p_max then 50::numeric
    when p_reverse = false then greatest(0::numeric, least(100::numeric, ((p_value - p_min) / nullif(p_max - p_min, 0)) * 100))
    else greatest(0::numeric, least(100::numeric, ((p_max - p_value) / nullif(p_max - p_min, 0)) * 100))
  end;
$$;

create table if not exists public.kosis_indicator_catalog (
  indicator_key text primary key,
  stage smallint not null check (stage in (1, 2)),
  title text not null,
  description text,
  source_group text not null,
  endpoint_path text not null default '/openapi/Param/statisticsParameterData.do',
  table_id text not null,
  cycle text not null check (cycle in ('M', 'Q', 'A')),
  value_unit text,
  region_required boolean not null default true,
  category_required boolean not null default false,
  request_params jsonb not null default '{}'::jsonb,
  response_data_path text[] not null default '{}'::text[],
  period_field text not null default 'PRD_DE',
  value_field text not null default 'DT',
  label_field text not null default 'C1_NM',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.region_kosis_map (
  region_code text primary key,
  region_name text,
  kosis_region_code text not null,
  level text not null check (level in ('sido', 'sigungu', 'emd')),
  fallback_region_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.category_kosis_map (
  category_id text not null,
  indicator_key text not null references public.kosis_indicator_catalog(indicator_key) on delete cascade,
  kosis_class_code text not null,
  label text,
  weight numeric(8,4) not null default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (category_id, indicator_key, kosis_class_code)
);

create table if not exists public.regional_market_indicators_raw (
  id bigserial primary key,
  indicator_key text not null references public.kosis_indicator_catalog(indicator_key) on delete cascade,
  region_code text not null,
  category_id text not null default '__ALL__',
  base_period text not null,
  period_type text not null check (period_type in ('M', 'Q', 'A')),
  value_num numeric,
  value_text text,
  label text,
  source_value jsonb not null default '{}'::jsonb,
  source_table_id text not null,
  source_region_code text,
  source_class_code text,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (indicator_key, region_code, category_id, base_period)
);

create table if not exists public.regional_market_indicators (
  region_code text not null,
  category_id text not null default '__ALL__',
  base_period text not null,
  population_yoy numeric,
  employment_rate numeric,
  unemployment_rate numeric,
  business_count_yoy numeric,
  service_index numeric,
  retail_sales_index numeric,
  food_cpi numeric,
  consumer_cpi numeric,
  household_consumption numeric,
  household_income numeric,
  regional_composite_index numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (region_code, category_id, base_period)
);

create table if not exists public.regional_market_scores (
  region_code text not null,
  category_id text not null,
  base_period text not null,
  market_risk_score numeric(5,2) not null,
  external_pressure_score numeric(5,2) not null,
  recoverability_score numeric(5,2) not null,
  price_pressure_score numeric(5,2),
  demand_resilience_score numeric(5,2),
  reasons jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (region_code, category_id, base_period)
);

create index if not exists idx_kosis_indicator_catalog_active
  on public.kosis_indicator_catalog (is_active, stage, indicator_key);

create index if not exists idx_region_kosis_map_kosis_code
  on public.region_kosis_map (kosis_region_code);

create index if not exists idx_category_kosis_map_indicator
  on public.category_kosis_map (indicator_key, category_id);

create index if not exists idx_regional_market_raw_region_period
  on public.regional_market_indicators_raw (region_code, category_id, base_period);

create index if not exists idx_regional_market_scores_region_period
  on public.regional_market_scores (region_code, category_id, base_period desc);

drop trigger if exists trg_kosis_indicator_catalog_updated_at on public.kosis_indicator_catalog;
create trigger trg_kosis_indicator_catalog_updated_at
before update on public.kosis_indicator_catalog
for each row
execute function public.set_updated_at();

drop trigger if exists trg_region_kosis_map_updated_at on public.region_kosis_map;
create trigger trg_region_kosis_map_updated_at
before update on public.region_kosis_map
for each row
execute function public.set_updated_at();

drop trigger if exists trg_category_kosis_map_updated_at on public.category_kosis_map;
create trigger trg_category_kosis_map_updated_at
before update on public.category_kosis_map
for each row
execute function public.set_updated_at();

drop trigger if exists trg_regional_market_raw_updated_at on public.regional_market_indicators_raw;
create trigger trg_regional_market_raw_updated_at
before update on public.regional_market_indicators_raw
for each row
execute function public.set_updated_at();

drop trigger if exists trg_regional_market_indicators_updated_at on public.regional_market_indicators;
create trigger trg_regional_market_indicators_updated_at
before update on public.regional_market_indicators
for each row
execute function public.set_updated_at();

drop trigger if exists trg_regional_market_scores_updated_at on public.regional_market_scores;
create trigger trg_regional_market_scores_updated_at
before update on public.regional_market_scores
for each row
execute function public.set_updated_at();

create or replace function public.rebuild_regional_market_indicators(
  p_region_code text default null,
  p_category_id text default null,
  p_base_period text default null
)
returns void
language plpgsql
as $$
begin
  insert into public.regional_market_indicators (
    region_code,
    category_id,
    base_period,
    population_yoy,
    employment_rate,
    unemployment_rate,
    business_count_yoy,
    service_index,
    retail_sales_index,
    food_cpi,
    consumer_cpi,
    household_consumption,
    household_income,
    regional_composite_index,
    created_at,
    updated_at
  )
  select
    r.region_code,
    r.category_id,
    r.base_period,
    max(case when r.indicator_key = 'population_yoy' then r.value_num end) as population_yoy,
    max(case when r.indicator_key = 'employment_rate' then r.value_num end) as employment_rate,
    max(case when r.indicator_key = 'unemployment_rate' then r.value_num end) as unemployment_rate,
    max(case when r.indicator_key = 'business_count_yoy' then r.value_num end) as business_count_yoy,
    max(case when r.indicator_key = 'service_index' then r.value_num end) as service_index,
    max(case when r.indicator_key = 'retail_sales_index' then r.value_num end) as retail_sales_index,
    max(case when r.indicator_key = 'food_cpi' then r.value_num end) as food_cpi,
    max(case when r.indicator_key = 'consumer_cpi' then r.value_num end) as consumer_cpi,
    max(case when r.indicator_key = 'household_consumption' then r.value_num end) as household_consumption,
    max(case when r.indicator_key = 'household_income' then r.value_num end) as household_income,
    max(case when r.indicator_key = 'regional_composite_index' then r.value_num end) as regional_composite_index,
    now(),
    now()
  from public.regional_market_indicators_raw r
  where (p_region_code is null or r.region_code = p_region_code)
    and (p_category_id is null or r.category_id = p_category_id)
    and (p_base_period is null or r.base_period = p_base_period)
  group by r.region_code, r.category_id, r.base_period
  on conflict (region_code, category_id, base_period)
  do update set
    population_yoy = excluded.population_yoy,
    employment_rate = excluded.employment_rate,
    unemployment_rate = excluded.unemployment_rate,
    business_count_yoy = excluded.business_count_yoy,
    service_index = excluded.service_index,
    retail_sales_index = excluded.retail_sales_index,
    food_cpi = excluded.food_cpi,
    consumer_cpi = excluded.consumer_cpi,
    household_consumption = excluded.household_consumption,
    household_income = excluded.household_income,
    regional_composite_index = excluded.regional_composite_index,
    updated_at = now();
end;
$$;

create or replace function public.rebuild_regional_market_scores(
  p_region_code text default null,
  p_category_id text default null,
  p_base_period text default null
)
returns void
language plpgsql
as $$
declare
  rec record;
  population_risk numeric;
  employment_weakness numeric;
  unemployment_risk numeric;
  business_pressure numeric;
  service_weakness numeric;
  retail_weakness numeric;
  food_price_pressure numeric;
  consumer_price_pressure numeric;
  demand_strength numeric;
  income_strength numeric;
  composite_strength numeric;

  market_risk_score numeric;
  external_pressure_score numeric;
  recoverability_score numeric;
  price_pressure_score numeric;
  demand_resilience_score numeric;

  reasons_arr text[];
  risk_interpretation text;
  recovery_direction text;
begin
  for rec in
    select
      exact.region_code,
      exact.category_id,
      exact.base_period,

      coalesce(exact.population_yoy, fallback.population_yoy) as population_yoy,
      coalesce(exact.employment_rate, fallback.employment_rate) as employment_rate,
      coalesce(exact.unemployment_rate, fallback.unemployment_rate) as unemployment_rate,
      coalesce(exact.business_count_yoy, fallback.business_count_yoy) as business_count_yoy,
      coalesce(exact.service_index, fallback.service_index) as service_index,
      coalesce(exact.retail_sales_index, fallback.retail_sales_index) as retail_sales_index,
      coalesce(exact.food_cpi, fallback.food_cpi) as food_cpi,
      coalesce(exact.consumer_cpi, fallback.consumer_cpi) as consumer_cpi,
      coalesce(exact.household_consumption, fallback.household_consumption) as household_consumption,
      coalesce(exact.household_income, fallback.household_income) as household_income,
      coalesce(exact.regional_composite_index, fallback.regional_composite_index) as regional_composite_index
    from public.regional_market_indicators exact
    left join public.regional_market_indicators fallback
      on fallback.region_code = exact.region_code
     and fallback.category_id = '__ALL__'
     and fallback.base_period = exact.base_period
    where exact.category_id <> '__ALL__'
      and (p_region_code is null or exact.region_code = p_region_code)
      and (p_category_id is null or exact.category_id = p_category_id)
      and (p_base_period is null or exact.base_period = p_base_period)
  loop
    population_risk := coalesce(public.scale_score(rec.population_yoy, -5, 1, true), 50);
    employment_weakness := coalesce(public.scale_score(rec.employment_rate, 50, 70, true), 50);
    unemployment_risk := coalesce(public.scale_score(rec.unemployment_rate, 2, 8, false), 50);
    business_pressure := coalesce(public.scale_score(rec.business_count_yoy, -5, 3, true), 50);
    service_weakness := coalesce(public.scale_score(rec.service_index, 90, 110, true), 50);
    retail_weakness := coalesce(public.scale_score(rec.retail_sales_index, 90, 110, true), 50);
    food_price_pressure := coalesce(public.scale_score(rec.food_cpi, 100, 120, false), 50);
    consumer_price_pressure := coalesce(public.scale_score(rec.consumer_cpi, 100, 115, false), 50);
    demand_strength := coalesce(public.scale_score(rec.household_consumption, -5, 5, false), 50);
    income_strength := coalesce(public.scale_score(rec.household_income, -3, 5, false), 50);
    composite_strength := coalesce(public.scale_score(rec.regional_composite_index, 90, 110, false), 50);

    market_risk_score :=
      round((
        population_risk * 0.35 +
        ((employment_weakness + unemployment_risk) / 2) * 0.35 +
        ((service_weakness + retail_weakness) / 2) * 0.30
      )::numeric, 2);

    external_pressure_score :=
      round((
        business_pressure * 0.50 +
        ((service_weakness + retail_weakness) / 2) * 0.30 +
        ((food_price_pressure + consumer_price_pressure) / 2) * 0.20
      )::numeric, 2);

    price_pressure_score :=
      round(((food_price_pressure * 0.7) + (consumer_price_pressure * 0.3))::numeric, 2);

    demand_resilience_score :=
      round((
        demand_strength * 0.55 +
        income_strength * 0.25 +
        composite_strength * 0.20
      )::numeric, 2);

    recoverability_score :=
      round((
        demand_resilience_score * 0.50 +
        (100 - market_risk_score) * 0.30 +
        (100 - external_pressure_score) * 0.20
      )::numeric, 2);

    reasons_arr := array[]::text[];

    if rec.population_yoy is not null and rec.population_yoy <= -1 then
      reasons_arr := array_append(reasons_arr, '지역 인구 감소세');
    end if;

    if rec.employment_rate is not null and rec.employment_rate < 60 then
      reasons_arr := array_append(reasons_arr, '고용 여건 둔화');
    end if;

    if rec.unemployment_rate is not null and rec.unemployment_rate >= 4 then
      reasons_arr := array_append(reasons_arr, '실업률 부담 확대');
    end if;

    if rec.business_count_yoy is not null and rec.business_count_yoy <= -1 then
      reasons_arr := array_append(reasons_arr, '동일 업종 축소 추세');
    end if;

    if rec.service_index is not null and rec.service_index < 98 then
      reasons_arr := array_append(reasons_arr, '서비스 경기 약세');
    end if;

    if rec.retail_sales_index is not null and rec.retail_sales_index < 98 then
      reasons_arr := array_append(reasons_arr, '소매 소비 둔화');
    end if;

    if rec.food_cpi is not null and rec.food_cpi >= 105 then
      reasons_arr := array_append(reasons_arr, '외식 원가 압박');
    end if;

    if rec.household_consumption is not null and rec.household_consumption <= -1 then
      reasons_arr := array_append(reasons_arr, '가계 소비 위축');
    end if;

    if coalesce(array_length(reasons_arr, 1), 0) = 0 then
      reasons_arr := array['시장 배경 보통'];
    end if;

    risk_interpretation :=
      case
        when market_risk_score >= 75 and external_pressure_score >= 70
          then '지역 시장 체력과 업종 외부 압력이 함께 약한 구간입니다.'
        when market_risk_score >= 75
          then '지역 시장 체력 약화가 크게 작용하는 구간입니다.'
        when external_pressure_score >= 70
          then '동일 업종 외부 압력이 크게 작용하는 구간입니다.'
        else
          '시장 배경은 보통 수준이나 업종별 편차를 함께 봐야 합니다.'
      end;

    recovery_direction :=
      case
        when recoverability_score >= 70
          then '수요가 완전히 무너지지 않아 운영 개선과 포지셔닝 조정 여지가 있습니다.'
        when recoverability_score >= 45
          then '방어형 운영과 선택적 개입이 필요한 중간 구간입니다.'
        else
          '공격적 확장보다 고정비 방어와 구조 재편을 우선해야 하는 구간입니다.'
      end;

    insert into public.regional_market_scores (
      region_code,
      category_id,
      base_period,
      market_risk_score,
      external_pressure_score,
      recoverability_score,
      price_pressure_score,
      demand_resilience_score,
      reasons,
      summary,
      created_at,
      updated_at
    )
    values (
      rec.region_code,
      rec.category_id,
      rec.base_period,
      market_risk_score,
      external_pressure_score,
      recoverability_score,
      price_pressure_score,
      demand_resilience_score,
      to_jsonb(reasons_arr),
      jsonb_build_object(
        'riskInterpretation', risk_interpretation,
        'recoveryDirection', recovery_direction,
        'components', jsonb_build_object(
          'populationRisk', round(population_risk, 2),
          'employmentWeakness', round(employment_weakness, 2),
          'unemploymentRisk', round(unemployment_risk, 2),
          'businessPressure', round(business_pressure, 2),
          'serviceWeakness', round(service_weakness, 2),
          'retailWeakness', round(retail_weakness, 2),
          'foodPricePressure', round(food_price_pressure, 2),
          'consumerPricePressure', round(consumer_price_pressure, 2),
          'demandStrength', round(demand_strength, 2),
          'incomeStrength', round(income_strength, 2),
          'regionalCompositeStrength', round(composite_strength, 2)
        )
      ),
      now(),
      now()
    )
    on conflict (region_code, category_id, base_period)
    do update set
      market_risk_score = excluded.market_risk_score,
      external_pressure_score = excluded.external_pressure_score,
      recoverability_score = excluded.recoverability_score,
      price_pressure_score = excluded.price_pressure_score,
      demand_resilience_score = excluded.demand_resilience_score,
      reasons = excluded.reasons,
      summary = excluded.summary,
      updated_at = now();
  end loop;
end;
$$;

create or replace view public.v_regional_market_indicators_latest as
select distinct on (region_code, category_id)
  region_code,
  category_id,
  base_period,
  population_yoy,
  employment_rate,
  unemployment_rate,
  business_count_yoy,
  service_index,
  retail_sales_index,
  food_cpi,
  consumer_cpi,
  household_consumption,
  household_income,
  regional_composite_index,
  created_at,
  updated_at
from public.regional_market_indicators
order by region_code, category_id, base_period desc;

create or replace view public.v_regional_market_scores_latest as
select distinct on (region_code, category_id)
  region_code,
  category_id,
  base_period,
  market_risk_score,
  external_pressure_score,
  recoverability_score,
  price_pressure_score,
  demand_resilience_score,
  reasons,
  summary,
  created_at,
  updated_at
from public.regional_market_scores
order by region_code, category_id, base_period desc;

comment on table public.kosis_indicator_catalog is 'KOSIS 지표 정의. 실제 table_id / request_params를 여기에 등록한다.';
comment on table public.region_kosis_map is '앱 region_code와 KOSIS 지역코드 매핑';
comment on table public.category_kosis_map is '앱 category_id와 KOSIS 업종코드 매핑';
comment on table public.regional_market_indicators_raw is 'KOSIS 원천 수집값';
comment on table public.regional_market_indicators is '앱에서 바로 읽기 쉬운 정규화된 wide table';
comment on table public.regional_market_scores is '시장위험 / 외부압력 / 회복가능성 점수';

commit;