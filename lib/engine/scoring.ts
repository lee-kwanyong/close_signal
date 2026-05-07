import { avg, clamp, weightedAverage } from "@/lib/utils/math";
import type { ScoreComponents } from "@/lib/db/types";

const defaultWeights: Record<keyof ScoreComponents, number> = {
  market_opportunity: 0.15,
  competition_position: 0.15,
  digital_discovery: 0.15,
  conversion_readiness: 0.15,
  trust_reaction: 0.1,
  action_velocity: 0.2,
  operation_basic: 0.1
};

export function scoreOperation(customer: any, business: any, profile: any) {
  return weightedAverage(
    {
      business_verified: business?.is_valid === true ? 100 : business ? 50 : 20,
      business_active: business?.business_status === "active" ? 100 : business?.business_status === "closed" ? 10 : 60,
      address_exists: customer?.address || customer?.road_address ? 100 : 0,
      coordinate_exists: customer?.lat && customer?.lng ? 100 : 0,
      industry_exists: customer?.industry_group && customer?.industry_group !== "unknown" ? 100 : 30,
      opened_at_exists: customer?.opened_at ? 100 : 50,
      profile_completeness: profile?.profile_completeness_score ?? 40
    },
    {
      business_verified: 0.2,
      business_active: 0.25,
      address_exists: 0.15,
      coordinate_exists: 0.15,
      industry_exists: 0.15,
      opened_at_exists: 0.05,
      profile_completeness: 0.05
    }
  );
}

export function scoreDigital(placeMatches: any[]) {
  const found = placeMatches.filter((p) => p.place_found);
  const foundAny = found.length > 0 ? 100 : 0;
  const multi = Math.min((found.length / 3) * 100, 100);
  return weightedAverage(
    {
      place_found_any: foundAny,
      multi_platform_presence: multi,
      name_match_score: avg(found.map((p) => Number(p.name_match_score))),
      address_match_score: avg(found.map((p) => Number(p.address_match_score))),
      category_match_score: avg(found.map((p) => Number(p.category_match_score))),
      coordinate_match_score: avg(found.map((p) => Number(p.coordinate_match_score)))
    },
    {
      place_found_any: 0.25,
      multi_platform_presence: 0.2,
      name_match_score: 0.15,
      address_match_score: 0.15,
      category_match_score: 0.15,
      coordinate_match_score: 0.1
    }
  );
}

export function scoreConversion(placeMatches: any[]) {
  const best = placeMatches.filter((p) => p.place_found).sort((a, b) => Number(b.match_confidence_score ?? 0) - Number(a.match_confidence_score ?? 0))[0];
  if (!best) return 20;
  return weightedAverage(
    {
      hours_available: best.hours_available ? 100 : 0,
      phone_available: best.phone_available ? 100 : 0,
      menu_available: best.menu_available ? 100 : 0,
      price_available: best.price_available ? 100 : 0,
      photo_available: best.photo_available ? 100 : 0,
      booking_link_available: best.booking_link_available ? 100 : 0,
      access_info_available: best.access_info_available ? 100 : 0
    },
    {
      hours_available: 0.15,
      phone_available: 0.1,
      menu_available: 0.2,
      price_available: 0.15,
      photo_available: 0.2,
      booking_link_available: 0.1,
      access_info_available: 0.1
    }
  );
}

function reviewCountScore(n: number | null) {
  if (n === null || Number.isNaN(n)) return null;
  if (n >= 300) return 100;
  if (n >= 100) return 85;
  if (n >= 50) return 70;
  if (n >= 20) return 55;
  if (n >= 5) return 40;
  if (n >= 1) return 25;
  return 10;
}

function ratingScore(n: number | null) {
  if (n === null || Number.isNaN(n)) return null;
  if (n >= 4.7) return 100;
  if (n >= 4.5) return 90;
  if (n >= 4.2) return 75;
  if (n >= 4.0) return 60;
  if (n >= 3.5) return 40;
  return 20;
}

export function scoreTrust(placeMatches: any[]) {
  const found = placeMatches.filter((p) => p.place_found);
  if (!found.length) return null;
  return weightedAverage(
    {
      review_count_score: avg(found.map((p) => reviewCountScore(p.review_count === null ? null : Number(p.review_count)))),
      rating_score: avg(found.map((p) => ratingScore(p.rating === null ? null : Number(p.rating)))),
      recent_review_score: avg(found.map((p) => p.recent_review_count_30d === null ? null : Math.min(Number(p.recent_review_count_30d) * 10, 100)))
    },
    { review_count_score: 0.4, rating_score: 0.3, recent_review_score: 0.3 }
  );
}

