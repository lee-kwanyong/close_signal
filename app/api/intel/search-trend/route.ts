import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type UnknownRecord = Record<string, unknown>;

type TrendRequestBody = {
  groupName?: unknown;
  keywords?: unknown;
};

type KeywordTrendRow = {
  keyword: string;
  latestRatio: number;
  baselineRatio: number;
  deltaPct: number;
  weight: number;
  signal: "up" | "flat" | "down";
};

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function text(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function num(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function uniqueStrings(values: unknown[]) {
  const seen = new Set<string>();

  for (const value of values) {
    const s = text(value);
    if (s) seen.add(s);
  }

  return [...seen];
}

function keywordWeight(keyword: string, groupName: string) {
  const nk = normalizeText(keyword);
  const ng = normalizeText(groupName);

  if (!nk) return 1;
  if (ng && nk === ng) return 1.35;
  if (ng && (nk.includes(ng) || ng.includes(nk))) return 1.2;
  if (keyword.length <= 2) return 0.9;
  if (keyword.length >= 8) return 1.1;
  return 1;
}

function estimateTrendRow(keyword: string, groupName: string): KeywordTrendRow {
  const normalized = normalizeText(keyword);
  const weight = keywordWeight(keyword, groupName);

  let baselineRatio = 55;
  let latestRatio = 55;

  if (!normalized) {
    baselineRatio = 50;
    latestRatio = 50;
  } else {
    const seed =
      normalized.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 17;

    baselineRatio = clamp(48 + seed * 1.7, 20, 95);
    latestRatio = baselineRatio;

    const declineTokens = [
      "폐업",
      "휴업",
      "정리",
      "매각",
      "철수",
      "감소",
      "하락",
    ];

    const growthTokens = [
      "오픈",
      "신규",
      "확장",
      "인기",
      "추천",
      "행사",
      "이벤트",
    ];

    if (declineTokens.some((token) => normalized.includes(token))) {
      latestRatio = baselineRatio * 0.76;
    } else if (growthTokens.some((token) => normalized.includes(token))) {
      latestRatio = baselineRatio * 1.08;
    } else if (groupName && normalizeText(groupName) === normalized) {
      latestRatio = baselineRatio * 0.97;
    } else if (groupName && normalizeText(groupName).includes(normalized)) {
      latestRatio = baselineRatio * 0.99;
    } else {
      latestRatio = baselineRatio * 0.95;
    }
  }

  baselineRatio = round1(clamp(baselineRatio, 0, 100));
  latestRatio = round1(clamp(latestRatio, 0, 100));

  const rawDelta =
    baselineRatio <= 0 ? 0 : ((latestRatio - baselineRatio) / baselineRatio) * 100;

  const deltaPct = round1(rawDelta * weight);

  return {
    keyword,
    latestRatio,
    baselineRatio,
    deltaPct,
    weight: round1(weight),
    signal: deltaPct <= -8 ? "down" : deltaPct >= 8 ? "up" : "flat",
  };
}

function buildTrendAnalysis(groupName: string, keywords: string[]) {
  const rows = keywords.map((keyword) => estimateTrendRow(keyword, groupName));

  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0) || 1;

  const weightedDelta =
    rows.reduce((sum, row) => sum + row.deltaPct * row.weight, 0) / totalWeight;

  const weightedLatest =
    rows.reduce((sum, row) => sum + row.latestRatio * row.weight, 0) / totalWeight;

  const weightedBaseline =
    rows.reduce((sum, row) => sum + row.baselineRatio * row.weight, 0) / totalWeight;

  const dominantSignal =
    weightedDelta <= -8 ? "down" : weightedDelta >= 8 ? "up" : "flat";

  return {
    trendDeltaPct: round1(weightedDelta),
    latestRatio: round1(weightedLatest),
    baselineRatio: round1(weightedBaseline),
    dominantSignal,
    perKeywordGroups: rows,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = ((await req.json().catch(() => ({}))) ?? {}) as TrendRequestBody;

    const groupName = text(body.groupName) ?? "monitor";
    const keywords = uniqueStrings(asArray(body.keywords)).filter(Boolean);

    if (keywords.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "keywords가 필요합니다.",
        },
        { status: 400 },
      );
    }

    const analysis = buildTrendAnalysis(groupName, keywords);

    const groups = analysis.perKeywordGroups.map((row) => ({
      keyword: row.keyword,
      latestRatio: row.latestRatio,
      baselineRatio: row.baselineRatio,
      deltaPct: row.deltaPct,
      weight: row.weight,
      signal: row.signal,
    }));

    return NextResponse.json({
      ok: true,
      groupName,
      keywords,
      trendDeltaPct: analysis.trendDeltaPct,
      latestRatio: analysis.latestRatio,
      baselineRatio: analysis.baselineRatio,
      groups,
      analysis: {
        deltaPct: analysis.trendDeltaPct,
        latestRatio: analysis.latestRatio,
        baselineRatio: analysis.baselineRatio,
        dominantSignal: analysis.dominantSignal,
        perKeywordGroups: groups,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "search-trend 처리 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}