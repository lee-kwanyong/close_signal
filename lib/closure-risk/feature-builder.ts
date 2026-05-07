import type { StoreClosureRiskInput } from "@/lib/closure-risk/types";

type AnyRecord = Record<string, any>;

export type ClosureRiskSourceBundle = {
  customer: AnyRecord;
  profile: AnyRecord | null;
  business: AnyRecord | null;
  places: AnyRecord[];
  market: AnyRecord | null;
  competition: AnyRecord | null;
  previousCompetition?: AnyRecord | null;
  salesDaily?: AnyRecord[];
  latestCost?: AnyRecord | null;
  reviewWeeklyStats?: AnyRecord[];
  latestReviewIssue?: AnyRecord | null;
  latestRegionalIndicator?: AnyRecord | null;
  latestClosureStats?: AnyRecord | null;
  reviewConnections?: AnyRecord[];
};

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function bool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function firstNumber(record: AnyRecord | null | undefined, keys: string[]): number | null {
  if (!record) return null;
  for (const key of keys) {
    const value = num(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function sum(values: Array<number | null>): number | null {
  let total = 0;
  let seen = false;
  for (const value of values) {
    if (value !== null) {
      total += value;
      seen = true;
    }
  }
  return seen ? total : null;
}

function avg(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value !== null);
  if (!valid.length) return null;
  return valid.reduce((total, value) => total + value, 0) / valid.length;
}

function monthDiffFromNow(dateText: string | null | undefined): number | null {
  if (!dateText) return null;
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  return Math.max(0, (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth());
}

function salesAmount(row: AnyRecord): number | null {
  return firstNumber(row, ["sales_amount", "amount", "revenue", "daily_sales", "sales"]);
}

function recentSalesTotals(rows: AnyRecord[] | undefined) {
  const sorted = [...(rows ?? [])]
    .filter((row) => salesAmount(row) !== null)
    .sort((a, b) => String(b.sales_date ?? b.date ?? b.created_at ?? "").localeCompare(String(a.sales_date ?? a.date ?? a.created_at ?? "")));

  if (!sorted.length) return { salesLast30d: null, salesPrev30d: null, salesLast90d: null, salesPrev90d: null, operatingDaysLast30d: null };

  const first30 = sorted.slice(0, 30);
  const prev30 = sorted.slice(30, 60);
  const first90 = sorted.slice(0, 90);
  const prev90 = sorted.slice(90, 180);

  const operatingDaysLast30d = first30.filter((row) => {
    const amount = salesAmount(row);
    return amount !== null && amount > 0 && (row.is_open === undefined || row.is_open === null || bool(row.is_open));
  }).length;

  return {
    salesLast30d: sum(first30.map(salesAmount)),
    salesPrev30d: sum(prev30.map(salesAmount)),
    salesLast90d: sum(first90.map(salesAmount)),
    salesPrev90d: sum(prev90.map(salesAmount)),
    operatingDaysLast30d: operatingDaysLast30d || null
  };
}

function reviewStatsFromWeekly(rows: AnyRecord[] | undefined) {
  const sorted = [...(rows ?? [])].sort((a, b) => String(b.week_start_date ?? b.snapshot_date ?? b.created_at ?? "").localeCompare(String(a.week_start_date ?? a.snapshot_date ?? a.created_at ?? "")));
  if (!sorted.length) return { reviewCountLast30d: null, reviewCountPrev30d: null, avgRatingLast30d: null, negativeReviewRateLast30d: null };

  const current = sorted.slice(0, 4);
  const previous = sorted.slice(4, 8);
  return {
    reviewCountLast30d: sum(current.map((row) => firstNumber(row, ["review_count", "review_count_week", "reviews_count", "new_review_count"]))),
    reviewCountPrev30d: sum(previous.map((row) => firstNumber(row, ["review_count", "review_count_week", "reviews_count", "new_review_count"]))),
    avgRatingLast30d: avg(current.map((row) => firstNumber(row, ["avg_rating", "average_rating", "rating_avg"]))),
    negativeReviewRateLast30d: avg(current.map((row) => firstNumber(row, ["negative_review_rate", "negative_rate", "bad_review_rate"])))
  };
}

function reviewStatsFromPlaces(places: AnyRecord[]) {
  const latestFound = places.filter((place) => place.place_found !== false);
  if (!latestFound.length) return { reviewCountLast30d: null, avgRatingLast30d: null };
  return {
    reviewCountLast30d: sum(latestFound.map((place) => firstNumber(place, ["recent_review_count_30d"]))),
    avgRatingLast30d: avg(latestFound.map((place) => firstNumber(place, ["rating"])))
  };
}

function countConnectedReviewPlatforms(connections: AnyRecord[] | undefined): number {
  const platforms = new Set<string>();
  for (const connection of connections ?? []) {
    const platform = String(connection.platform ?? connection.provider ?? "").trim();
    if (!platform) continue;
    const connected = Boolean(connection.account_identifier) || connection.status === "connected" || connection.connection_status === "connected";
    if (connected) platforms.add(platform);
  }
  return platforms.size;
}

export function buildClosureRiskInput(bundle: ClosureRiskSourceBundle): StoreClosureRiskInput {
  const sales = recentSalesTotals(bundle.salesDaily);
  const weeklyReview = reviewStatsFromWeekly(bundle.reviewWeeklyStats);
  const placeReview = reviewStatsFromPlaces(bundle.places);

  const profileMonthlySales = firstNumber(bundle.profile, ["avg_monthly_sales_self_reported"]);
  const latestCost = bundle.latestCost;
  const rentMonthly = firstNumber(latestCost, ["rent_monthly", "rent", "rent_cost_monthly"]);
  const laborCostMonthly = firstNumber(latestCost, ["labor_cost_monthly", "labor_monthly", "payroll_monthly"]);
  const fixedCostMonthly = firstNumber(latestCost, ["fixed_cost_monthly", "fixed_cost", "total_fixed_cost_monthly"]);

  const currentCompetitionCount = firstNumber(bundle.competition, ["same_industry_count_300m", "same_industry_count_500m", "competition_count_nearby"]);
  const previousCompetitionCount = firstNumber(bundle.previousCompetition, ["same_industry_count_300m", "same_industry_count_500m", "competition_count_nearby"]);

  const regionClosureRate = firstNumber(bundle.latestClosureStats, ["region_closure_rate", "closure_rate", "closure_rate_region"])
    ?? firstNumber(bundle.latestRegionalIndicator, ["region_closure_rate", "closure_rate"]);
  const sameIndustryClosureRate = firstNumber(bundle.latestClosureStats, ["same_industry_closure_rate", "industry_closure_rate"]);

  const businessAgeMonths = monthDiffFromNow(bundle.business?.opened_at ?? bundle.customer?.opened_at);
  const reviewConnectedPlatformCount = countConnectedReviewPlatforms(bundle.reviewConnections);

  const reviewCountLast30d = weeklyReview.reviewCountLast30d ?? placeReview.reviewCountLast30d;
  const avgRatingLast30d = weeklyReview.avgRatingLast30d ?? placeReview.avgRatingLast30d;
  const negativeReviewRateLast30d = weeklyReview.negativeReviewRateLast30d
    ?? firstNumber(bundle.latestReviewIssue, ["negative_review_rate", "negative_rate"]);

  return {
    customerId: bundle.customer.customer_id,
    snapshotDate: new Date().toISOString().slice(0, 10),
    salesLast30d: sales.salesLast30d ?? profileMonthlySales,
    salesPrev30d: sales.salesPrev30d,
    salesLast90d: sales.salesLast90d,
    salesPrev90d: sales.salesPrev90d,
    operatingDaysLast30d: sales.operatingDaysLast30d,
    fixedCostMonthly,
    rentMonthly,
    laborCostMonthly,
    reviewCountLast30d,
    reviewCountPrev30d: weeklyReview.reviewCountPrev30d,
    avgRatingLast30d,
    negativeReviewRateLast30d,
    reviewConnectedPlatformCount,
    competitionCountNearby: currentCompetitionCount,
    competitionCountPrev: previousCompetitionCount,
    regionClosureRate,
    sameIndustryClosureRate,
    businessAgeMonths,
    dataCoverage: {
      sales: Boolean(sales.salesLast30d ?? profileMonthlySales),
      cost: Boolean(fixedCostMonthly ?? rentMonthly ?? laborCostMonthly),
      review: Boolean(reviewCountLast30d ?? avgRatingLast30d ?? negativeReviewRateLast30d),
      competition: Boolean(currentCompetitionCount),
      region: Boolean(regionClosureRate ?? sameIndustryClosureRate)
    }
  };
}
