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

type TourismSnapshotRow = JsonRecord & {
  snapshot_date: string;
  source_id: number;
  source_run_id: number;
  region_level: string;
  region_code: string;
  region_name: string | null;
  tourist_count: number | null;
  visitor_index: number | null;
  local_event_count: number | null;
  event_demand_index: number | null;
  seasonal_peak_index: number | null;
  weather_sensitivity_index: number | null;
  tourism_change_30d: number | null;
  tourism_change_12m: number | null;
  top_event_keywords: unknown[];
  observed_at: string | null;
  meta: JsonRecord;
};

const settings = loadCollectorSettings("TOURISM", {
  sourceKey: "tourism_region_daily",
  resultPath: "",
  totalCountPath: "",
  pageSize: 500,
  paginationEnabled: true,
});

const REGION_LEVEL = process.env.TOURISM_REGION_LEVEL?.trim() || "sigungu";

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

function normalizeTourismRow(
  record: JsonRecord,
  snapshotDate: string,
  sourceId: number,
  sourceRunId: number,
): TourismSnapshotRow | null {
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
    tourist_count: pickNumber(record, [
      "tourist_count",
      "tourism_count",
      "방문관광객수",
      "DT",
    ]),
    visitor_index: pickNumber(record, [
      "visitor_index",
      "tourist_index",
      "방문지수",
    ]),
    local_event_count: pickNumber(record, [
      "local_event_count",
      "event_count",
      "행사건수",
    ]),
    event_demand_index: pickNumber(record, [
      "event_demand_index",
      "event_index",
      "행사수요지수",
    ]),
    seasonal_peak_index: pickNumber(record, [
      "seasonal_peak_index",
      "seasonality_index",
      "시즌피크지수",
    ]),
    weather_sensitivity_index: pickNumber(record, [
      "weather_sensitivity_index",
      "weather_index",
      "날씨민감도지수",
    ]),
    tourism_change_30d: normalizePercent(
      pickNumber(record, [
        "tourism_change_30d",
        "tourism_delta_30d",
        "방문증감률_30d",
      ]),
    ),
    tourism_change_12m: normalizePercent(
      pickNumber(record, [
        "tourism_change_12m",
        "tourism_delta_12m",
        "방문증감률_12m",
      ]),
    ),
    top_event_keywords: parseKeywordArray(
      record.top_event_keywords ??
        record.topEventKeywords ??
        record.event_keywords,
    ),
    observed_at: pickObservedAt(record),
    meta: record,
  };
}

runSnapshotCollector<TourismSnapshotRow>({
  settings,
  tableName: "snapshot_tourism_region_day",
  conflictColumns: ["snapshot_date", "region_level", "region_code"],
  normalizeRow: ({ record, snapshotDate, sourceId, sourceRunId }) =>
    normalizeTourismRow(record, snapshotDate, sourceId, sourceRunId),
}).catch((error) => {
  console.error(error);
  process.exit(1);
});