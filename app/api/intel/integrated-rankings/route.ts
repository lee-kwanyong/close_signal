import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/close-signal/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DistributionRow = {
  total_rows: number | null;
  avg_integrated_signal_score: number | null;
  critical_count: number | null;
  high_count: number | null;
  medium_count: number | null;
  low_count: number | null;
};

type RegionAggregateRow = {
  canonical_region_name: string | null;
  pressure_grade: string | null;
  avg_national_share_pct: number | null;
  avg_yoy_closed_delta_pct: number | null;
  avg_adjusted_score: number | null;
  avg_integrated_signal_score: number | null;
  max_integrated_signal_score: number | null;
  row_count: number | null;
  critical_count: number | null;
  high_count: number | null;
  medium_count: number | null;
  low_count: number | null;
};

type TopRow = {
  region_code: string | null;
  region_name: string | null;
  category_id: number | null;
  category_name: string | null;
  score_month: string | null;
  adjusted_score: number | null;
  risk_grade: string | null;
  closure_region_code: string | null;
  closure_region_name: string | null;
  pressure_grade: string | null;
  national_share_pct: number | null;
  yoy_closed_delta_pct: number | null;
  close_rate_pct: number | null;
  operating_yoy_change_pct: number | null;
  net_change: number | null;
  integrated_signal_score: number | null;
};

