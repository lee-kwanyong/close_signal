import { NextResponse } from "next/server";
import {
  getExternalClosurePressureByRegionCode,
  listTopExternalClosurePressure,
} from "@/lib/external/kosis/pressure";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const regionCode = String(searchParams.get("regionCode") || "").trim();
    const limitParam = Number(searchParams.get("limit") || "10");
    const limit =
      Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;

    if (regionCode) {
      const row = await getExternalClosurePressureByRegionCode(regionCode);

      return NextResponse.json({
        ok: true,
        mode: "single",
        regionCode,
        row,
      });
    }

    const rows = await listTopExternalClosurePressure(limit);

    return NextResponse.json({
      ok: true,
      mode: "list",
      count: rows.length,
      rows,
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