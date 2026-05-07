import { rowHash } from "../utils/hash";

function num(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function normalizeSemas(row: Record<string, string>, sourceFileName: string) {
  const id = row["상가업소번호"] ?? row["semas_store_id"] ?? row["store_id"];
  return {
    semas_store_id: id,
    store_name: row["상호명"] ?? row["store_name"] ?? "unknown",
    industry_large_code: row["상권업종대분류코드"] ?? null,
    industry_large_name: row["상권업종대분류명"] ?? null,
    industry_middle_code: row["상권업종중분류코드"] ?? null,
    industry_middle_name: row["상권업종중분류명"] ?? null,
    industry_small_code: row["상권업종소분류코드"] ?? null,
    industry_small_name: row["상권업종소분류명"] ?? null,
    standard_industry_code: row["표준산업분류코드"] ?? null,
    standard_industry_name: row["표준산업분류명"] ?? null,
    sido_code: row["시도코드"] ?? null,
    sido_name: row["시도명"] ?? null,
    sigungu_code: row["시군구코드"] ?? null,
    sigungu_name: row["시군구명"] ?? null,
    admin_dong_code: row["행정동코드"] ?? null,
    admin_dong_name: row["행정동명"] ?? null,
    legal_dong_code: row["법정동코드"] ?? null,
    legal_dong_name: row["법정동명"] ?? null,
    address: row["지번주소"] ?? null,
    road_address: row["도로명주소"] ?? null,
    lat: num(row["위도"] ?? row["lat"]),
    lng: num(row["경도"] ?? row["lng"]),
    source_file_name: sourceFileName,
    source_row_hash: rowHash(row),
    raw_json: row
  };
}

export function normalizeSeoulMarket(row: Record<string, string>, sourceFileName: string) {
  const quarter = row["기준_년분기_코드"] ?? "20261";
  const year = Number(String(quarter).slice(0, 4));
  const q = Number(String(quarter).slice(4, 5) || 1);
  const month = (q - 1) * 3 + 1;
  return {
    snapshot_month: `${year}-${String(month).padStart(2, "0")}-01`,
    year_quarter_code: quarter,
    commercial_area_code: row["상권_코드"] ?? null,
    commercial_area_name: row["상권_코드_명"] ?? null,
    commercial_area_type_code: row["상권_구분_코드"] ?? null,
    commercial_area_type_name: row["상권_구분_코드_명"] ?? null,
    service_industry_code: row["서비스_업종_코드"] ?? null,
    service_industry_name: row["서비스_업종_코드_명"] ?? null,
    estimated_sales: num(row["분기당_매출_금액"]),
    sales_count: num(row["매출_건수"]),
    weekday_sales: num(row["주중_매출_금액"]),
    weekend_sales: num(row["주말_매출_금액"]),
    source_file_name: sourceFileName,
    source_row_hash: rowHash(row),
    raw_json: row
  };
}

export function normalizeLivingPopulation(row: Record<string, string>, sourceFileName: string) {
  const date = row["기준일ID"] ?? "20260501";
  return {
    snapshot_date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
    hour_code: num(row["시간대구분"]),
    admin_dong_code: row["행정동코드"] ?? "unknown",
    admin_dong_name: row["행정동명"] ?? null,
    total_population: num(row["총생활인구수"]),
    male_population: num(row["남성생활인구수"]),
    female_population: num(row["여성생활인구수"]),
    source_file_name: sourceFileName,
    source_row_hash: rowHash(row),
    raw_json: row
  };
}
