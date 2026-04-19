import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/close-signal/supabase-admin";
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

type ImportRow = {
  source_key: string;
  org_id: string | null;
  tbl_id: string | null;
  external_key: string;
  period_code: string;
  period_year: number | null;
  region_code: string | null;
  region_name: string | null;
  closure_type_code: string | null;
  closure_type_name: string | null;
  metric_value: number;
  unit_name: string | null;
  raw_payload: Record<string, unknown>;
  collected_at: string;
};

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

async function buildImportRows() {
  const rawRows = await fetchKosisJsonByGeneratedUrl(getKosisClosure9816Url());
  const normalizedRows = normalizeKosisClosureRegionRows(rawRows);
  const dedupedRows = dedupeNormalizedKosisClosureRegionRows(normalizedRows);
  const collectedAt = new Date().toISOString();

  const importRows: ImportRow[] = dedupedRows.map((row) => ({
    source_key: row.sourceKey,
    org_id: row.orgId,
    tbl_id: row.tblId,
    external_key: row.externalKey,
    period_code: row.periodCode,
    period_year: row.periodYear,
    region_code: row.regionCode,
    region_name: row.regionName,
    closure_type_code: row.closureTypeCode,
    closure_type_name: row.closureTypeName,
    metric_value: row.metricValue,
    unit_name: row.unitName,
    raw_payload: row.rawPayload as Record<string, unknown>,
    collected_at: collectedAt,
  }));

  return {
    rawRows,
    normalizedRows,
    dedupedRows,
    importRows,
  };
}

async function runImport(commit: boolean) {
  const built = await buildImportRows();

  if (!commit) {
    return {
      ok: true,
      committed: false,
      rawCount: built.rawRows.length,
      normalizedCount: built.normalizedRows.length,
      dedupedCount: built.dedupedRows.length,
      summary: summarizeNormalizedKosisClosureRegionRows(built.dedupedRows),
      parsedSample: built.dedupedRows.slice(0, 20),
    };
  }

  const supabase = createSupabaseAdmin();
  let processed = 0;

  for (const batch of chunk(built.importRows, 500)) {
    const { error } = await supabase
      .from("external_closure_stats")
      .upsert(batch, {
        onConflict: "external_key",
        ignoreDuplicates: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    processed += batch.length;
  }

  return {
    ok: true,
    committed: true,
    rawCount: built.rawRows.length,
    normalizedCount: built.normalizedRows.length,
    dedupedCount: built.dedupedRows.length,
    importedCount: processed,
    summary: summarizeNormalizedKosisClosureRegionRows(built.dedupedRows),
    parsedSample: built.dedupedRows.slice(0, 10),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commit = searchParams.get("commit") === "1";
    const result = await runImport(commit);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        committed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const result = await runImport(true);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        committed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}