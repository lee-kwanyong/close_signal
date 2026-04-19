import { NextResponse } from "next/server";
import {
  fetchKosisJsonByGeneratedUrl,
  getKosisClosure9816Url,
} from "@/lib/external/kosis/client";
import {
  dedupeNormalizedKosisClosureRegionRows,
  normalizeKosisClosureRegionRows,
  summarizeNormalizedKosisClosureRegionRows,
} from "@/lib/external/kosis/closure-region-normalize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rawRows = await fetchKosisJsonByGeneratedUrl(getKosisClosure9816Url());
    const normalizedRows = normalizeKosisClosureRegionRows(rawRows);
    const dedupedRows = dedupeNormalizedKosisClosureRegionRows(normalizedRows);

    return NextResponse.json({
      ok: true,
      source: {
        orgId: "133",
        tblId: "DT_133001N_9816",
        sourceKey: "kosis_closure_9816_region",
      },
      rawCount: rawRows.length,
      normalizedCount: normalizedRows.length,
      dedupedCount: dedupedRows.length,
      summary: summarizeNormalizedKosisClosureRegionRows(dedupedRows),
      rawSample: rawRows.slice(0, 3),
      parsedSample: dedupedRows.slice(0, 20),
      importHint: {
        preview: "/api/admin/kosis/closure/import",
        commit: "/api/admin/kosis/closure/import?commit=1",
      },
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