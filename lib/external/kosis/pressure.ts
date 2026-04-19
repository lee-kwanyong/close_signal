import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

export type ExternalClosurePressureRow = {
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
  pressure_score: number | null;
};

export type ExternalClosurePressureSummary = {
  regionCode: string;
  regionName: string | null;
  latestYear: number | null;
  pressureGrade: string;
  pressureScore: number;
  closedTotal: number;
  nationalSharePct: number | null;
  yoyClosedDeltaPct: number | null;
  summaryText: string;
};

function toNumber(value: number | null | undefined, fallback = 0) {
  return value === null || value === undefined || Number.isNaN(value)
    ? fallback
    : Number(value);
}

function toGrade(value: string | null | undefined) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "critical") return "critical";
  if (normalized === "high") return "high";
  if (normalized === "moderate") return "moderate";
  return "observe";
}

function formatSignedPercent(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const n = Number(value);
  if (n > 0) return `+${n.toFixed(digits)}%`;
  if (n < 0) return `${n.toFixed(digits)}%`;
  return `0.${"0".repeat(digits)}%`;
}

export function formatExternalClosurePressureText(row: ExternalClosurePressureSummary) {
  const closed = new Intl.NumberFormat("ko-KR").format(row.closedTotal);
  const share =
    row.nationalSharePct === null || row.nationalSharePct === undefined
      ? "-"
      : `${Number(row.nationalSharePct).toFixed(2)}%`;
  const yoy = formatSignedPercent(row.yoyClosedDeltaPct, 1);

  return `${row.latestYear ?? "-"} ${row.regionName || row.regionCode} 폐업자 ${closed}명 · 전국비중 ${share} · 전년대비 ${yoy}`;
}

function mapRowToSummary(row: ExternalClosurePressureRow): ExternalClosurePressureSummary {
  const summary: ExternalClosurePressureSummary = {
    regionCode: row.region_code ?? "-",
    regionName: row.region_name ?? null,
    latestYear: row.period_year ?? null,
    pressureGrade: toGrade(row.pressure_grade),
    pressureScore: toNumber(row.pressure_score, 0),
    closedTotal: toNumber(row.closed_total, 0),
    nationalSharePct:
      row.national_share_pct === null || row.national_share_pct === undefined
        ? null
        : Number(row.national_share_pct),
    yoyClosedDeltaPct:
      row.yoy_closed_delta_pct === null || row.yoy_closed_delta_pct === undefined
        ? null
        : Number(row.yoy_closed_delta_pct),
    summaryText: "",
  };

  summary.summaryText = formatExternalClosurePressureText(summary);
  return summary;
}

export async function getExternalClosurePressureByRegionCode(
  regionCode: string,
): Promise<ExternalClosurePressureSummary | null> {
  const code = String(regionCode || "").trim();
  if (!code) return null;

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("v_external_closure_region_summary")
    .select("*")
    .eq("region_code", code)
    .eq("is_latest_year", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const row = (data ?? null) as ExternalClosurePressureRow | null;
  if (!row) return null;

  return mapRowToSummary(row);
}

export async function listTopExternalClosurePressure(limit = 10) {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 10;
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("v_external_closure_region_summary")
    .select("*")
    .eq("is_latest_year", true)
    .order("pressure_score", { ascending: false })
    .order("closed_total", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ExternalClosurePressureRow[]).map(mapRowToSummary);
}

export async function getExternalClosurePressureMapByRegionCodes(regionCodes: string[]) {
  const codes = Array.from(
    new Set(
      regionCodes
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );

  if (codes.length === 0) {
    return new Map<string, ExternalClosurePressureSummary>();
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("v_external_closure_region_summary")
    .select("*")
    .eq("is_latest_year", true)
    .in("region_code", codes);

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, ExternalClosurePressureSummary>();

  for (const row of (data ?? []) as ExternalClosurePressureRow[]) {
    const summary = mapRowToSummary(row);
    map.set(summary.regionCode, summary);
  }

  return map;
}