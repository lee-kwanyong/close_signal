import { NextResponse } from "next/server";
import {
  buildIntegratedRegionCategoryBaselines,
  upsertIntegratedRegionCategoryBaselines,
} from "@/lib/close-signal/integrated-risk";

export const dynamic = "force-dynamic";

function summarize(rows: Awaited<ReturnType<typeof buildIntegratedRegionCategoryBaselines>>) {
  const highMarket = rows.filter((row) => row.integrated_market_score >= 70).length;
  const highFinal = rows.filter((row) => row.integrated_final_score >= 70).length;

  const avgMarket =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + row.integrated_market_score, 0) / rows.length
      : 0;

  const avgFinal =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + row.integrated_final_score, 0) / rows.length
      : 0;

  return {
    count: rows.length,
    highMarket,
    highFinal,
    avgMarket: Number(avgMarket.toFixed(1)),
    avgFinal: Number(avgFinal.toFixed(1)),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commit = searchParams.get("commit") === "1";

    const rows = await buildIntegratedRegionCategoryBaselines();
    const summary = summarize(rows);

    if (!commit) {
      return NextResponse.json({
        ok: true,
        committed: false,
        summary,
        sample: rows.slice(0, 20),
        hint: {
          commit: "/api/admin/integrated-risk?commit=1",
        },
      });
    }

    const result = await upsertIntegratedRegionCategoryBaselines(rows);

    return NextResponse.json({
      ok: true,
      committed: true,
      summary,
      processed: result.processed,
      sample: rows.slice(0, 10),
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