export function scoreMarket(market: any) {
  if (!market) return null;
  return weightedAverage(
    {
      market_demand_percentile: market.market_demand_percentile === null ? null : Number(market.market_demand_percentile),
      commercial_activity_score: market.commercial_activity_score === null ? null : Number(market.commercial_activity_score),
      demand_fit_score: market.demand_fit_score === null ? null : Number(market.demand_fit_score),
      living_population_score: market.living_population ? Math.min(Number(market.living_population) / 150, 100) : null,
      resident_population_score: market.resident_population ? Math.min(Number(market.resident_population) / 500, 100) : null,
      workplace_population_score: market.workplace_population ? Math.min(Number(market.workplace_population) / 500, 100) : null,
      complementary_business_score: market.complementary_business_count ? Math.min(Number(market.complementary_business_count) * 5, 100) : null
    },
    {
      market_demand_percentile: 0.3,
      commercial_activity_score: 0.2,
      demand_fit_score: 0.2,
      living_population_score: 0.1,
      resident_population_score: 0.05,
      workplace_population_score: 0.05,
      complementary_business_score: 0.1
    }
  );
}

function competitionPressureScore(v: number | null) {
  if (v === null || Number.isNaN(v)) return null;
  if (v <= 0.2) return 95;
  if (v <= 0.5) return 80;
  if (v <= 1.0) return 60;
  if (v <= 1.5) return 45;
  if (v <= 2.0) return 30;
  return 15;
}

export function scoreCompetition(competition: any) {
  if (!competition) return null;
  return weightedAverage(
    {
      competition_pressure_score: competitionPressureScore(competition.competition_pressure_index === null ? null : Number(competition.competition_pressure_index)),
      cluster_benefit_score: competition.cluster_benefit_score === null ? null : Number(competition.cluster_benefit_score),
      differentiation_gap_inverse_score: competition.differentiation_gap_score === null ? null : 100 - Number(competition.differentiation_gap_score),
      niche_opportunity_score: competition.niche_opportunity_score === null ? null : Number(competition.niche_opportunity_score)
    },
    {
      competition_pressure_score: 0.4,
      cluster_benefit_score: 0.2,
      differentiation_gap_inverse_score: 0.25,
      niche_opportunity_score: 0.15
    }
  );
}

export function scoreActionVelocity(events: any[], actions: any[]) {
  const count = (name: string) => events.filter((e) => e.event_name === name).length;
  const assigned = actions.length;
  const completed = actions.filter((a) => ["completed_l0", "evidence_submitted_l1", "verified_l2", "persisted_l3"].includes(a.status)).length;
  const reportViews = count("REPORT_VIEWED") + count("SCORE_VIEWED");
  return weightedAverage(
    {
      report_viewed_score: reportViews > 0 ? 100 : 0,
      report_revisit_score: Math.min(Math.max(reportViews - 1, 0) * 25, 100),
      action_clicked_score: Math.min(count("ACTION_CLICKED") * 20, 100),
      action_completed_score: Math.min(count("ACTION_COMPLETED") * 30, 100),
      mission_completion_rate: assigned > 0 ? (completed / assigned) * 100 : null,
      consultation_score: count("CONSULTATION_REQUESTED") > 0 ? 100 : 0,
      data_input_score: Math.min(count("DATA_INPUT_COMPLETED") * 25, 100),
      nudge_response_score: Math.min(count("NOTIFICATION_CLICKED") * 20, 100)
    },
    {
      report_viewed_score: 0.15,
      report_revisit_score: 0.1,
      action_clicked_score: 0.15,
      action_completed_score: 0.25,
      mission_completion_rate: 0.2,
      consultation_score: 0.05,
      data_input_score: 0.05,
      nudge_response_score: 0.05
    }
  );
}

export function calculateGrowthScore(components: ScoreComponents) {
  return weightedAverage(components as Record<string, number | null>, defaultWeights) ?? 50;
}

export function calculateDataConfidence(customer: any, business: any, places: any[], market: any, competition: any, events: any[]) {
  const coverage = avg([
    customer ? 100 : 0,
    business ? 100 : 0,
    places.length ? 100 : 0,
    market ? 100 : 0,
    competition ? 100 : 0,
    events.length ? 80 : 40
  ]) ?? 0;
  const matching = avg(places.map((p) => Number(p.match_confidence_score))) ?? 50;
  const freshness = 80;
  const source = avg([business ? 85 : 40, places.length ? 80 : 40, market ? 75 : 40, competition ? 75 : 40]) ?? 50;
  return weightedAverage({ coverage, matching, freshness, source }, { coverage: 0.35, matching: 0.25, freshness: 0.2, source: 0.2 }) ?? 0;
}

export function confidenceGrade(score: number) {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  return "D";
}

export function calculateGrowthLeverage(components: ScoreComponents, confidence: number) {
  return weightedAverage(
    {
      market: components.market_opportunity ?? 50,
      digital_gap: 100 - (components.digital_discovery ?? 50),
      conversion_gap: 100 - (components.conversion_readiness ?? 50),
      action_velocity: components.action_velocity ?? 40,
      data_confidence: confidence
    },
    { market: 0.25, digital_gap: 0.25, conversion_gap: 0.25, action_velocity: 0.15, data_confidence: 0.1 }
  ) ?? 0;
}

export function clampScore(score: number | null | undefined) {
  return clamp(score) ?? 0;
}
