// lib/close-signal/snapshot-risk.ts

export type JsonRecord = Record<string, unknown>;

type LatestTableDateMap = Record<string, string | null>;

type BuildIntegratedSnapshotInput = {
  snapshotDate: string;
  tableDates: LatestTableDateMap;

  populationRows: JsonRecord[];
  householdRows: JsonRecord[];
  livingPopulationRows: JsonRecord[];

  competitionRows: JsonRecord[];
  spendingRows: JsonRecord[];
  rentRows: JsonRecord[];
  searchTrendRows: JsonRecord[];

  reviewRows: JsonRecord[];
  accessibilityRows: JsonRecord[];
  tourismRows: JsonRecord[];
};

export type IntegratedRiskSnapshotRow = JsonRecord & {
  snapshot_date: string;
  region_code: string;
  region_name: string | null;
  category_id: number;
  category_name: string | null;

  adjusted_score: number;
  risk_grade: "critical" | "high" | "medium" | "low";

  pressure_score: number;
  pressure_grade: "critical" | "high" | "moderate" | "observe";

  integrated_signal_score: number;

  resident_population: number | null;
  resident_population_change_12m: number | null;
  one_person_share: number | null;
  households_change_12m: number | null;

  avg_living_population: number | null;
  living_population_change_3m: number | null;

  direct_competitor_count: number | null;
  competition_pressure_score: number | null;
  saturation_index: number | null;

  estimated_sales_index: number | null;
  operating_yoy_change_pct: number | null;

  avg_rating: number | null;
  review_count: number | null;

  transit_access_index: number | null;
  tourism_demand_score: number | null;

  national_share_pct: number | null;
  yoy_closed_delta_pct: number | null;
  close_rate_pct: number | null;
  net_change: number | null;

  internal_component_count: number;
  external_component_count: number;
  external_coverage_missing: boolean;

  source_dates: JsonRecord;
  evidence: JsonRecord;
  meta: JsonRecord;
};

