import type { KosisRawRow } from "@/lib/external/kosis/client";

export type NormalizedKosisClosureRegionRow = {
  sourceKey: string;
  orgId: string | null;
  tblId: string | null;
  externalKey: string;
  periodCode: string;
  periodYear: number | null;
  regionCode: string | null;
  regionName: string | null;
  closureTypeCode: string | null;
  closureTypeName: string | null;
  metricValue: number;
  unitName: string | null;
  rawPayload: KosisRawRow;
};

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toNullableNumber(value: unknown): number | null {
  const text = toText(value).replace(/,/g, "");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function toNullableYear(value: unknown): number | null {
  const text = toText(value);
  const match = text.match(/\d{4}/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function buildExternalKey(input: {
  sourceKey: string;
  periodCode: string;
  regionCode: string | null;
  closureTypeCode: string | null;
}) {
  return [
    input.sourceKey,
    input.periodCode || "-",
    input.regionCode || "-",
    input.closureTypeCode || "-",
  ].join(":");
}

export function normalizeKosisClosureRegionRows(
  rows: KosisRawRow[],
  sourceKey = "kosis_closure_9816_region",
): NormalizedKosisClosureRegionRow[] {
  const result: NormalizedKosisClosureRegionRow[] = [];

  for (const row of rows) {
    const metricValue = toNullableNumber(row.DT);
    if (metricValue === null) continue;

    const periodCode = toText(row.PRD_DE) || toText(row.prdDe);
    const periodYear = toNullableYear(periodCode);

    const regionCode = toText(row.C1) || null;
    const regionName = toText(row.C1_NM) || null;

    const closureTypeCode = toText(row.C2) || null;
    const closureTypeName = toText(row.C2_NM) || null;

    const unitName =
      toText(row.UNIT_NM) ||
      toText(row.UNIT_NAME) ||
      toText(row.UNIT_NM_ENG) ||
      toText(row.UNIT_ENG_NM) ||
      null;

    result.push({
      sourceKey,
      orgId: toText(row.ORG_ID) || null,
      tblId: toText(row.TBL_ID) || null,
      externalKey: buildExternalKey({
        sourceKey,
        periodCode,
        regionCode,
        closureTypeCode,
      }),
      periodCode,
      periodYear,
      regionCode,
      regionName,
      closureTypeCode,
      closureTypeName,
      metricValue,
      unitName,
      rawPayload: row,
    });
  }

  return result;
}

export function dedupeNormalizedKosisClosureRegionRows(
  rows: NormalizedKosisClosureRegionRow[],
) {
  const map = new Map<string, NormalizedKosisClosureRegionRow>();

  for (const row of rows) {
    map.set(row.externalKey, row);
  }

  return Array.from(map.values());
}

export function summarizeNormalizedKosisClosureRegionRows(
  rows: NormalizedKosisClosureRegionRow[],
) {
  const years = new Map<string, number>();
  const regions = new Set<string>();
  const closureTypes = new Set<string>();

  for (const row of rows) {
    years.set(row.periodCode, (years.get(row.periodCode) ?? 0) + 1);
    if (row.regionName) regions.add(row.regionName);
    if (row.closureTypeName) closureTypes.add(row.closureTypeName);
  }

  return {
    total: rows.length,
    years: Array.from(years.entries()).map(([period, count]) => ({
      period,
      count,
    })),
    regionCount: regions.size,
    closureTypeCount: closureTypes.size,
  };
}