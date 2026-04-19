import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

export type ExternalClosureRegionSummaryRow = {
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

export async function fetchExternalClosureRegionSummary(options?: {
  latestOnly?: boolean;
  limit?: number;
}) {
  const supabase = await supabaseServer();

  let query = supabase
    .from("v_external_closure_region_summary")
    .select("*")
    .order("period_year", { ascending: false })
    .order("closed_total", { ascending: false });

  if (options?.latestOnly) {
    query = query.eq("is_latest_year", true);
  }

  if (options?.limit && options.limit > 0) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ExternalClosureRegionSummaryRow[];
}

export function formatExternalPressureLabel(row: ExternalClosureRegionSummaryRow) {
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