function text(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function num(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(/,/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function weightedAverage(
  items: Array<{
    value: number | null | undefined;
    weight: number;
  }>,
) {
  const valid = items.filter((item) => item.value != null && Number.isFinite(item.value));
  if (valid.length === 0) return null;

  const totalWeight = valid.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return null;

  return (
    valid.reduce((sum, item) => sum + Number(item.value) * item.weight, 0) /
    totalWeight
  );
}

function normalizeRegionCode(value: unknown) {
  const raw = text(value)?.replace(/\s+/g, "") || null;
  if (!raw) return null;

  if (/^KR-\d{2}$/i.test(raw)) return raw.toUpperCase();
  if (/^\d{2,10}$/.test(raw)) return raw;

  return raw.toUpperCase();
}

function toCategoryId(row: JsonRecord) {
  const value = num(
    row.category_id,
    row.categoryId,
    row.biz_category_id,
    row.industry_code,
    row.categoryCode,
  );

  return value == null ? null : Math.floor(value);
}

function regionKey(row: JsonRecord) {
  return normalizeRegionCode(row.region_code ?? row.regionCode ?? row.adm_cd);
}

function regionCategoryKey(row: JsonRecord) {
  const regionCode = regionKey(row);
  const categoryId = toCategoryId(row);

  if (!regionCode || categoryId == null) return null;
  return `${regionCode}::${categoryId}`;
}

function mapByRegion(rows: JsonRecord[]) {
  const map = new Map<string, JsonRecord>();

  for (const row of rows) {
    const key = regionKey(row);
    if (!key) continue;
    map.set(key, row);
  }

  return map;
}

function mapByRegionCategory(rows: JsonRecord[]) {
  const map = new Map<string, JsonRecord>();

  for (const row of rows) {
    const key = regionCategoryKey(row);
    if (!key) continue;
    map.set(key, row);
  }

  return map;
}

function riskFromIndex(index: number | null | undefined) {
  if (index == null) return null;
  return clamp(100 - index);
}

function riskFromRating(rating: number | null | undefined) {
  if (rating == null) return null;
  return clamp((5 - rating) * 20);
}

function riskFromNegativePct(pct: number | null | undefined, scale = 8) {
  if (pct == null) return null;

  if (pct < 0) {
    return clamp(Math.abs(pct) * scale);
  }

  return clamp(25 - pct * 2, 0, 30);
}

function riskFromPositivePct(pct: number | null | undefined, scale = 8) {
  if (pct == null) return null;

  if (pct > 0) {
    return clamp(pct * scale);
  }

  return clamp(10 + Math.abs(pct) * 4, 0, 70);
}

function riskFromCount(count: number | null | undefined, multiplier = 3) {
  if (count == null) return null;
  return clamp(count * multiplier);
}

function internalGrade(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 80) return "critical";
  if (score >= 65) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function pressureGrade(score: number): "critical" | "high" | "moderate" | "observe" {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 35) return "moderate";
  return "observe";
}

function categoryNameFromRows(...rows: Array<JsonRecord | undefined>) {
  for (const row of rows) {
    if (!row) continue;
    const name = text(
      row.category_name,
      row.categoryName,
      row.industry_name,
      row["업종명"],
    );
    if (name) return name;
  }

  return null;
}

function regionNameFromRows(...rows: Array<JsonRecord | undefined>) {
  for (const row of rows) {
    if (!row) continue;
    const name = text(
      row.region_name,
      row.regionName,
      row.sigungu_name,
      row.emd_name,
      row["행정구역명"],
    );
    if (name) return name;
  }

  return null;
}

export function buildIntegratedRiskRows(
  input: BuildIntegratedSnapshotInput,
): IntegratedRiskSnapshotRow[] {
  const competitionMap = mapByRegionCategory(input.competitionRows);
  const spendingMap = mapByRegionCategory(input.spendingRows);
  const searchTrendMap = mapByRegionCategory(input.searchTrendRows);
  const reviewMap = mapByRegionCategory(input.reviewRows);

  const populationMap = mapByRegion(input.populationRows);
  const householdMap = mapByRegion(input.householdRows);
  const livingPopulationMap = mapByRegion(input.livingPopulationRows);
  const rentMap = mapByRegion(input.rentRows);
  const accessibilityMap = mapByRegion(input.accessibilityRows);
  const tourismMap = mapByRegion(input.tourismRows);

  const keys = new Set<string>();

  for (const key of competitionMap.keys()) keys.add(key);
  for (const key of spendingMap.keys()) keys.add(key);
  for (const key of searchTrendMap.keys()) keys.add(key);
  for (const key of reviewMap.keys()) keys.add(key);

  const nationalPopulation =
    average(
      input.populationRows
        .map((row) => num(row.total_population, row.population, row.DT))
        .filter((value): value is number => value != null),
    ) ?? null;

  const rows: IntegratedRiskSnapshotRow[] = [];

  for (const key of keys) {
    const [regionCode, rawCategoryId] = key.split("::");
    const categoryId = Number(rawCategoryId);

    if (!regionCode || !Number.isFinite(categoryId)) continue;

    const competition = competitionMap.get(key);
    const spending = spendingMap.get(key);
    const searchTrend = searchTrendMap.get(key);
    const review = reviewMap.get(key);

    const population = populationMap.get(regionCode);
    const household = householdMap.get(regionCode);
    const living = livingPopulationMap.get(regionCode);
    const rent = rentMap.get(regionCode);
    const access = accessibilityMap.get(regionCode);
    const tourism = tourismMap.get(regionCode);

    const regionName = regionNameFromRows(
      competition,
      spending,
      searchTrend,
      review,
      population,
      household,
      living,
      rent,
      access,
      tourism,
    );

    const categoryName = categoryNameFromRows(
      competition,
      spending,
      searchTrend,
      review,
    );

    const residentPopulation = num(
      population?.total_population,
      population?.population,
      population?.DT,
    );

    const residentPopulationChange12m = num(
      population?.population_change_12m,
      population?.resident_population_change_12m,
    );

    const onePersonShare = num(
      household?.one_person_share,
      household?.single_household_share,
    );

    const householdsChange12m = num(
      household?.households_change_12m,
      household?.one_person_change_12m,
    );

    const avgLivingPopulation = num(
      living?.avg_living_population,
      living?.living_population,
      living?.DT,
    );

    const livingPopulationChange3m = num(
      living?.living_population_change_3m,
      living?.avg_population_change_3m,
    );

    const directCompetitorCount = num(
      competition?.direct_competitor_count,
      competition?.same_category_poi_count,
    );

    const saturationIndex = num(
      competition?.saturation_index,
      competition?.market_saturation_index,
    );

    const totalSpendingIndex = num(
      spending?.total_spending_index,
      spending?.spending_index,
      spending?.sales_index,
      spending?.DT,
    );

    const cardSalesIndex = num(
      spending?.card_sales_index,
      spending?.card_spending_index,
    );

    const spendingChange12m = num(
      spending?.spending_change_12m,
      spending?.sales_change_12m,
    );

    const searchInterestIndex = num(
      searchTrend?.search_interest_index,
      searchTrend?.search_index,
      searchTrend?.interest_index,
      searchTrend?.DT,
    );

    const searchChange12w = num(
      searchTrend?.search_change_12w,
      searchTrend?.interest_change_12w,
    );

    const avgRating = num(review?.avg_rating, review?.rating);
    const reviewCount = num(review?.review_count, review?.reviews, review?.DT);
    const positiveReviewRatio = num(
      review?.positive_review_ratio,
      review?.positive_ratio,
    );
    const negativeReviewRatio = num(
      review?.negative_review_ratio,
      review?.negative_ratio,
    );
    const reviewChange30d = num(
      review?.review_change_30d,
      review?.mention_change_30d,
    );

    const rentPerM2 = num(rent?.avg_rent_per_m2, rent?.rent_per_m2);
    const vacancyRate = num(rent?.vacancy_rate, rent?.empty_rate);
    const rentChange12m = num(rent?.rent_change_12m, rent?.monthly_rent_change_12m);

    const transitAccessIndex = num(
      access?.transit_access_index,
      access?.public_transit_index,
    );

    const footTrafficAccessIndex = num(
      access?.foot_traffic_access_index,
      access?.walk_access_index,
    );

    const visitorIndex = num(
      tourism?.visitor_index,
      tourism?.tourist_index,
    );

    const eventDemandIndex = num(
      tourism?.event_demand_index,
      tourism?.event_index,
    );

    const seasonalPeakIndex = num(
      tourism?.seasonal_peak_index,
      tourism?.seasonality_index,
    );

    const tourismChange12m = num(
      tourism?.tourism_change_12m,
      tourism?.tourism_delta_12m,
    );

    const competitionPressureScore = weightedAverage([
      { value: riskFromCount(directCompetitorCount, 3), weight: 0.35 },
      { value: saturationIndex, weight: 0.35 },
      {
        value: riskFromPositivePct(
          num(competition?.competitor_growth_90d, competition?.competitor_growth_30d),
          7,
        ),
        weight: 0.30,
      },
    ]);

    const demandWeaknessScore = weightedAverage([
      { value: riskFromIndex(totalSpendingIndex), weight: 0.45 },
      { value: riskFromIndex(cardSalesIndex), weight: 0.25 },
      { value: riskFromNegativePct(spendingChange12m, 6), weight: 0.30 },
    ]);

    const reviewWeaknessScore = weightedAverage([
      { value: riskFromRating(avgRating), weight: 0.30 },
      { value: negativeReviewRatio, weight: 0.30 },
      { value: riskFromIndex(positiveReviewRatio), weight: 0.20 },
      { value: riskFromNegativePct(reviewChange30d, 5), weight: 0.20 },
    ]);

    const searchWeaknessScore = weightedAverage([
      { value: riskFromIndex(searchInterestIndex), weight: 0.65 },
      { value: riskFromNegativePct(searchChange12w, 5), weight: 0.35 },
    ]);

    const rentStressScore = weightedAverage([
      { value: rentPerM2, weight: 0.45 },
      { value: vacancyRate, weight: 0.20 },
      { value: riskFromPositivePct(rentChange12m, 5), weight: 0.35 },
    ]);

    const accessPenaltyScore = weightedAverage([
      { value: riskFromIndex(transitAccessIndex), weight: 0.60 },
      { value: riskFromIndex(footTrafficAccessIndex), weight: 0.40 },
    ]);

    const populationPressureScore = weightedAverage([
      { value: riskFromNegativePct(residentPopulationChange12m, 8), weight: 0.60 },
      { value: riskFromNegativePct(householdsChange12m, 6), weight: 0.40 },
    ]);

    const livingPressureScore = weightedAverage([
      { value: riskFromNegativePct(livingPopulationChange3m, 9), weight: 1.0 },
    ]);

    const tourismDemandScore = weightedAverage([
      { value: visitorIndex, weight: 0.45 },
      { value: eventDemandIndex, weight: 0.30 },
      { value: seasonalPeakIndex, weight: 0.25 },
    ]);

    const tourismWeaknessScore = weightedAverage([
      { value: riskFromIndex(visitorIndex), weight: 0.50 },
      { value: riskFromIndex(eventDemandIndex), weight: 0.25 },
      { value: riskFromNegativePct(tourismChange12m, 4), weight: 0.25 },
    ]);

    const adjustedScore =
      round1(
        weightedAverage([
          { value: competitionPressureScore, weight: 0.28 },
          { value: demandWeaknessScore, weight: 0.28 },
          { value: reviewWeaknessScore, weight: 0.16 },
          { value: searchWeaknessScore, weight: 0.14 },
          { value: rentStressScore, weight: 0.08 },
          { value: accessPenaltyScore, weight: 0.06 },
        ]) ?? 0,
      );

    const pressureScore =
      round1(
        weightedAverage([
          { value: populationPressureScore, weight: 0.40 },
          { value: livingPressureScore, weight: 0.30 },
          { value: rentStressScore, weight: 0.12 },
          { value: tourismWeaknessScore, weight: 0.08 },
          { value: accessPenaltyScore, weight: 0.10 },
        ]) ?? 0,
      );

    const integratedSignalScore = round1(
      weightedAverage([
        { value: adjustedScore, weight: 0.6 },
        { value: pressureScore, weight: 0.4 },
      ]) ?? adjustedScore,
    );

    const estimatedSalesIndex = round1(
      average([
        totalSpendingIndex,
        cardSalesIndex,
        searchInterestIndex,
        visitorIndex,
      ]) ?? 0,
    );

    const nationalSharePct =
      nationalPopulation && residentPopulation
        ? round1((residentPopulation / nationalPopulation) * 100)
        : null;

    const internalComponents = [
      competitionPressureScore,
      demandWeaknessScore,
      reviewWeaknessScore,
      searchWeaknessScore,
      rentStressScore,
      accessPenaltyScore,
    ].filter((value) => value != null).length;

    const externalComponents = [
      populationPressureScore,
      livingPressureScore,
      tourismWeaknessScore,
      accessPenaltyScore,
      rentStressScore,
    ].filter((value) => value != null).length;

    rows.push({
      snapshot_date: input.snapshotDate,
      region_code: regionCode,
      region_name: regionName,
      category_id: categoryId,
      category_name: categoryName,

      adjusted_score: adjustedScore,
      risk_grade: internalGrade(adjustedScore),

      pressure_score: pressureScore,
      pressure_grade: pressureGrade(pressureScore),

      integrated_signal_score: integratedSignalScore,

      resident_population: residentPopulation,
      resident_population_change_12m: residentPopulationChange12m,
      one_person_share: onePersonShare,
      households_change_12m: householdsChange12m,

      avg_living_population: avgLivingPopulation,
      living_population_change_3m: livingPopulationChange3m,

      direct_competitor_count: directCompetitorCount,
      competition_pressure_score:
        competitionPressureScore == null ? null : round1(competitionPressureScore),
      saturation_index: saturationIndex,

      estimated_sales_index: estimatedSalesIndex,
      operating_yoy_change_pct: spendingChange12m,

      avg_rating: avgRating,
      review_count: reviewCount,

      transit_access_index: transitAccessIndex,
      tourism_demand_score:
        tourismDemandScore == null ? null : round1(tourismDemandScore),

      national_share_pct: nationalSharePct,
      yoy_closed_delta_pct: null,
      close_rate_pct: null,
      net_change: null,

      internal_component_count: internalComponents,
      external_component_count: externalComponents,
      external_coverage_missing: externalComponents === 0,

      source_dates: {
        population: input.tableDates.populationRows ?? null,
        household: input.tableDates.householdRows ?? null,
        living_population: input.tableDates.livingPopulationRows ?? null,
        competition: input.tableDates.competitionRows ?? null,
        spending: input.tableDates.spendingRows ?? null,
        rent: input.tableDates.rentRows ?? null,
        search_trend: input.tableDates.searchTrendRows ?? null,
        review: input.tableDates.reviewRows ?? null,
        accessibility: input.tableDates.accessibilityRows ?? null,
        tourism: input.tableDates.tourismRows ?? null,
      },

      evidence: {
        internal: {
          competition_pressure_score:
            competitionPressureScore == null ? null : round1(competitionPressureScore),
          demand_weakness_score:
            demandWeaknessScore == null ? null : round1(demandWeaknessScore),
          review_weakness_score:
            reviewWeaknessScore == null ? null : round1(reviewWeaknessScore),
          search_weakness_score:
            searchWeaknessScore == null ? null : round1(searchWeaknessScore),
          rent_stress_score:
            rentStressScore == null ? null : round1(rentStressScore),
          access_penalty_score:
            accessPenaltyScore == null ? null : round1(accessPenaltyScore),
        },
        external: {
          population_pressure_score:
            populationPressureScore == null ? null : round1(populationPressureScore),
          living_pressure_score:
            livingPressureScore == null ? null : round1(livingPressureScore),
          tourism_weakness_score:
            tourismWeaknessScore == null ? null : round1(tourismWeaknessScore),
          pressure_score,
        },
        raw: {
          resident_population: residentPopulation,
          resident_population_change_12m: residentPopulationChange12m,
          one_person_share: onePersonShare,
          avg_living_population: avgLivingPopulation,
          living_population_change_3m: livingPopulationChange3m,
          direct_competitor_count: directCompetitorCount,
          saturation_index: saturationIndex,
          total_spending_index: totalSpendingIndex,
          search_interest_index: searchInterestIndex,
          avg_rating: avgRating,
          transit_access_index: transitAccessIndex,
          tourism_demand_score:
            tourismDemandScore == null ? null : round1(tourismDemandScore),
        },
      },

      meta: {
        builder: "snapshot-risk-v1",
      },
    });
  }

  return rows.sort((a, b) => {
    if (b.integrated_signal_score !== a.integrated_signal_score) {
      return b.integrated_signal_score - a.integrated_signal_score;
    }

    if (b.adjusted_score !== a.adjusted_score) {
      return b.adjusted_score - a.adjusted_score;
    }

    if (a.region_code !== b.region_code) {
      return a.region_code.localeCompare(b.region_code);
    }

    return a.category_id - b.category_id;
  });
}