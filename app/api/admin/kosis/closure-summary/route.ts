import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ExternalClosureRegionSummaryRow = {
  period_year: number | null;
  region_code: string | null;
  region_name: string | null;
  closed_total: number | null;
  closed_corporation: number | null;
  closed_individual: number | null;
  closed_general: number | null;
  closed_simple: number | null;
  national_closed_total: number | null;
  national_share_pct: number | null;
  prev_closed_total: number | null;
  yoy_closed_delta: number | null;
  yoy_closed_delta_pct: number | null;
  is_latest_year: boolean | null;
  pressure_grade: string | null;
};

function formatLabel(row: ExternalClosureRegionSummaryRow) {
  const region = row.region_name || row.region_code || "알수없음";
  const year = row.period_year ?? "-";
  const total =
    row.closed_total === null || row.closed_total === undefined
      ? "-"
      : Number(row.closed_total).toLocaleString("ko-KR");

  const share =
    row.national_share_pct === null || row.national_share_pct === undefined
      ? "-"
      : `${Number(row.national_share_pct).toFixed(2)}%`;

  const yoy =
    row.yoy_closed_delta_pct === null || row.yoy_closed_delta_pct === undefined
      ? "-"
      : `${Number(row.yoy_closed_delta_pct).toFixed(1)}%`;

  return `${year} ${region} 폐업자 ${total}명 · 전국비중 ${share} · 전년대비 ${yoy}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latestOnly = searchParams.get("latestOnly") !== "0";
    const limitParam = Number(searchParams.get("limit") || "30");
    const limit =
      Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 30;

    const supabase = await supabaseServer();

    let query = supabase
      .from("v_external_closure_region_summary")
      .select("*")
      .order("period_year", { ascending: false })
      .order("closed_total", { ascending: false });

    if (latestOnly) {
      query = query.eq("is_latest_year", true);
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as ExternalClosureRegionSummaryRow[];

    const criticalCount = rows.filter(
      (row) => row.pressure_grade === "critical",
    ).length;
    const highCount = rows.filter((row) => row.pressure_grade === "high").length;
    const moderateCount = rows.filter(
      (row) => row.pressure_grade === "moderate",
    ).length;

    return NextResponse.json({
      ok: true,
      count: rows.length,
      filters: {
        latestOnly,
        limit,
      },
      summary: {
        criticalCount,
        highCount,
        moderateCount,
      },
      rows,
      labels: rows.slice(0, 20).map(formatLabel),
    });
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