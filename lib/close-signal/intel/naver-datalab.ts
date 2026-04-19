type TrendPointLike = {
  period?: string | null;
  ratio?: number | string | null;
};

export type TrendDirection = "up" | "down" | "flat";

export type TrendSlopeAnalysis = {
  points: number;
  baselineRatio: number | null;
  latestRatio: number | null;
  deltaPct: number | null;
  direction: TrendDirection;
};

export type SearchTrendKeywordInput = {
  groupName?: string | null;
  keywords?: string[] | null;
  startDate?: string | null;
  endDate?: string | null;
  timeUnit?: "date" | "week" | "month";
  device?: "pc" | "mo" | null;
  ages?: string[] | null;
  gender?: "m" | "f" | null;
};

export type SearchTrendKeywordGroup = {
  groupName: string;
  keywords: string[];
};

export type SearchTrendApiResult = {
  title?: string;
  keywords?: string[];
  data?: Array<{
    period?: string;
    ratio?: number | string | null;
  }>;
};

export type SearchTrendApiResponse = {
  startDate?: string;
  endDate?: string;
  timeUnit?: string;
  results?: SearchTrendApiResult[];
  [key: string]: unknown;
};

function text(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysAgoDateString(days: number) {
  return dateString(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

export function sanitizeTrendKeywords(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return Array.from(
    new Set(
      input
        .map((value) => text(value))
        .filter((value): value is string => Boolean(value)),
    ),
  ).slice(0, 5);
}

export function buildKeywordGroups(
  groupName: string | null,
  keywords: string[],
): SearchTrendKeywordGroup[] {
  return keywords.map((keyword, index) => ({
    groupName: index === 0 && groupName ? `${groupName} / ${keyword}` : keyword,
    keywords: [keyword],
  }));
}

export function directionFromDelta(deltaPct: number | null): TrendDirection {
  if (deltaPct == null) return "flat";
  if (deltaPct >= 5) return "up";
  if (deltaPct <= -10) return "down";
  return "flat";
}

export function analyzeTrendSlope(points: TrendPointLike[]): TrendSlopeAnalysis {
  const rows = (points ?? [])
    .map((point) => ({
      period: text(point?.period),
      ratio: num(point?.ratio),
    }))
    .filter(
      (point): point is { period: string | null; ratio: number } =>
        typeof point.ratio === "number" && Number.isFinite(point.ratio),
    );

  if (rows.length === 0) {
    return {
      points: 0,
      baselineRatio: null,
      latestRatio: null,
      deltaPct: null,
      direction: "flat",
    };
  }

  const windowSize = Math.max(1, Math.min(4, Math.floor(rows.length / 3) || 1));
  const baselineRatio = round1(
    average(rows.slice(0, windowSize).map((row) => row.ratio)),
  );
  const latestRatio = round1(
    average(rows.slice(-windowSize).map((row) => row.ratio)),
  );

  let deltaPct: number | null = null;

  if (baselineRatio > 0) {
    deltaPct = round1(((latestRatio - baselineRatio) / baselineRatio) * 100);
  } else if (latestRatio > 0) {
    deltaPct = 100;
  } else {
    deltaPct = 0;
  }

  return {
    points: rows.length,
    baselineRatio,
    latestRatio,
    deltaPct,
    direction: directionFromDelta(deltaPct),
  };
}

export function reliabilityFromPoints(points: number): "high" | "medium" | "low" {
  if (points >= 10) return "high";
  if (points >= 5) return "medium";
  return "low";
}

export async function fetchNaverDatalabTrend(
  input: SearchTrendKeywordInput,
): Promise<{
  ok: boolean;
  request: {
    startDate: string;
    endDate: string;
    timeUnit: "date" | "week" | "month";
    keywordGroups: SearchTrendKeywordGroup[];
    device?: "pc" | "mo";
    ages?: string[];
    gender?: "m" | "f";
  };
  response: SearchTrendApiResponse | null;
  status?: number;
  error?: string;
}> {
  const clientId =
    process.env.NAVER_DATALAB_CLIENT_ID || process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret =
    process.env.NAVER_DATALAB_CLIENT_SECRET || process.env.NAVER_SEARCH_CLIENT_SECRET;

  const keywords = sanitizeTrendKeywords(input.keywords ?? []);
  const groupName = text(input.groupName) ?? keywords[0] ?? "keyword";

  const requestPayload = {
    startDate: text(input.startDate) ?? daysAgoDateString(84),
    endDate: text(input.endDate) ?? dateString(new Date()),
    timeUnit: input.timeUnit ?? "week",
    keywordGroups: buildKeywordGroups(groupName, keywords),
    ...(input.device ? { device: input.device } : {}),
    ...(input.ages && input.ages.length > 0 ? { ages: input.ages } : {}),
    ...(input.gender ? { gender: input.gender } : {}),
  };

  if (!clientId || !clientSecret) {
    return {
      ok: false,
      request: requestPayload,
      response: null,
      error:
        "NAVER_DATALAB_CLIENT_ID / NAVER_DATALAB_CLIENT_SECRET 또는 NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET 이 설정되지 않았습니다.",
    };
  }

  if (requestPayload.keywordGroups.length === 0) {
    return {
      ok: false,
      request: requestPayload,
      response: null,
      error: "keywords are required.",
    };
  }

  try {
    const response = await fetch("https://openapi.naver.com/v1/datalab/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      body: JSON.stringify(requestPayload),
      cache: "no-store",
    });

    const rawText = await response.text();

    let parsed: SearchTrendApiResponse | null = null;
    try {
      parsed = rawText ? (JSON.parse(rawText) as SearchTrendApiResponse) : null;
    } catch {
      parsed = rawText ? ({ rawText } as SearchTrendApiResponse) : null;
    }

    if (!response.ok) {
      return {
        ok: false,
        request: requestPayload,
        response: parsed,
        status: response.status,
        error: "네이버 데이터랩 검색어 트렌드 조회에 실패했습니다.",
      };
    }

    return {
      ok: true,
      request: requestPayload,
      response: parsed,
      status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      request: requestPayload,
      response: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}