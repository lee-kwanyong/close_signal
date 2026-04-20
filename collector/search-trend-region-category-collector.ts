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

type SearchTrendSnapshotRow = JsonRecord & {
  snapshot_date: string;
  source_id: number;
  source_run_id: number;
  region_level: string;
  region_code: string;
  region_name: string | null;
  category_id: number;
  category_name: string | null;
  search_interest_index: number | null;
  brand_search_interest_index: number | null;
  category_search_interest_index: number | null;
  search_change_4w: number | null;
  search_change_12w: number | null;
  top_keywords: unknown[];
  rising_keywords: unknown[];
  observed_at: string | null;
  meta: JsonRecord;
};

const settings = loadCollectorSettings("SEARCH_TREND", {
  sourceKey: "search_trend_region_category_daily",
  resultPath: "",
  totalCountPath: "",
  pageSize: 500,
  paginationEnabled: true,
});

const REGION_LEVEL = process.env.SEARCH_TREND_REGION_LEVEL?.trim() || "sigungu";

function resolveCategoryId(record: JsonRecord) {
  const value = pickNumber(record, [
    "category_id",
    "categoryId",
    "biz_category_id",
    "industry_code",
    "categoryCode",
    "업종코드",
  ]);

  return value === null ? null : Math.floor(value);
}

function parseKeywordArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function normalizeSearchTrendRow(
  record: JsonRecord,
  snapshotDate: string,
  sourceId: number,
  sourceRunId: number,
): SearchTrendSnapshotRow | null {
  const regionCode = normalizeRegionCode(
    pickString(record, [
      "region_code",
      "regionCode",
      "adm_cd",
      "sigungu_code",
      "sigunguCd",
      "emd_code",
      "emdCd",
      "행정구역코드",
    ]),
  );

  const categoryId = resolveCategoryId(record);
  const regionName = pickString(record, [
    "region_name",
    "regionName",
    "sigungu_name",
    "emd_name",
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
    search_interest_index: pickNumber(record, [
      "search_interest_index",
      "search_index",
      "interest_index",
      "검색관심지수",
      "DT",
    ]),
    brand_search_interest_index: pickNumber(record, [
      "brand_search_interest_index",
      "brand_search_index",
      "브랜드검색지수",
    ]),
    category_search_interest_index: pickNumber(record, [
      "category_search_interest_index",
      "category_search_index",
      "업종검색지수",
    ]),
    search_change_4w: normalizePercent(
      pickNumber(record, [
        "search_change_4w",
        "search_delta_4w",
        "interest_change_4w",
        "검색증감률_4w",
      ]),
    ),
    search_change_12w: normalizePercent(
      pickNumber(record, [
        "search_change_12w",
        "search_delta_12w",
        "interest_change_12w",
        "검색증감률_12w",
      ]),
    ),
    top_keywords: parseKeywordArray(
      record.top_keywords ?? record.topKeywords ?? record.keywords,
    ),
    rising_keywords: parseKeywordArray(
      record.rising_keywords ?? record.risingKeywords ?? record.rising,
    ),
    observed_at: pickObservedAt(record),
    meta: record,
  };
}

runSnapshotCollector<SearchTrendSnapshotRow>({
  settings,
  tableName: "snapshot_search_trend_region_category_day",
  conflictColumns: ["snapshot_date", "region_level", "region_code", "category_id"],
  normalizeRow: ({ record, snapshotDate, sourceId, sourceRunId }) =>
    normalizeSearchTrendRow(record, snapshotDate, sourceId, sourceRunId),
}).catch((error) => {
  console.error(error);
  process.exit(1);
});