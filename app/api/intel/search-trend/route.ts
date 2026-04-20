import { NextRequest, NextResponse } from "next/server";
import { buildSearchTrendResult } from "@/lib/close-signal/intel-kosis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TrendRequestBody = {
  groupName?: unknown;
  keywords?: unknown;
  query?: unknown;
  businessName?: unknown;
  regionName?: unknown;
  categoryName?: unknown;
  address?: unknown;
};

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function text(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(values.map((value) => text(value)).filter((value): value is string => Boolean(value))),
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = ((await req.json().catch(() => ({}))) ?? {}) as TrendRequestBody;

    const groupName =
      text(body.groupName, body.businessName, body.categoryName, body.query) || "monitor";

    const keywords = uniqueStrings([
      ...asArray(body.keywords),
      text(body.query),
      text(body.businessName),
      text(body.categoryName),
      [text(body.regionName), text(body.categoryName)].filter(Boolean).join(" "),
    ]);

    if (keywords.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "keywords가 필요합니다.",
        },
        { status: 400 },
      );
    }

    const analysis = await buildSearchTrendResult({
      groupName,
      query: text(body.query),
      businessName: text(body.businessName),
      regionName: text(body.regionName),
      categoryName: text(body.categoryName),
      address: text(body.address),
      keywords,
    });

    const groups = analysis.groups.map((row) => ({
      keyword: row.keyword,
      latestRatio: row.latestRatio,
      baselineRatio: row.baselineRatio,
      deltaPct: row.deltaPct,
      riskDeltaPct: row.riskDeltaPct,
      weight: row.weight,
      signal: row.signal,
    }));

    return NextResponse.json({
      ok: true,
      groupName: analysis.groupName,
      keywords: analysis.keywords,
      trendDeltaPct: analysis.trendDeltaPct,
      latestRatio: analysis.latestRatio,
      baselineRatio: analysis.baselineRatio,
      groups,
      axes: analysis.axes,
      analysis: {
        deltaPct: analysis.trendDeltaPct,
        latestRatio: analysis.latestRatio,
        baselineRatio: analysis.baselineRatio,
        dominantSignal: analysis.dominantSignal,
        perKeywordGroups: groups,
        axes: analysis.axes,
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