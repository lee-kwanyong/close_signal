import "server-only";
import { createSupabaseAdmin } from "@/lib/close-signal/supabase-admin";

type RankingRpcRow = Record<string, unknown> & {
  region_code: string;
  region_name: string | null;
  category_id: number;
  category_name: string | null;
  score_date: string | null;
};

type KosisPressureRow = {
  period_year: number | null;
  region_code: string | null;
  region_name: string | null;
  closed_total: number | null;
  national_share_pct: number | null;
  yoy_closed_delta_pct: number | null;
  pressure_grade: string | null;
  pressure_score: number | null;
  is_latest_year: boolean | null;
};

type NtsSnapshotRow = Record<string, unknown>;

export type IntegratedBaselineRow = {
  snapshot_date: string;
  region_code: string;
  region_name: string | null;
  category_id: number;
  category_name: string | null;

  smallbiz_risk_score: number;
  smallbiz_close_rate_7d: number;
  smallbiz_close_rate_30d: number;
  smallbiz_open_rate_7d: number;
  smallbiz_open_rate_30d: number;
  smallbiz_net_change_7d: number;
  smallbiz_net_change_30d: number;
  smallbiz_risk_delta_7d: number;
  smallbiz_risk_delta_30d: number;

  kosis_pressure_score: number | null;
  kosis_pressure_grade: string | null;
  kosis_closed_total: number | null;
  kosis_national_share_pct: number | null;
  kosis_yoy_closed_delta_pct: number | null;

  nts_business_score: number | null;

  integrated_market_score: number;
  integrated_final_score: number;

  summary_text: string;
  reason_codes: string[];
  raw_payload: Record<string, unknown>;
};

type NormalizedSmallbizMetrics = {
  riskScore: number;
  closeRate7d: number;
  closeRate30d: number;
  openRate7d: number;
  openRate30d: number;
  netChange7d: number;
  netChange30d: number;
  riskDelta7d: number;
  riskDelta30d: number;
  rawCloseOpenRatio: number;
  rawDensityIndex: number;
  rawCloseAccelRate: number;
  rawSurvivalDrop: number;
};

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nullableNum(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function roundInt(value: number) {
  return Math.round(value);
}

function safeDateString(value: string | null | undefined) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function pressureLabel(grade: string | null | undefined) {
  const v = String(grade || "").toLowerCase();
  if (v === "critical") return "치명";
  if (v === "high") return "높음";
  if (v === "moderate") return "주의";
  return "관찰";
}

function canonicalRegionName(name: string | null | undefined) {
  const raw = String(name || "").trim().replace(/\s+/g, "");
  if (!raw) return "";

  const aliasMap: Record<string, string> = {
    전국: "전국",
    서울: "서울",
    서울특별시: "서울",
    부산: "부산",
    부산광역시: "부산",
    대구: "대구",
    대구광역시: "대구",
    인천: "인천",
    인천광역시: "인천",
    광주: "광주",
    광주광역시: "광주",
    대전: "대전",
    대전광역시: "대전",
    울산: "울산",
    울산광역시: "울산",
    세종: "세종",
    세종특별자치시: "세종",
    경기: "경기",
    경기도: "경기",
    강원: "강원",
    강원도: "강원",
    강원특별자치도: "강원",
    충북: "충북",
    충청북도: "충북",
    충남: "충남",
    충청남도: "충남",
    전북: "전북",
    전라북도: "전북",
    전북특별자치도: "전북",
    전남: "전남",
    전라남도: "전남",
    경북: "경북",
    경상북도: "경북",
    경남: "경남",
    경상남도: "경남",
    제주: "제주",
    제주도: "제주",
    제주특별자치도: "제주",
  };

  return aliasMap[raw] ?? raw;
}

function canonicalRegionCode(code: string | null | undefined) {
  const raw = String(code || "").trim().toUpperCase();
  if (!raw) return "";

  const aliasMap: Record<string, string> = {
    A00: "KR",
    A01: "KR-11",
    A02: "KR-26",
    A03: "KR-41",
    A04: "KR-27",
    A05: "KR-28",
    A06: "KR-29",
    A07: "KR-30",
    A08: "KR-31",
    A09: "KR-36",
    A10: "KR-42",
    A11: "KR-43",
    A12: "KR-44",
    A13: "KR-45",
    A14: "KR-46",
    A15: "KR-47",
    A16: "KR-48",
    A17: "KR-50",
  };

  return aliasMap[raw] ?? raw;
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function firstNumber(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in row) {
      const n = nullableNum(row[key]);
      if (n !== null) return n;
    }
  }
  return null;
}

