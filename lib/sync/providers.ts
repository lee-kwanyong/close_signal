import { db, assertNoError, updateCustomerLocation } from "@/lib/db/repositories";
import { stableNumberFromText } from "@/lib/utils/hash";

function mockLatLng(customer: any) {
  const seed = `${customer.address ?? customer.road_address ?? customer.business_name}`;
  const latOffset = stableNumberFromText(seed + "lat", -8000, 8000) / 1000000;
  const lngOffset = stableNumberFromText(seed + "lng", -8000, 8000) / 1000000;
  return {
    lat: Number((37.5441234 + latOffset).toFixed(7)),
    lng: Number((127.0551234 + lngOffset).toFixed(7))
  };
}

export async function syncBusinessVerification(customer: any, businessNumber?: string) {
  const status = businessNumber || customer.business_number_hash ? "active" : "unknown";
  return assertNoError(
    await db().from("business_verification").insert({
      customer_id: customer.customer_id,
      source: businessNumber ? "nts_or_mock" : "mock",
      business_status: status,
      tax_type: "일반과세자",
      is_valid: status === "active",
      opened_at: customer.opened_at ?? null,
      raw_response_json: { mode: "supabase_node_mock", has_business_number: Boolean(businessNumber) }
    }).select("*").single(),
    "syncBusinessVerification"
  );
}

export async function ensureCoordinates(customer: any) {
  if (customer.lat && customer.lng) return customer;
  const { lat, lng } = mockLatLng(customer);
  return updateCustomerLocation(customer.customer_id, lat, lng);
}

export async function syncPlaceMatches(customer: any, platforms = ["naver", "kakao", "google"]) {
  const rows = [];
  for (const platform of platforms) {
    const found = platform !== "google" || customer.industry_group !== "unknown";
    const scoreBase = platform === "naver" ? 88 : platform === "kakao" ? 84 : 72;
    rows.push({
      customer_id: customer.customer_id,
      platform,
      place_found: found,
      external_place_id: found ? `${platform}_${customer.customer_id}` : null,
      place_name: found ? customer.business_name : null,
      place_category: customer.industry_name ?? customer.industry_group,
      place_url: found ? `https://example.com/${platform}/places/${customer.customer_id}` : null,
      place_address: customer.address ?? customer.road_address,
      place_road_address: customer.road_address ?? customer.address,
      place_lat: customer.lat,
      place_lng: customer.lng,
      phone_available: platform !== "google",
      hours_available: platform === "naver" || platform === "kakao",
      menu_available: false,
      price_available: false,
      photo_available: platform === "naver",
      booking_link_available: false,
      access_info_available: platform === "kakao",
      rating: platform === "google" ? 4.4 : null,
      review_count: platform === "google" ? 18 : null,
      recent_review_count_30d: platform === "google" ? 2 : null,
      recent_review_count_90d: platform === "google" ? 5 : null,
      name_match_score: found ? scoreBase : 0,
      address_match_score: found ? scoreBase - 2 : 0,
      category_match_score: found ? scoreBase - 12 : 0,
      coordinate_match_score: found ? 90 : 0,
      match_confidence_score: found ? scoreBase : 0,
      raw_payload_json: { mode: "mock", platform }
    });
  }
  const data = await assertNoError(await db().from("place_match_snapshot").insert(rows).select("*"), "syncPlaceMatches");
  return data;
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export async function syncCompetitionSnapshot(customer: any) {
  const { data: stores } = await db().from("external_semas_store").select("*").not("lat", "is", null).not("lng", "is", null).limit(10000);
  const lat = Number(customer.lat);
  const lng = Number(customer.lng);
  let same100 = 0;
  let same300 = 0;
  let same500 = 0;
  let similar300 = 0;
  let complementary300 = 0;
  for (const store of stores ?? []) {
    if (!store.lat || !store.lng) continue;
    const d = distanceMeters(lat, lng, Number(store.lat), Number(store.lng));
    const same = (store.industry_small_name && customer.industry_name && String(customer.industry_name).includes(store.industry_small_name)) || (store.standard_industry_name && customer.industry_name && String(customer.industry_name).includes(String(store.standard_industry_name).slice(0, 2)));
    const similar = store.industry_middle_name && customer.industry_group !== "unknown";
    const complementary = !same && d <= 300 && ["카페", "편의", "주차", "숙박", "서비스"].some((k) => String(store.industry_middle_name ?? store.industry_small_name ?? "").includes(k));
    if (same && d <= 100) same100++;
    if (same && d <= 300) same300++;
    if (same && d <= 500) same500++;
    if (!same && similar && d <= 300) similar300++;
    if (complementary) complementary300++;
  }
  if ((stores ?? []).length === 0) {
    same100 = 2; same300 = 12; same500 = 32; similar300 = 20; complementary300 = 9;
  }
  const pressure = Number((same300 / Math.max(10, complementary300 + 10)).toFixed(4));
  return assertNoError(await db().from("competition_snapshot").insert({
    customer_id: customer.customer_id,
    snapshot_month: new Date().toISOString().slice(0, 10),
    source: (stores ?? []).length ? "supabase_external_semas" : "mock",
    same_industry_count_100m: same100,
    same_industry_count_300m: same300,
    same_industry_count_500m: same500,
    similar_industry_count_300m: similar300,
    complementary_industry_count_300m: complementary300,
    competition_pressure_index: pressure,
    cluster_benefit_score: Math.min(65 + complementary300, 90),
    differentiation_gap_score: 66,
    niche_opportunity_score: Math.max(40, 80 - same300)
  }).select("*").single(), "syncCompetitionSnapshot");
}

export async function syncMarketSnapshot(customer: any) {
  const { data: marketRows } = await db().from("external_seoul_market_sales").select("*").order("estimated_sales", { ascending: false }).limit(1000);
  const { data: livingRows } = await db().from("external_seoul_living_population").select("*").order("total_population", { ascending: false }).limit(1000);
  const market = (marketRows ?? [])[0];
  const livingPopulation = (livingRows ?? []).reduce((acc, r) => acc + Number(r.total_population ?? 0), 0) / Math.max((livingRows ?? []).length, 1);
  const demand = market ? 82 : 70;
  return assertNoError(await db().from("market_snapshot").insert({
    customer_id: customer.customer_id,
    snapshot_month: new Date().toISOString().slice(0, 10),
    source: market ? "supabase_external_seoul_market" : "mock",
    region_code: "11",
    admin_dong_code: (livingRows ?? [])[0]?.admin_dong_code ?? null,
    admin_dong_name: (livingRows ?? [])[0]?.admin_dong_name ?? "성수1가2동",
    commercial_area_code: market?.commercial_area_code ?? "A100001",
    commercial_area_name: market?.commercial_area_name ?? "샘플 상권",
    estimated_market_sales: market?.estimated_sales ?? 430000000,
    living_population: livingPopulation || 12450,
    resident_population: 41000,
    workplace_population: 78000,
    attraction_facility_count: 12,
    complementary_business_count: 22,
    market_demand_percentile: demand,
    commercial_activity_score: 76,
    demand_fit_score: customer.industry_group === "unknown" ? 60 : 84,
    metadata_json: { market_row: market?.external_market_sales_id ?? null }
  }).select("*").single(), "syncMarketSnapshot");
}
