import { toNumber, toNullableNumber, toText } from "@/lib/format";

export type WatchlistRow = {
  watchlist_id?: number | string | null;
  id?: number | string | null;
  region_code?: string | null;
  region_name?: string | null;
  category_id?: number | string | null;
  category_name?: string | null;
  risk_score?: number | string | null;
  risk_grade?: string | null;
  signal_count?: number | string | null;
  score_date?: string | null;
  created_at?: string | null;
};

export function mapWatchlistRow(row: WatchlistRow) {
  return {
    watchlistId: toNullableNumber(row.watchlist_id ?? row.id),
    regionCode: toText(row.region_code, ""),
    regionName: toText(row.region_name),
    categoryId: toNullableNumber(row.category_id),
    categoryName: toText(row.category_name),
    riskScore: toNumber(row.risk_score, 0),
    riskGrade: toText(row.risk_grade, "-"),
    signalCount: toNumber(row.signal_count, 0),
    scoreDate: toText(row.score_date ?? row.created_at),
  };
}