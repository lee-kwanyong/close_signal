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

type ReviewSnapshotRow = JsonRecord & {
  snapshot_date: string;
  source_id: number;
  source_run_id: number;
  region_level: string;
  region_code: string;
  region_name: string | null;
  category_id: number;
  category_name: string | null;
  review_count: number | null;
  avg_rating: number | null;
  positive_review_ratio: number | null;
  negative_review_ratio: number | null;
  repeat_visit_keyword_ratio: number | null;
  service_keyword_ratio: number | null;
  taste_keyword_ratio: number | null;
  value_keyword_ratio: number | null;
  review_change_30d: number | null;
  mention_change_30d: number | null;
  top_positive_keywords: unknown[];
  top_negative_keywords: unknown[];
  observed_at: string | null;
  meta: JsonRecord;
};

const settings = loadCollectorSettings("REVIEW", {
  sourceKey: "review_region_category_daily",
  resultPath: "",
  totalCountPath: "",
  pageSize: 500,
  paginationEnabled: true,
});

const REGION_LEVEL = process.env.REVIEW_REGION_LEVEL?.trim() || "sigungu";

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

function normalizeReviewRow(
  record: JsonRecord,
  snapshotDate: string,
  sourceId: number,
  sourceRunId: number,
): ReviewSnapshotRow | null {
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
    review_count: pickNumber(record, [
      "review_count",
      "reviews",
      "total_reviews",
      "리뷰수",
      "DT",
    ]),
    avg_rating: pickNumber(record, [
      "avg_rating",
      "average_rating",
      "rating",
      "평점",
    ]),
    positive_review_ratio: normalizePercent(
      pickNumber(record, [
        "positive_review_ratio",
        "positive_ratio",
        "positive_share",
        "긍정비율",
      ]),
    ),
    negative_review_ratio: normalizePercent(
      pickNumber(record, [
        "negative_review_ratio",
        "negative_ratio",
        "negative_share",
        "부정비율",
      ]),
    ),
    repeat_visit_keyword_ratio: normalizePercent(
      pickNumber(record, [
        "repeat_visit_keyword_ratio",
        "revisit_ratio",
        "재방문키워드비율",
      ]),
    ),
    service_keyword_ratio: normalizePercent(
      pickNumber(record, [
        "service_keyword_ratio",
        "service_ratio",
        "서비스키워드비율",
      ]),
    ),
    taste_keyword_ratio: normalizePercent(
      pickNumber(record, [
        "taste_keyword_ratio",
        "taste_ratio",
        "맛키워드비율",
      ]),
    ),
    value_keyword_ratio: normalizePercent(
      pickNumber(record, [
        "value_keyword_ratio",
        "cost_effective_ratio",
        "가성비키워드비율",
      ]),
    ),
    review_change_30d: normalizePercent(
      pickNumber(record, [
        "review_change_30d",
        "review_delta_30d",
        "리뷰증감률_30d",
      ]),
    ),
    mention_change_30d: normalizePercent(
      pickNumber(record, [
        "mention_change_30d",
        "mention_delta_30d",
        "언급증감률_30d",
      ]),
    ),
    top_positive_keywords: parseKeywordArray(
      record.top_positive_keywords ??
        record.topPositiveKeywords ??
        record.positive_keywords,
    ),
    top_negative_keywords: parseKeywordArray(
      record.top_negative_keywords ??
        record.topNegativeKeywords ??
        record.negative_keywords,
    ),
    observed_at: pickObservedAt(record),
    meta: record,
  };
}

runSnapshotCollector<ReviewSnapshotRow>({
  settings,
  tableName: "snapshot_review_region_category_day",
  conflictColumns: ["snapshot_date", "region_level", "region_code", "category_id"],
  normalizeRow: ({ record, snapshotDate, sourceId, sourceRunId }) =>
    normalizeReviewRow(record, snapshotDate, sourceId, sourceRunId),
}).catch((error) => {
  console.error(error);
  process.exit(1);
});