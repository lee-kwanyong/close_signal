// collector/refresh-integrated-snapshot-risk.ts

import { buildIntegratedRiskRows } from "../lib/close-signal/snapshot-risk";
import {
  beginRun,
  createAdminClient,
  finishRun,
  loadSource,
  todayDateText,
  upsertBatches,
} from "./_collector-base";

type JsonRecord = Record<string, unknown>;

const SOURCE_KEY =
  process.env.INTEGRATED_RISK_SOURCE_KEY || "integrated_snapshot_risk_daily";

const TARGET_SNAPSHOT_DATE =
  process.env.INTEGRATED_RISK_SNAPSHOT_DATE || todayDateText();

const UPSERT_BATCH_SIZE = Number(
  process.env.INTEGRATED_RISK_BATCH_SIZE || "500",
);

const TABLES = {
  populationRows: "snapshot_population_region_day",
  householdRows: "snapshot_household_region_day",
  livingPopulationRows: "snapshot_living_population_region_day",

  competitionRows: "snapshot_competition_region_category_day",
  spendingRows: "snapshot_spending_region_category_day",
  rentRows: "snapshot_rent_region_day",
  searchTrendRows: "snapshot_search_trend_region_category_day",

  reviewRows: "snapshot_review_region_category_day",
  accessibilityRows: "snapshot_accessibility_region_day",
  tourismRows: "snapshot_tourism_region_day",
} as const;

type TableAlias = keyof typeof TABLES;

async function getLatestSnapshotDate(
  tableName: string,
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from(tableName)
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`${tableName} latest snapshot_date lookup failed: ${error.message}`);
  }

  const value = data?.snapshot_date;
  return typeof value === "string" ? value : null;
}

async function fetchRowsByDate(
  tableName: string,
  snapshotDate: string | null,
): Promise<JsonRecord[]> {
  if (!snapshotDate) return [];

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq("snapshot_date", snapshotDate);

  if (error) {
    throw new Error(`${tableName} fetch failed: ${error.message}`);
  }

  return (data ?? []) as JsonRecord[];
}

async function main() {
  const supabase = createAdminClient();
  const source = await loadSource(supabase, SOURCE_KEY);
  const startedAt = Date.now();

  const runId = await beginRun(supabase, source.id, {
    trigger: "collector",
    source_key: SOURCE_KEY,
    snapshot_date: TARGET_SNAPSHOT_DATE,
    mode: "derived_snapshot",
    input_tables: TABLES,
  });

  try {
    const tableDatesEntries = await Promise.all(
      Object.entries(TABLES).map(async ([alias, tableName]) => {
        const latestDate = await getLatestSnapshotDate(tableName);
        return [alias, latestDate] as const;
      }),
    );

    const tableDates = Object.fromEntries(tableDatesEntries) as Record<
      TableAlias,
      string | null
    >;

    const tableRowsEntries = await Promise.all(
      Object.entries(TABLES).map(async ([alias, tableName]) => {
        const rows = await fetchRowsByDate(
          tableName,
          tableDates[alias as TableAlias],
        );
        return [alias, rows] as const;
      }),
    );

    const tableRows = Object.fromEntries(tableRowsEntries) as Record<
      TableAlias,
      JsonRecord[]
    >;

    const integratedRows = buildIntegratedRiskRows({
      snapshotDate: TARGET_SNAPSHOT_DATE,
      tableDates,
      ...tableRows,
    });

    if (integratedRows.length === 0) {
      throw new Error(
        "No integrated rows were produced. Check snapshot source tables first.",
      );
    }

    await upsertBatches(
      supabase,
      "snapshot_integrated_risk_region_category_day",
      integratedRows.map((row) => ({
        ...row,
        source_id: source.id,
        source_run_id: runId,
      })),
      ["snapshot_date", "region_code", "category_id"],
      UPSERT_BATCH_SIZE,
    );

    await finishRun(supabase, runId, "success", null, {
      collector: {
        source_key: SOURCE_KEY,
        snapshot_date: TARGET_SNAPSHOT_DATE,
        duration_ms: Date.now() - startedAt,
        integrated_count: integratedRows.length,
        table_dates: tableDates,
        tables: Object.fromEntries(
          Object.entries(tableRows).map(([alias, rows]) => [alias, rows.length]),
        ),
      },
    });

    console.log(
      JSON.stringify({
        ok: true,
        source_key: SOURCE_KEY,
        source_id: source.id,
        run_id: runId,
        integrated_count: integratedRows.length,
        snapshot_date: TARGET_SNAPSHOT_DATE,
        table_dates: tableDates,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await finishRun(supabase, runId, "failed", message, {
      collector: {
        source_key: SOURCE_KEY,
        snapshot_date: TARGET_SNAPSHOT_DATE,
        duration_ms: Date.now() - startedAt,
      },
    });

    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});