type GapRow = {
  region_code: string | null;
  region_name: string | null;
  category_id: number | null;
  category_name: string | null;
  score_month: string | null;
  adjusted_score: number | null;
  risk_grade: string | null;
  closure_region_code: string | null;
  closure_region_name: string | null;
  pressure_grade: string | null;
  integrated_signal_score: number | null;
};

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function text(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeDistributionRow(row: Record<string, unknown> | null): DistributionRow {
  return {
    total_rows: numberOrNull(row?.total_rows),
    avg_integrated_signal_score: numberOrNull(row?.avg_integrated_signal_score),
    critical_count: numberOrNull(row?.critical_count),
    high_count: numberOrNull(row?.high_count),
    medium_count: numberOrNull(row?.medium_count),
    low_count: numberOrNull(row?.low_count),
  };
}

function normalizeRegionAggregateRow(row: Record<string, unknown>): RegionAggregateRow {
  return {
    canonical_region_name: text(row.canonical_region_name),
    pressure_grade: text(row.pressure_grade),
    avg_national_share_pct: numberOrNull(row.avg_national_share_pct),
    avg_yoy_closed_delta_pct: numberOrNull(row.avg_yoy_closed_delta_pct),
    avg_adjusted_score: numberOrNull(row.avg_adjusted_score),
    avg_integrated_signal_score: numberOrNull(row.avg_integrated_signal_score),
    max_integrated_signal_score: numberOrNull(row.max_integrated_signal_score),
    row_count: numberOrNull(row.row_count),
    critical_count: numberOrNull(row.critical_count),
    high_count: numberOrNull(row.high_count),
    medium_count: numberOrNull(row.medium_count),
    low_count: numberOrNull(row.low_count),
  };
}

function normalizeTopRow(row: Record<string, unknown>): TopRow {
  return {
    region_code: text(row.region_code),
    region_name: text(row.region_name),
    category_id: numberOrNull(row.category_id),
    category_name: text(row.category_name),
    score_month: text(row.score_month),
    adjusted_score: numberOrNull(row.adjusted_score),
    risk_grade: text(row.risk_grade),
    closure_region_code: text(row.closure_region_code),
    closure_region_name: text(row.closure_region_name),
    pressure_grade: text(row.pressure_grade),
    national_share_pct: numberOrNull(row.national_share_pct),
    yoy_closed_delta_pct: numberOrNull(row.yoy_closed_delta_pct),
    close_rate_pct: numberOrNull(row.close_rate_pct),
    operating_yoy_change_pct: numberOrNull(row.operating_yoy_change_pct),
    net_change: numberOrNull(row.net_change),
    integrated_signal_score: numberOrNull(row.integrated_signal_score),
  };
}

function normalizeGapRow(row: Record<string, unknown>): GapRow {
  return {
    region_code: text(row.region_code),
    region_name: text(row.region_name),
    category_id: numberOrNull(row.category_id),
    category_name: text(row.category_name),
    score_month: text(row.score_month),
    adjusted_score: numberOrNull(row.adjusted_score),
    risk_grade: text(row.risk_grade),
    closure_region_code: text(row.closure_region_code),
    closure_region_name: text(row.closure_region_name),
    pressure_grade: text(row.pressure_grade),
    integrated_signal_score: numberOrNull(row.integrated_signal_score),
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin();
    const searchParams = request.nextUrl.searchParams;

    const limit = toPositiveInt(searchParams.get("limit"), 30);
    const includeGaps = searchParams.get("includeGaps") !== "false";
    const regionCode = text(searchParams.get("regionCode"));
    const canonicalRegionName = text(searchParams.get("canonicalRegionName"));

    const distributionPromise = supabase
      .from("v_integrated_risk_distribution_current")
      .select("*")
      .limit(1)
      .maybeSingle();

    const regionAggregatesPromise = supabase
      .from("v_integrated_risk_region_aggregates_current")
      .select("*")
      .order("avg_integrated_signal_score", { ascending: false, nullsFirst: false })
      .order("max_integrated_signal_score", { ascending: false, nullsFirst: false })
      .order("canonical_region_name", { ascending: true });

    let topQuery = supabase
      .from("v_integrated_risk_top_current")
      .select("*")
      .order("integrated_signal_score", { ascending: false, nullsFirst: false })
      .order("adjusted_score", { ascending: false, nullsFirst: false })
      .order("region_code", { ascending: true })
      .order("category_id", { ascending: true })
      .limit(limit);

    if (regionCode) {
      topQuery = topQuery.eq("region_code", regionCode);
    }

    let gapsQuery = supabase
      .from("v_integrated_risk_join_gaps_current")
      .select("*")
      .order("region_code", { ascending: true })
      .order("category_id", { ascending: true });

    if (regionCode) {
      gapsQuery = gapsQuery.eq("region_code", regionCode);
    }

    const [distributionRes, regionAggregatesRes, topRes, gapsRes] = await Promise.all([
      distributionPromise,
      regionAggregatesPromise,
      topQuery,
      includeGaps ? gapsQuery : Promise.resolve({ data: [], error: null }),
    ]);

    if (distributionRes.error) {
      throw new Error(distributionRes.error.message);
    }
    if (regionAggregatesRes.error) {
      throw new Error(regionAggregatesRes.error.message);
    }
    if (topRes.error) {
      throw new Error(topRes.error.message);
    }
    if (gapsRes.error) {
      throw new Error(gapsRes.error.message);
    }

    let regionAggregates = (regionAggregatesRes.data ?? []).map((row) =>
      normalizeRegionAggregateRow(row as Record<string, unknown>),
    );

    if (canonicalRegionName) {
      regionAggregates = regionAggregates.filter(
        (row) => row.canonical_region_name === canonicalRegionName,
      );
    }

    const topRows = (topRes.data ?? []).map((row) =>
      normalizeTopRow(row as Record<string, unknown>),
    );

    const gapRows = (gapsRes.data ?? []).map((row) =>
      normalizeGapRow(row as Record<string, unknown>),
    );

    const filteredGapRows = canonicalRegionName
      ? gapRows.filter((row) => row.region_name === canonicalRegionName)
      : gapRows;

    return NextResponse.json(
      {
        ok: true,
        filters: {
          limit,
          regionCode,
          canonicalRegionName,
          includeGaps,
        },
        summary: normalizeDistributionRow(
          (distributionRes.data ?? null) as Record<string, unknown> | null,
        ),
        regions: regionAggregates,
        topRows,
        gapRows: filteredGapRows,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}