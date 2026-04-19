import type {
  ExplainableRiskInput,
  SalesBasis,
  SalesContext,
  SalesTrendStatus,
} from "./types";

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function nullableNum(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function clampChange(value: number) {
  return round1(clamp(value, -99, 180));
}

function hasAnyActualSales(input: ExplainableRiskInput) {
  return [
    input.actual_sales_change_7d,
    input.actual_sales_change_30d,
    input.actual_sales_change_mom,
    input.actual_sales_change_yoy,
  ].some((value) => nullableNum(value) !== null);
}

function visibilityAdjustment(input: ExplainableRiskInput) {
  const visibility = nullableNum(input.sbiz_visibility_score);
  const presence = nullableNum(input.external_presence_count);

  let score = 0;

  if (visibility !== null) {
    score += (visibility - 50) * 0.35;
  }

  if (presence !== null) {
    score += Math.min(8, presence * 1.2);
  }

  return score;
}

function freshnessAdjustment(input: ExplainableRiskInput) {
  const freshness = nullableNum(input.sbiz_freshness_score);
  if (freshness === null) return 0;
  return (freshness - 50) * 0.18;
}

function competitionDrag(input: ExplainableRiskInput) {
  const competition = nullableNum(input.sbiz_competition_score);
  const density = nullableNum(input.sbiz_density_score);
  const competitorCount = nullableNum(input.external_competitor_count);

  let drag = 0;

  if (competition !== null) {
    drag += Math.max(0, competition - 50) * 0.22;
  }

  if (density !== null) {
    drag += Math.max(0, density - 55) * 0.12;
  }

  if (competitorCount !== null) {
    drag += Math.max(0, competitorCount - 5) * 0.7;
  }

  return drag;
}

function searchInterestAdjustment(input: ExplainableRiskInput) {
  const delta = nullableNum(input.search_interest_delta_pct);
  if (delta === null) return 0;

  if (delta <= -30) return -12;
  if (delta <= -15) return -7;
  if (delta <= -5) return -3;
  if (delta >= 20) return 8;
  if (delta >= 8) return 4;

  return 0;
}

function businessScaleAdjustment(input: ExplainableRiskInput) {
  const businessCount = Math.max(1, num(input.business_count));
  return Math.min(8, Math.log10(businessCount + 1) * 3);
}

function buildEstimatedSalesChange30d(input: ExplainableRiskInput) {
  const netFlow = num(input.net_change_30d) * 2.4;
  const closureDrag = num(input.closure_score) * 0.55;
  const shrinkDrag = num(input.shrink_score) * 0.8;
  const shortLivedDrag = num(input.short_lived_score) * 0.35;
  const closureRateDrag = num(input.closure_rate_30d) * 100 * 1.4;
  const entryLift = num(input.new_entry_rate_30d) * 100 * 0.8;
  const overheatLift = num(input.overheat_score) * 0.22;

  const estimated =
    netFlow -
    closureDrag -
    shrinkDrag -
    shortLivedDrag -
    closureRateDrag +
    entryLift +
    overheatLift +
    visibilityAdjustment(input) +
    freshnessAdjustment(input) -
    competitionDrag(input) +
    searchInterestAdjustment(input) +
    businessScaleAdjustment(input);

  return clampChange(estimated);
}

function buildEstimatedSalesChange7d(input: ExplainableRiskInput, sales30d: number) {
  const netFlow = num(input.net_change_30d) * 1.4;
  const closureRateDrag = num(input.closure_rate_30d) * 100 * 0.8;
  const overheatLift = num(input.overheat_score) * 0.12;

  const estimated =
    sales30d * 0.55 +
    netFlow * 0.35 -
    closureRateDrag +
    overheatLift +
    visibilityAdjustment(input) * 0.35 -
    competitionDrag(input) * 0.2 +
    searchInterestAdjustment(input) * 0.6;

  return clampChange(estimated);
}

function buildEstimatedSalesChangeMom(input: ExplainableRiskInput, sales30d: number) {
  const netFlow = num(input.net_change_30d) * 1.8;

  const estimated =
    sales30d * 0.85 +
    netFlow * 0.25 +
    freshnessAdjustment(input) * 0.4 -
    competitionDrag(input) * 0.15 +
    searchInterestAdjustment(input) * 0.5;

  return clampChange(estimated);
}

function buildEstimatedSalesChangeYoy(input: ExplainableRiskInput) {
  const closureDrag = num(input.closure_score) * 0.7;
  const shrinkDrag = num(input.shrink_score) * 0.35;
  const shortLivedDrag = num(input.short_lived_score) * 0.2;
  const overheatLift = num(input.overheat_score) * 0.18;
  const netFlowLift = Math.max(0, num(input.net_change_30d)) * 0.25;

  const estimated =
    -closureDrag -
    shrinkDrag -
    shortLivedDrag +
    visibilityAdjustment(input) * 0.45 +
    freshnessAdjustment(input) * 0.3 +
    overheatLift -
    competitionDrag(input) * 0.12 +
    searchInterestAdjustment(input) * 0.45 +
    netFlowLift;

  return clampChange(estimated);
}

export function detectSalesTrendStatus(input: {
  sales_change_7d?: number | null;
  sales_change_30d?: number | null;
  sales_change_mom?: number | null;
  sales_change_yoy?: number | null;
}): SalesTrendStatus {
  const change7d = num(input.sales_change_7d);
  const change30d = num(input.sales_change_30d);
  const changeMom = num(input.sales_change_mom);
  const changeYoy = num(input.sales_change_yoy);

  const worst = Math.min(change7d, change30d, changeMom, changeYoy);
  const best = Math.max(change7d, change30d, changeMom, changeYoy);

  if (change7d >= 4 && change30d < 0) {
    return "rebound";
  }

  if (worst <= -18 || change30d <= -15 || changeMom <= -12) {
    return "sharp_drop";
  }

  if (worst <= -6 || change30d <= -5 || changeMom <= -4) {
    return "drop";
  }

  if (best >= 18 || change30d >= 15 || changeMom >= 12) {
    return "sharp_rise";
  }

  if (best >= 6 || change30d >= 5 || changeMom >= 4) {
    return "rise";
  }

  return "flat";
}

export function isSalesDropStatus(status: SalesTrendStatus) {
  return status === "sharp_drop" || status === "drop";
}

export function isSalesRiseStatus(status: SalesTrendStatus) {
  return status === "rise" || status === "sharp_rise";
}

export function buildSalesContext(input: ExplainableRiskInput): SalesContext {
  const estimated30d = buildEstimatedSalesChange30d(input);
  const estimated7d = buildEstimatedSalesChange7d(input, estimated30d);
  const estimatedMom = buildEstimatedSalesChangeMom(input, estimated30d);
  const estimatedYoy = buildEstimatedSalesChangeYoy(input);

  const hasActual = hasAnyActualSales(input);
  const basis: SalesBasis = hasActual ? "actual" : "estimated";

  const sales_change_7d =
    nullableNum(input.actual_sales_change_7d) ?? estimated7d;
  const sales_change_30d =
    nullableNum(input.actual_sales_change_30d) ?? estimated30d;
  const sales_change_mom =
    nullableNum(input.actual_sales_change_mom) ?? estimatedMom;
  const sales_change_yoy =
    nullableNum(input.actual_sales_change_yoy) ?? estimatedYoy;

  const sales_trend_status = detectSalesTrendStatus({
    sales_change_7d,
    sales_change_30d,
    sales_change_mom,
    sales_change_yoy,
  });

  return {
    sales_basis: basis,
    sales_change_7d,
    sales_change_30d,
    sales_change_mom,
    sales_change_yoy,
    sales_trend_status,
  };
}