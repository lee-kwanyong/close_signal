import {
  type JsonRecord,
  loadCollectorSettings,
  normalizeRegionCode,
  pickNumber,
  pickObservedAt,
  pickString,
  runSnapshotCollector,
  toDateOnly,
} from "./_collector-base";

type AccessibilitySnapshotRow = JsonRecord & {
  snapshot_date: string;
  source_id: number;
  source_run_id: number;
  region_level: string;
  region_code: string;
  region_name: string | null;
  subway_station_count: number | null;
  bus_stop_count: number | null;
  parking_capacity_index: number | null;
  foot_traffic_access_index: number | null;
  transit_access_index: number | null;
  road_access_index: number | null;
  avg_walk_time_to_station_min: number | null;
  avg_walk_time_to_bus_stop_min: number | null;
  observed_at: string | null;
  meta: JsonRecord;
};

const settings = loadCollectorSettings("ACCESSIBILITY", {
  sourceKey: "accessibility_region_daily",
  resultPath: "",
  totalCountPath: "",
  pageSize: 500,
  paginationEnabled: true,
});

const REGION_LEVEL = process.env.ACCESSIBILITY_REGION_LEVEL?.trim() || "sigungu";

function normalizeAccessibilityRow(
  record: JsonRecord,
  snapshotDate: string,
  sourceId: number,
  sourceRunId: number,
): AccessibilitySnapshotRow | null {
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
    subway_station_count: pickNumber(record, [
      "subway_station_count",
      "station_count",
      "지하철역수",
    ]),
    bus_stop_count: pickNumber(record, [
      "bus_stop_count",
      "bus_count",
      "버스정류장수",
    ]),
    parking_capacity_index: pickNumber(record, [
      "parking_capacity_index",
      "parking_index",
      "주차수용지수",
    ]),
    foot_traffic_access_index: pickNumber(record, [
      "foot_traffic_access_index",
      "walk_access_index",
      "보행접근지수",
    ]),
    transit_access_index: pickNumber(record, [
      "transit_access_index",
      "public_transit_index",
      "대중교통접근지수",
    ]),
    road_access_index: pickNumber(record, [
      "road_access_index",
      "vehicle_access_index",
      "도로접근지수",
    ]),
    avg_walk_time_to_station_min: pickNumber(record, [
      "avg_walk_time_to_station_min",
      "walk_time_to_station_min",
      "역도보시간분",
    ]),
    avg_walk_time_to_bus_stop_min: pickNumber(record, [
      "avg_walk_time_to_bus_stop_min",
      "walk_time_to_bus_min",
      "버스도보시간분",
    ]),
    observed_at: pickObservedAt(record),
    meta: record,
  };
}

runSnapshotCollector<AccessibilitySnapshotRow>({
  settings,
  tableName: "snapshot_accessibility_region_day",
  conflictColumns: ["snapshot_date", "region_level", "region_code"],
  normalizeRow: ({ record, snapshotDate, sourceId, sourceRunId }) =>
    normalizeAccessibilityRow(record, snapshotDate, sourceId, sourceRunId),
}).catch((error) => {
  console.error(error);
  process.exit(1);
});