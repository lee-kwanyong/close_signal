import {
  type JsonRecord,
  loadCollectorSettings,
  normalizePercent,
  normalizeRegionCode,
  pickNumber,
  pickObservedAt,
  pickString,
  runSnapshotCollector,
  toDateOnly,
} from "./_collector-base";

type CompetitionSnapshotRow = JsonRecord & {
  snapshot_date: string;
  source_id: number;
  source_run_id: number;
  region_level: string;
  region_code: string;
  region_name: string | null;
  category_id: number;
  category_name: string | null;
  direct_competitor_count: number | null;
  franchise_competitor_count: number | null;
  independent_competitor_count: number | null;
  same_category_poi_count: number | null;
  competitor_growth_30d: number | null;
  competitor_growth_90d: number | null;
  saturation_index: number | null;
  nearest_competitor_distance_m: number | null;
  observed_at: string | null;
  meta: JsonRecord;
};

const settings = loadCollectorSettings("COMPETITION", {
  sourceKey: "competition_region_category_daily",
  resultPath: "",
  totalCountPath: "",
  pageSize: 500,
  paginationEnabled: true,
});

const REGION_LEVEL = process.env.COMPETITION_REGION_LEVEL?.trim() || "sigungu";

function resolveCategoryId(record: JsonRecord) {
  const value = pickNumber(record, [
    "category_id",
    "categoryId",
    "ksic_category_id",
    "biz_category_id",
    "industry_code",
    "categoryCode",
    "indsLclsCd",
    "업종코드",
  ]);

  return value === null ? null : Math.floor(value);
}

function normalizeCompetitionRow(
  record: JsonRecord,
  snapshotDate: string,
  sourceId: number,
  sourceRunId: number,
): CompetitionSnapshotRow | null {
  const regionCode = normalizeRegionCode(
    pickString(record, [
      "region_code",
      "regionCode",
      "adm_cd",
      "sigungu_code",
      "sigunguCd",
      "emd_code",
      "emdCd",
      "ctprvn_cd",
      "행정구역코드",
    ]),
  );

  const categoryId = resolveCategoryId(record);
  const regionName = pickString(record, [
    "region_name",
    "regionName",
    "sigungu_name",
    "sigunguNm",
    "emd_name",
    "emdNm",
    "행정구역명",
  ]);

  const categoryName = pickString(record, [
    "category_name",
    "categoryName",
    "industry_name",
    "업종명",
  ]);

  if (!regionCode || categoryId === null) {
    return null;
  }

  const directCompetitorCount = pickNumber(record, [
    "direct_competitor_count",
    "competitor_count",
    "same_category_competitors",
    "동종경쟁점수",
    "동종점포수",
  ]);

  const franchiseCompetitorCount = pickNumber(record, [
    "franchise_competitor_count",
    "franchise_competitors",
    "franchise_count",
    "프랜차이즈경쟁점수",
  ]);

  const independentCompetitorCount = pickNumber(record, [
    "independent_competitor_count",
    "independent_competitors",
    "independent_count",
    "개인점경쟁점수",
  ]);

  const sameCategoryPoiCount =
    pickNumber(record, [
      "same_category_poi_count",
      "same_category_count",
      "poi_count",
      "동일업종점포수",
    ]) ?? directCompetitorCount;

  return {
    snapshot_date: toDateOnly(
      pickString(record, [
        "snapshot_date",
        "base_date",
        "baseDate",
        "stdr_de",
        "stdrDt",
        "period",
        "date",
      ]),
      snapshotDate,
    ),
    source_id: sourceId,
    source_run_id: sourceRunId,
    region_level: REGION_LEVEL,
    region_code: regionCode,
    region_name: regionName,
    category_id: categoryId,
    category_name: categoryName,
    direct_competitor_count: directCompetitorCount,
    franchise_competitor_count: franchiseCompetitorCount,
    independent_competitor_count: independentCompetitorCount,
    same_category_poi_count: sameCategoryPoiCount,
    competitor_growth_30d: normalizePercent(
      pickNumber(record, [
        "competitor_growth_30d",
        "competitor_delta_30d",
        "growth_30d",
        "경쟁증가율_30d",
      ]),
    ),
    competitor_growth_90d: normalizePercent(
      pickNumber(record, [
        "competitor_growth_90d",
        "competitor_delta_90d",
        "growth_90d",
        "경쟁증가율_90d",
      ]),
    ),
    saturation_index: pickNumber(record, [
      "saturation_index",
      "market_saturation_index",
      "density_index",
      "포화지수",
    ]),
    nearest_competitor_distance_m: pickNumber(record, [
      "nearest_competitor_distance_m",
      "nearest_distance_m",
      "distance_to_nearest_competitor",
      "최근접경쟁거리",
    ]),
    observed_at: pickObservedAt(record),
    meta: record,
  };
}

runSnapshotCollector<CompetitionSnapshotRow>({
  settings,
  tableName: "snapshot_competition_region_category_day",
  conflictColumns: ["snapshot_date", "region_level", "region_code", "category_id"],
  normalizeRow: ({ record, snapshotDate, sourceId, sourceRunId }) =>
    normalizeCompetitionRow(record, snapshotDate, sourceId, sourceRunId),
}).catch((error) => {
  console.error(error);
  process.exit(1);
});