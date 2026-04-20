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

type SpendingSnapshotRow = JsonRecord & {
  snapshot_date: string;
  source_id: number;
  source_run_id: number;
  region_level: string;
  region_code: string;
  region_name: string | null;
  category_id: number;
  category_name: string | null;
  resident_spending_index: number | null;
  floating_spending_index: number | null;
  total_spending_index: number | null;
  card_sales_index: number | null;
  average_ticket_size_index: number | null;
  spending_change_3m: number | null;
  spending_change_12m: number | null;
  observed_at: string | null;
  meta: JsonRecord;
};

const settings = loadCollectorSettings("SPENDING", {
  sourceKey: "spending_region_category_daily",
  resultPath: "",
  totalCountPath: "",
  pageSize: 500,
  paginationEnabled: true,
});

const REGION_LEVEL = process.env.SPENDING_REGION_LEVEL?.trim() || "sigungu";

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

function normalizeSpendingRow(
  record: JsonRecord,
  snapshotDate: string,
  sourceId: number,
  sourceRunId: number,
): SpendingSnapshotRow | null {
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
    resident_spending_index: pickNumber(record, [
      "resident_spending_index",
      "resident_sales_index",
      "residential_spending_index",
      "거주소비지수",
    ]),
    floating_spending_index: pickNumber(record, [
      "floating_spending_index",
      "floating_sales_index",
      "visitor_spending_index",
      "유동소비지수",
    ]),
    total_spending_index: pickNumber(record, [
      "total_spending_index",
      "spending_index",
      "sales_index",
      "총소비지수",
      "DT",
    ]),
    card_sales_index: pickNumber(record, [
      "card_sales_index",
      "card_spending_index",
      "card_index",
      "카드매출지수",
    ]),
    average_ticket_size_index: pickNumber(record, [
      "average_ticket_size_index",
      "avg_ticket_index",
      "객단가지수",
    ]),
    spending_change_3m: normalizePercent(
      pickNumber(record, [
        "spending_change_3m",
        "sales_change_3m",
        "spending_delta_3m",
        "소비증감률_3m",
      ]),
    ),
    spending_change_12m: normalizePercent(
      pickNumber(record, [
        "spending_change_12m",
        "sales_change_12m",
        "spending_delta_12m",
        "소비증감률_12m",
      ]),
    ),
    observed_at: pickObservedAt(record),
    meta: record,
  };
}

runSnapshotCollector<SpendingSnapshotRow>({
  settings,
  tableName: "snapshot_spending_region_category_day",
  conflictColumns: ["snapshot_date", "region_level", "region_code", "category_id"],
  normalizeRow: ({ record, snapshotDate, sourceId, sourceRunId }) =>
    normalizeSpendingRow(record, snapshotDate, sourceId, sourceRunId),
}).catch((error) => {
  console.error(error);
  process.exit(1);
});