function firstString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in row) {
      const value = text(row[key]);
      if (value) return value;
    }
  }
  return null;
}

async function fetchAllRiskRankings(maxRows = 600) {
  const supabase = createSupabaseAdmin();
  const pageSize = 200;
  const result: RankingRpcRow[] = [];

  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const { data, error } = await supabase.rpc("get_risk_rankings", {
      p_limit: pageSize,
      p_offset: offset,
      p_region_code: null,
      p_category_id: null,
    });

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as RankingRpcRow[];
    result.push(...rows);

    if (rows.length < pageSize) {
      break;
    }
  }

  return result;
}

async function fetchLatestKosisPressureIndexes(regionCodes: string[], regionNames: string[]) {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("v_external_closure_region_summary")
    .select(
      "period_year, region_code, region_name, closed_total, national_share_pct, yoy_closed_delta_pct, pressure_grade, pressure_score, is_latest_year",
    )
    .eq("is_latest_year", true);

  if (error) {
    throw new Error(error.message);
  }

  const byCode = new Map<string, KosisPressureRow>();
  const byName = new Map<string, KosisPressureRow>();

  for (const row of (data ?? []) as KosisPressureRow[]) {
    const code = canonicalRegionCode(row.region_code);
    const name = canonicalRegionName(row.region_name);

    if (code) byCode.set(code, row);
    if (name) byName.set(name, row);
  }

  for (const code of regionCodes) {
    void code;
  }
  for (const name of regionNames) {
    void name;
  }

  return { byCode, byName };
}

function normalizeSmallbizMetrics(row: RankingRpcRow): NormalizedSmallbizMetrics {
  const adjustedScore = num(row.adjusted_score, 0);
  const directRiskScore = num(row.risk_score, adjustedScore);

  const rawCloseAccelRate = num(row.raw_close_accel_rate, 0);
  const rawNetDiff = num(row.raw_net_diff, 0);
  const rawCloseOpenRatio = num(row.raw_close_open_ratio, 0);
  const rawSurvivalDrop = num(row.raw_survival_drop, 0);
  const rawDensityIndex = num(row.raw_density_index, 0);

  const closeRate7d = num(row.close_rate_7d, rawCloseAccelRate);
  const closeRate30d = num(row.close_rate_30d, rawSurvivalDrop);
  const openRate7d = num(row.open_rate_7d, 0);
  const openRate30d = num(row.open_rate_30d, 0);
  const netChange7d = num(row.net_change_7d, rawNetDiff);
  const netChange30d = num(row.net_change_30d, rawNetDiff);
  const riskDelta7d = num(row.risk_delta_7d, 0);
  const riskDelta30d = num(row.risk_delta_30d, 0);

  return {
    riskScore: directRiskScore,
    closeRate7d,
    closeRate30d,
    openRate7d,
    openRate30d,
    netChange7d,
    netChange30d,
    riskDelta7d,
    riskDelta30d,
    rawCloseOpenRatio,
    rawDensityIndex,
    rawCloseAccelRate,
    rawSurvivalDrop,
  };
}

function findMatchingKosisRow(
  row: RankingRpcRow,
  indexes: Awaited<ReturnType<typeof fetchLatestKosisPressureIndexes>>,
) {
  const regionCode = canonicalRegionCode(row.region_code);
  const regionName = canonicalRegionName(row.region_name);

  if (regionCode && indexes.byCode.has(regionCode)) {
    return indexes.byCode.get(regionCode) ?? null;
  }

  if (regionName && indexes.byName.has(regionName)) {
    return indexes.byName.get(regionName) ?? null;
  }

  return null;
}

