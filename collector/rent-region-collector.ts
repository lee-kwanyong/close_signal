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

type RentSnapshotRow = JsonRecord & {
  snapshot_date: string;
  source_id: number;
  source_run_id: number;
  region_level: string;
  region_code: string;
  region_name: string | null;
  avg_deposit: number | null;
  avg_monthly_rent: number | null;
  avg_rent_per_m2: number | null;
  vacancy_rate: number | null;
  listing_count: number | null;
  rent_change_12m: number | null;
  vacancy_change_12m: number | null;
  observed_at: string | null;
  meta: JsonRecord;
};

const settings = loadCollectorSettings("RENT", {
  sourceKey: "rent_region_daily",
  resultPath: "",
  totalCountPath: "",
  pageSize: 500,
  paginationEnabled: true,
});

const REGION_LEVEL = process.env.RENT_REGION_LEVEL?.trim() || "sigungu";

function normalizeRentRow(
  record: JsonRecord,
  snapshotDate: string,
  sourceId: number,
  sourceRunId: number,
): RentSnapshotRow | null {
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

  const regionName = pickString(record, [
    "region_name",
    "regionName",
    "sigungu_name",
    "emd_name",
    "행정구역명",
  ]);

  if (!regionCode) {
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
    avg_deposit: pickNumber(record, [
      "avg_deposit",
      "average_deposit",
      "deposit_avg",
      "평균보증금",
    ]),
    avg_monthly_rent: pickNumber(record, [
      "avg_monthly_rent",
      "average_monthly_rent",
      "monthly_rent_avg",
      "평균월세",
    ]),
    avg_rent_per_m2: pickNumber(record, [
      "avg_rent_per_m2",
      "rent_per_m2",
      "rent_m2_avg",
      "평균제곱미터월세",
    ]),
    vacancy_rate: normalizePercent(
      pickNumber(record, [
        "vacancy_rate",
        "empty_rate",
        "vacant_rate",
        "공실률",
      ]),
    ),
    listing_count: pickNumber(record, [
      "listing_count",
      "supply_listing_count",
      "매물수",
    ]),
    rent_change_12m: normalizePercent(
      pickNumber(record, [
        "rent_change_12m",
        "monthly_rent_change_12m",
        "임대료증감률_12m",
      ]),
    ),
    vacancy_change_12m: normalizePercent(
      pickNumber(record, [
        "vacancy_change_12m",
        "vacancy_delta_12m",
        "공실률증감_12m",
      ]),
    ),
    observed_at: pickObservedAt(record),
    meta: record,
  };
}

runSnapshotCollector<RentSnapshotRow>({
  settings,
  tableName: "snapshot_rent_region_day",
  conflictColumns: ["snapshot_date", "region_level", "region_code"],
  normalizeRow: ({ record, snapshotDate, sourceId, sourceRunId }) =>
    normalizeRentRow(record, snapshotDate, sourceId, sourceRunId),
}).catch((error) => {
  console.error(error);
  process.exit(1);
});