import { toText, toNullableNumber, toNumber } from "@/lib/format";

export type RankingRow = Record<string, unknown>;

export function getRankingRegionCode(row: RankingRow) {
  return toText(row.region_code, "") || toText(row.code, "") || "";
}

export function getRankingRegionName(row: RankingRow) {
  return toText(row.region_name, "") || toText(row.region, "") || "-";
}

export function getRankingCategoryId(row: RankingRow) {
  return toNullableNumber(row.category_id) ?? toNullableNumber(row.id) ?? null;
}

export function getRankingCategoryName(row: RankingRow) {
  return toText(row.category_name, "") || toText(row.category, "") || "-";
}

export function getRankingRiskScore(row: RankingRow) {
  return (
    toNullableNumber(row.risk_score) ??
    toNullableNumber(row.score) ??
    toNullableNumber(row.total_score) ??
    0
  );
}

export function getRankingRiskGrade(row: RankingRow) {
  return toText(row.risk_grade, "") || toText(row.grade, "") || "-";
}

export function getRankingSignalCount(row: RankingRow) {
  return (
    toNullableNumber(row.signal_count) ??
    toNullableNumber(row.signals_count) ??
    0
  );
}

export function getRankingBusinessCount(row: RankingRow) {
  return (
    toNullableNumber(row.business_count) ??
    toNullableNumber(row.sample_size) ??
    0
  );
}

export function getRankingChangeValue(row: RankingRow) {
  return (
    toNullableNumber(row.score_change) ??
    toNullableNumber(row.change_score) ??
    toNullableNumber(row.delta_score) ??
    0
  );
}

export function getRankingScoreDate(row: RankingRow) {
  return (
    toText(row.score_date, "") ||
    toText(row.base_date, "") ||
    toText(row.updated_at, "") ||
    "-"
  );
}

export function mapRankingRow(row: RankingRow) {
  return {
    regionCode: getRankingRegionCode(row),
    regionName: getRankingRegionName(row),
    categoryId: getRankingCategoryId(row),
    categoryName: getRankingCategoryName(row),
    riskScore: getRankingRiskScore(row),
    riskGrade: getRankingRiskGrade(row),
    signalCount: getRankingSignalCount(row),
    businessCount: getRankingBusinessCount(row),
    changeValue: getRankingChangeValue(row),
    scoreDate: getRankingScoreDate(row),
  };
}

export function getRankingSummary(rows: RankingRow[]) {
  const totalCount = rows.length;
  const highRiskCount = rows.filter((row) => getRankingRiskScore(row) >= 70).length;
  const avgRisk =
    totalCount > 0
      ? rows.reduce((sum, row) => sum + getRankingRiskScore(row), 0) / totalCount
      : 0;

  return {
    totalCount,
    highRiskCount,
    avgRisk,
  };
}