async function tryFetchNtsRows() {
  const supabase = createSupabaseAdmin();

  const attempts: Array<() => Promise<{ data: NtsSnapshotRow[] | null; error: { message: string } | null }>> = [
    async () =>
      supabase
        .from("business_health_snapshots")
        .select("*")
        .order("snapshot_date", { ascending: false })
        .limit(2000),
    async () =>
      supabase
        .from("business_health_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000),
    async () =>
      supabase
        .from("business_health_snapshots")
        .select("*")
        .limit(2000),
  ];

  for (const attempt of attempts) {
    const { data, error } = await attempt();
    if (!error) {
      return (data ?? []) as NtsSnapshotRow[];
    }
  }

  return [] as NtsSnapshotRow[];
}

function deriveNtsBusinessScore(row: NtsSnapshotRow): number | null {
  const directScore = firstNumber(row, [
    "nts_business_score",
    "business_risk_score",
    "businessRiskScore",
    "close_risk_score",
    "closeRiskScore",
    "final_risk_score",
    "finalRiskScore",
    "overall_risk_score",
    "overallRiskScore",
    "risk_score",
    "riskScore",
    "health_score",
    "healthScore",
  ]);

  if (directScore !== null) {
    return round1(clamp(directScore, 0, 100));
  }

  const marketRisk = firstNumber(row, [
    "market_risk_score",
    "marketRiskScore",
  ]);

  const businessRisk = firstNumber(row, [
    "business_risk_score",
    "businessRiskScore",
  ]);

  const structuralRisk = firstNumber(row, [
    "structural_risk_score",
    "structuralRiskScore",
    "structure_risk_score",
    "structureRiskScore",
  ]);

  const scoreCandidates = [marketRisk, businessRisk, structuralRisk].filter(
    (value): value is number => value !== null,
  );

  if (scoreCandidates.length > 0) {
    const avg =
      scoreCandidates.reduce((sum, value) => sum + value, 0) / scoreCandidates.length;
    return round1(clamp(avg, 0, 100));
  }

  const stage = String(
    firstString(row, ["stage", "snapshot_stage", "status_stage"]) || "",
  ).toLowerCase();
  const grade = String(
    firstString(row, ["grade", "risk_grade", "health_grade"]) || "",
  ).toLowerCase();

  if (stage.includes("critical")) return 80;
  if (stage.includes("caution")) return 60;
  if (stage.includes("observe")) return 35;
  if (grade.includes("critical") || grade.includes("high")) return 75;
  if (grade.includes("medium") || grade.includes("moderate")) return 55;
  if (grade.includes("low")) return 35;

  return null;
}

function buildNtsIndexes(rows: NtsSnapshotRow[]) {
  const byRegionCategoryCode = new Map<string, number>();
  const byRegionCategoryName = new Map<string, number>();
  const byRegionCode = new Map<string, number>();
  const byRegionName = new Map<string, number>();

  for (const row of rows) {
    const ntsScore = deriveNtsBusinessScore(row);
    if (ntsScore === null) continue;

    const regionCode = canonicalRegionCode(
      firstString(row, [
        "region_code",
        "regionCode",
        "area_code",
        "areaCode",
      ]),
    );
    const regionName = canonicalRegionName(
      firstString(row, [
        "region_name",
        "regionName",
        "area_name",
        "areaName",
      ]),
    );

    const categoryId = firstString(row, [
      "category_id",
      "categoryId",
      "industry_id",
      "industryId",
      "category_no",
      "industry_no",
    ]);
    const categoryName = text(
      firstString(row, [
        "category_name",
        "categoryName",
        "industry_name",
        "industryName",
      ]) || "",
    );

    if (regionCode && categoryId) {
      const key = `${regionCode}:${categoryId}`;
      const prev = byRegionCategoryCode.get(key);
      if (prev === undefined || ntsScore > prev) byRegionCategoryCode.set(key, ntsScore);
    }

    if (regionName && categoryName) {
      const key = `${regionName}:${categoryName}`;
      const prev = byRegionCategoryName.get(key);
      if (prev === undefined || ntsScore > prev) byRegionCategoryName.set(key, ntsScore);
    }

    if (regionCode) {
      const prev = byRegionCode.get(regionCode);
      if (prev === undefined || ntsScore > prev) byRegionCode.set(regionCode, ntsScore);
    }

    if (regionName) {
      const prev = byRegionName.get(regionName);
      if (prev === undefined || ntsScore > prev) byRegionName.set(regionName, ntsScore);
    }
  }

  return {
    byRegionCategoryCode,
    byRegionCategoryName,
    byRegionCode,
    byRegionName,
  };
}

async function fetchLatestNtsIndexes() {
  const rows = await tryFetchNtsRows();
  return buildNtsIndexes(rows);
}

function findMatchingNtsScore(
  row: RankingRpcRow,
  indexes: Awaited<ReturnType<typeof fetchLatestNtsIndexes>>,
) {
  const regionCode = canonicalRegionCode(row.region_code);
  const regionName = canonicalRegionName(row.region_name);
  const categoryId = String(row.category_id || "").trim();
  const categoryName = text(row.category_name);

  if (regionCode && categoryId) {
    const key = `${regionCode}:${categoryId}`;
    if (indexes.byRegionCategoryCode.has(key)) {
      return indexes.byRegionCategoryCode.get(key) ?? null;
    }
  }

  if (regionName && categoryName) {
    const key = `${regionName}:${categoryName}`;
    if (indexes.byRegionCategoryName.has(key)) {
      return indexes.byRegionCategoryName.get(key) ?? null;
    }
  }

  if (regionCode && indexes.byRegionCode.has(regionCode)) {
    return indexes.byRegionCode.get(regionCode) ?? null;
  }

  if (regionName && indexes.byRegionName.has(regionName)) {
    return indexes.byRegionName.get(regionName) ?? null;
  }

  return null;
}

function computeSmallbizLiveScore(metrics: NormalizedSmallbizMetrics) {
  const currentRiskPressure = clamp(metrics.riskScore * 0.55, 0, 55);

  const closePressure =
    clamp(metrics.rawCloseAccelRate * 18, 0, 18) +
    clamp(metrics.rawSurvivalDrop * 16, 0, 16);

  const netDeclinePressure =
    clamp(Math.max(-metrics.netChange7d, 0) * 10, 0, 12) +
    clamp(Math.max(-metrics.netChange30d, 0) * 4, 0, 8);

  const ratioPressure =
    metrics.rawCloseOpenRatio > 1
      ? clamp((metrics.rawCloseOpenRatio - 1) * 18, 0, 12)
      : 0;

  const densityPressure = clamp(metrics.rawDensityIndex * 0.25, 0, 9);

  return roundInt(
    clamp(
      currentRiskPressure +
        closePressure +
        netDeclinePressure +
        ratioPressure +
        densityPressure,
      0,
      100,
    ),
  );
}

function computeIntegratedScores(input: {
  metrics: NormalizedSmallbizMetrics;
  kosis: KosisPressureRow | null;
  ntsBusinessScore: number | null;
}) {
  const smallbizLiveScore = computeSmallbizLiveScore(input.metrics);
  const kosisPressureScore = input.kosis?.pressure_score ?? null;
  const ntsBusinessScore = input.ntsBusinessScore;

  const integratedMarketScore = roundInt(
    clamp(
      smallbizLiveScore * 0.6 + num(kosisPressureScore, 0) * 0.4,
      0,
      100,
    ),
  );

  const integratedFinalScore = roundInt(
    clamp(
      ntsBusinessScore === null
        ? integratedMarketScore
        : integratedMarketScore * 0.55 + ntsBusinessScore * 0.45,
      0,
      100,
    ),
  );

  return {
    smallbizLiveScore,
    integratedMarketScore,
    integratedFinalScore,
  };
}

function buildReasonCodes(input: {
  metrics: NormalizedSmallbizMetrics;
  kosis: KosisPressureRow | null;
  ntsBusinessScore: number | null;
  integratedMarketScore: number;
}) {
  const reasonCodes: string[] = [];

  if ((input.kosis?.pressure_score ?? 0) >= 60) {
    reasonCodes.push("external_closure_pressure_high");
  } else if ((input.kosis?.pressure_score ?? 0) >= 40) {
    reasonCodes.push("external_closure_pressure_moderate");
  }

  if (input.metrics.rawCloseAccelRate >= 0.8 || input.metrics.rawSurvivalDrop >= 0.8) {
    reasonCodes.push("live_closure_rate_rising");
  }

  if (input.metrics.netChange7d < 0 || input.metrics.netChange30d < 0) {
    reasonCodes.push("net_business_decline");
  }

  if (input.metrics.rawCloseOpenRatio > 1.1) {
    reasonCodes.push("close_open_ratio_unfavorable");
  }

  if (input.metrics.rawDensityIndex >= 20) {
    reasonCodes.push("competition_density_high");
  }

  if ((input.ntsBusinessScore ?? 0) >= 60) {
    reasonCodes.push("nts_business_weak");
  } else if ((input.ntsBusinessScore ?? 0) >= 40) {
    reasonCodes.push("nts_business_moderate");
  }

  if (input.integratedMarketScore >= 70) {
    reasonCodes.push("market_risk_high");
  }

  return Array.from(new Set(reasonCodes));
}

function buildSummaryText(input: {
  ranking: RankingRpcRow;
  metrics: NormalizedSmallbizMetrics;
  kosis: KosisPressureRow | null;
  integratedMarketScore: number;
  integratedFinalScore: number;
  ntsBusinessScore: number | null;
}) {
  const regionName = input.ranking.region_name ?? input.ranking.region_code;
  const categoryName = input.ranking.category_name ?? String(input.ranking.category_id);

  const parts: string[] = [];

  parts.push(`소상공인 위험 ${round1(input.metrics.riskScore)}`);

  if (input.kosis?.pressure_score !== null && input.kosis?.pressure_score !== undefined) {
    parts.push(`외부 폐업압력 ${pressureLabel(input.kosis.pressure_grade)} ${num(input.kosis.pressure_score, 0)}`);
  }

  if (input.metrics.rawCloseAccelRate > 0) {
    parts.push(`폐업가속 ${round1(input.metrics.rawCloseAccelRate)}`);
  }

  if (input.metrics.netChange7d < 0) {
    parts.push(`순증감 ${round1(input.metrics.netChange7d)}`);
  }

  if (input.metrics.rawCloseOpenRatio > 0) {
    parts.push(`폐업/개업비 ${round1(input.metrics.rawCloseOpenRatio)}`);
  }

  if (input.ntsBusinessScore !== null) {
    parts.push(`NTS ${round1(input.ntsBusinessScore)}`);
  }

  return `${regionName} · ${categoryName} 통합위험 ${input.integratedFinalScore}. ${parts.join(" / ")}`;
}

export async function buildIntegratedRegionCategoryBaselines() {
  const rankings = await fetchAllRiskRankings(600);

  const filteredRankings = rankings.filter((row) => {
    const regionName = canonicalRegionName(row.region_name);
    return (
      String(row.region_code || "").trim() &&
      Number.isFinite(Number(row.category_id)) &&
      regionName !== "전국"
    );
  });

  const [kosisIndexes, ntsIndexes] = await Promise.all([
    fetchLatestKosisPressureIndexes(
      filteredRankings.map((row) => row.region_code),
      filteredRankings.map((row) => row.region_name ?? ""),
    ),
    fetchLatestNtsIndexes(),
  ]);

  const rows: IntegratedBaselineRow[] = filteredRankings.map((row) => {
    const metrics = normalizeSmallbizMetrics(row);
    const kosis = findMatchingKosisRow(row, kosisIndexes);
    const ntsBusinessScore = findMatchingNtsScore(row, ntsIndexes);

    const scores = computeIntegratedScores({
      metrics,
      kosis,
      ntsBusinessScore,
    });

    const reasonCodes = buildReasonCodes({
      metrics,
      kosis,
      ntsBusinessScore,
      integratedMarketScore: scores.integratedMarketScore,
    });

    const summaryText = buildSummaryText({
      ranking: row,
      metrics,
      kosis,
      integratedMarketScore: scores.integratedMarketScore,
      integratedFinalScore: scores.integratedFinalScore,
      ntsBusinessScore,
    });

    return {
      snapshot_date: safeDateString(String(row.score_date || "")),
      region_code: String(row.region_code || "").trim(),
      region_name: row.region_name ?? null,
      category_id: Number(row.category_id),
      category_name: row.category_name ?? null,

      smallbiz_risk_score: round1(metrics.riskScore),
      smallbiz_close_rate_7d: round1(metrics.closeRate7d),
      smallbiz_close_rate_30d: round1(metrics.closeRate30d),
      smallbiz_open_rate_7d: round1(metrics.openRate7d),
      smallbiz_open_rate_30d: round1(metrics.openRate30d),
      smallbiz_net_change_7d: round1(metrics.netChange7d),
      smallbiz_net_change_30d: round1(metrics.netChange30d),
      smallbiz_risk_delta_7d: round1(metrics.riskDelta7d),
      smallbiz_risk_delta_30d: round1(metrics.riskDelta30d),

      kosis_pressure_score: kosis?.pressure_score ?? null,
      kosis_pressure_grade: kosis?.pressure_grade ?? null,
      kosis_closed_total: nullableNum(kosis?.closed_total),
      kosis_national_share_pct: nullableNum(kosis?.national_share_pct),
      kosis_yoy_closed_delta_pct: nullableNum(kosis?.yoy_closed_delta_pct),

      nts_business_score: ntsBusinessScore,

      integrated_market_score: scores.integratedMarketScore,
      integrated_final_score: scores.integratedFinalScore,

      summary_text: summaryText,
      reason_codes: reasonCodes,
      raw_payload: {
        ranking: row,
        normalized_smallbiz_metrics: metrics,
        kosis,
        nts_business_score: ntsBusinessScore,
      },
    };
  });

  return rows;
}

export async function upsertIntegratedRegionCategoryBaselines(
  rows: IntegratedBaselineRow[],
) {
  if (rows.length === 0) {
    return {
      processed: 0,
    };
  }

  const supabase = createSupabaseAdmin();
  let processed = 0;
  const chunkSize = 300;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const batch = rows.slice(i, i + chunkSize);

    const { error } = await supabase
      .from("integrated_region_category_baselines")
      .upsert(batch, {
        onConflict: "snapshot_date,region_code,category_id",
        ignoreDuplicates: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    processed += batch.length;
  }

  return {
    processed,
  };
}