type UnknownRecord = Record<string, unknown>;

export type TrendSignal = "up" | "flat" | "down";
export type RiskGrade = "low" | "moderate" | "high";
export type KosisBadWhen = "up" | "down";

export type AxisKey =
  | "population"
  | "labor"
  | "price"
  | "consumption"
  | "business"
  | "housing"
  | "income_reference"
  | "macro_reference";

export type TrendKeywordRow = {
  keyword: string;
  latestRatio: number;
  baselineRatio: number;
  deltaPct: number;
  riskDeltaPct: number;
  weight: number;
  signal: TrendSignal;
};

export type SeriesPoint = {
  period: string;
  value: number;
  raw: UnknownRecord;
};

export type SeriesAnalysis = {
  key: string;
  label: string;
  source: "kosis_live";
  weight: number;
  badWhen: KosisBadWhen;
  latestValue: number;
  baselineValue: number;
  deltaPct: number;
  riskDeltaPct: number;
  signal: TrendSignal;
  pointCount: number;
  points: SeriesPoint[];
  summary: string;
};

export type KosisSeriesConfig = {
  key: string;
  label: string;
  weight?: number;
  enabled?: boolean;
  badWhen?: KosisBadWhen;
  latestCount?: number;
  jsonPath?: string;
  valueKeys?: string[];
  periodKeys?: string[];
  url?: string;
  params?: Record<string, string | number | boolean | null | undefined>;
};

export type KosisAxisConfig = {
  key: AxisKey;
  label: string;
  weight: number;
  direct: boolean;
  badWhen: KosisBadWhen;
  keywords: string[];
  series?: KosisSeriesConfig[];
};

export type AxisAnalysis = {
  key: AxisKey;
  label: string;
  direct: boolean;
  weight: number;
  source: "heuristic" | "kosis_live" | "mixed";
  score: number;
  latestRatio: number | null;
  baselineRatio: number | null;
  deltaPct: number;
  riskDeltaPct: number;
  signal: TrendSignal;
  keywords: TrendKeywordRow[];
  series: SeriesAnalysis[];
  summary: string;
};

export type CombinedIntelInput = {
  groupName?: string | null;
  query?: string | null;
  businessName?: string | null;
  regionName?: string | null;
  categoryName?: string | null;
  address?: string | null;
  keywords?: string[];
};

export type SearchTrendResult = {
  groupName: string;
  keywords: string[];
  trendDeltaPct: number;
  latestRatio: number;
  baselineRatio: number;
  dominantSignal: TrendSignal;
  groups: TrendKeywordRow[];
  axes: AxisAnalysis[];
};

export type CombinedIntelResult = {
  groupName: string;
  query: string | null;
  businessName: string | null;
  regionName: string | null;
  categoryName: string | null;
  address: string | null;
  marketRiskScore: number;
  businessRiskScore: number;
  recoverabilityScore: number;
  closingRiskScore: number;
  summary: string;
  grade: RiskGrade;
  combined: {
    summary: string;
    grade: RiskGrade;
    marketRiskScore: number;
    businessRiskScore: number;
    recoverabilityScore: number;
    closingRiskScore: number;
  };
  market: {
    score: number;
    risk_score: number;
    summary: string;
    axes: AxisAnalysis[];
    referenceAxes: AxisAnalysis[];
  };
  business: {
    score: number;
    risk_score: number;
    summary: string;
  };
  structure: {
    score: number;
    recoverability_score: number;
    rescue_chance_score: number;
    summary: string;
  };
  closing: {
    score: number;
    risk_score: number;
    grade: RiskGrade;
    summary: string;
  };
  reasons: string[];
  reasonLabels: string[];
  actions: string[];
  axes: AxisAnalysis[];
};

const DEFAULT_KOSIS_API_BASE =
  process.env.CLOSE_SIGNAL_KOSIS_API_BASE_URL ||
  "https://kosis.kr/openapi/statisticsData.do";

const DEFAULT_TIMEOUT_MS = Number(
  process.env.CLOSE_SIGNAL_KOSIS_TIMEOUT_MS || "15000",
);

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

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

function num(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value.replace(/,/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => value != null);
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function weightedAverage(
  items: Array<{ value: number | null | undefined; weight?: number | null }>,
) {
  const valid = items.filter(
    (item): item is { value: number; weight?: number | null } =>
      item.value != null && Number.isFinite(item.value),
  );

  if (valid.length === 0) return null;

  const totalWeight =
    valid.reduce((sum, item) => sum + Math.max(0.0001, Number(item.weight ?? 1)), 0) || 1;

  const weighted =
    valid.reduce(
      (sum, item) => sum + item.value * Math.max(0.0001, Number(item.weight ?? 1)),
      0,
    ) / totalWeight;

  return weighted;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(values.map((value) => text(value)).filter((value): value is string => Boolean(value))),
  );
}

function sortPeriodValue(value: string) {
  const compact = value.replace(/[^\d]/g, "");
  return compact || value;
}

function parseEnvJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw?.trim()) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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

function estimateTrendRow(
  keyword: string,
  groupName: string,
  badWhen: KosisBadWhen,
): TrendKeywordRow {
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
      "둔화",
      "축소",
      "공실",
      "빈집",
    ];

    const growthTokens = [
      "오픈",
      "신규",
      "확장",
      "인기",
      "추천",
      "행사",
      "이벤트",
      "증가",
      "상승",
      "개선",
      "회복",
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

  const riskDeltaPct = round1((badWhen === "up" ? rawDelta : -rawDelta) * weight);

  return {
    keyword,
    latestRatio,
    baselineRatio,
    deltaPct: round1(rawDelta),
    riskDeltaPct,
    weight: round1(weight),
    signal: rawDelta <= -8 ? "down" : rawDelta >= 8 ? "up" : "flat",
  };
}

function scoreFromRiskDelta(riskDeltaPct: number) {
  return round1(clamp(50 + riskDeltaPct * 2.1, 0, 100));
}

function buildGrade(score: number): RiskGrade {
  if (score >= 67) return "high";
  if (score >= 34) return "moderate";
  return "low";
}

function getByPath(root: unknown, path?: string) {
  if (!path?.trim()) return root;

  const segments = path
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);

  let current: unknown = root;

  for (const segment of segments) {
    if (current == null) return null;

    if (Array.isArray(current)) {
      const index = Number(segment);
      current =
        Number.isFinite(index) && index >= 0 && index < current.length
          ? current[index]
          : null;
      continue;
    }

    if (typeof current === "object") {
      current = (current as UnknownRecord)[segment];
      continue;
    }

    return null;
  }

  return current;
}

function extractRowsFromPayload(payload: unknown, jsonPath?: string) {
  const direct = getByPath(payload, jsonPath);

  if (Array.isArray(direct)) {
    return direct.map((item) => asRecord(item));
  }

  const root = asRecord(payload);

  const candidates = [
    root.data,
    root.result,
    root.rows,
    root.list,
    root.DATA,
    root.TblData,
    root.dataList,
    root.resultData,
    asRecord(root.data).list,
    asRecord(root.result).list,
    asRecord(root.result).data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map((item) => asRecord(item));
    }
  }

  return [] as UnknownRecord[];
}

function extractSeriesPoints(payload: unknown, series: KosisSeriesConfig): SeriesPoint[] {
  const rows = extractRowsFromPayload(payload, series.jsonPath);

  const valueKeys = series.valueKeys?.length
    ? series.valueKeys
    : ["DT", "dt", "value", "VAL", "DATA_VALUE"];

  const periodKeys = series.periodKeys?.length
    ? series.periodKeys
    : ["PRD_DE", "prdDe", "period", "date", "TIME", "baseDate"];

  const points = rows
    .map((row, index) => {
      const value = num(...valueKeys.map((key) => row[key]));
      const period =
        text(...periodKeys.map((key) => row[key])) ||
        text(row.id, row.key) ||
        `row-${index + 1}`;

      if (value == null || !period) return null;

      return {
        period,
        value,
        raw: row,
      } satisfies SeriesPoint;
    })
    .filter((item): item is SeriesPoint => Boolean(item));

  points.sort((a, b) =>
    sortPeriodValue(a.period).localeCompare(sortPeriodValue(b.period), "ko"),
  );

  return points;
}

function expandTemplate(template: string, input: CombinedIntelInput) {
  const now = new Date();
  const yyyy = `${now.getFullYear()}`;
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyymm = `${yyyy}${mm}`;

  const vars: Record<string, string> = {
    API_KEY: process.env.KOSIS_API_KEY || process.env.CLOSE_SIGNAL_KOSIS_API_KEY || "",
    GROUP_NAME: text(input.groupName) || "",
    QUERY: text(input.query) || "",
    BUSINESS_NAME: text(input.businessName) || "",
    REGION_NAME: text(input.regionName) || "",
    REGION: text(input.regionName) || "",
    CATEGORY_NAME: text(input.categoryName) || "",
    CATEGORY: text(input.categoryName) || "",
    ADDRESS: text(input.address) || "",
    YYYY: yyyy,
    MM: mm,
    YYYYMM: yyyymm,
  };

  return template.replace(/\{([A-Z0-9_]+)\}/gi, (_, key: string) => vars[key] ?? "");
}

function buildSeriesUrl(series: KosisSeriesConfig, input: CombinedIntelInput) {
  if (series.url?.trim()) {
    return expandTemplate(series.url, input);
  }

  const url = new URL(DEFAULT_KOSIS_API_BASE);
  url.searchParams.set("method", "getList");
  url.searchParams.set("format", "json");
  url.searchParams.set("jsonVD", "Y");

  const apiKey =
    process.env.KOSIS_API_KEY || process.env.CLOSE_SIGNAL_KOSIS_API_KEY || "";

  if (apiKey) {
    url.searchParams.set("apiKey", apiKey);
  }

  Object.entries(series.params ?? {}).forEach(([key, rawValue]) => {
    if (rawValue === null || rawValue === undefined || rawValue === "") return;
    url.searchParams.set(key, expandTemplate(String(rawValue), input));
  });

  return url.toString();
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "close-signal/1.0",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json().catch(() => null)) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSeriesAnalysis(
  series: KosisSeriesConfig,
  axisBadWhen: KosisBadWhen,
  input: CombinedIntelInput,
): Promise<SeriesAnalysis | null> {
  if (series.enabled === false) return null;

  const url = buildSeriesUrl(series, input);

  if (!url) return null;
  if (url.includes("{API_KEY}") && !(process.env.KOSIS_API_KEY || process.env.CLOSE_SIGNAL_KOSIS_API_KEY)) {
    return null;
  }

  const payload = await fetchJson(url);
  if (!payload) return null;

  const points = extractSeriesPoints(payload, series);
  if (points.length < 2) return null;

  const latestCount = Math.max(1, Number(series.latestCount || 1));
  const safeLatestCount = Math.min(latestCount, points.length);
  const latestPoints = points.slice(points.length - safeLatestCount);
  const baselinePoints = points.slice(0, Math.max(1, points.length - safeLatestCount));

  const latestValue = average(latestPoints.map((point) => point.value)) ?? latestPoints[latestPoints.length - 1].value;
  const baselineValue =
    average(baselinePoints.map((point) => point.value)) ?? points[0].value;

  const deltaPct =
    baselineValue === 0 ? 0 : ((latestValue - baselineValue) / baselineValue) * 100;

  const badWhen = series.badWhen ?? axisBadWhen;
  const riskDeltaPct = badWhen === "up" ? deltaPct : -deltaPct;

  return {
    key: series.key,
    label: series.label,
    source: "kosis_live",
    weight: Number(series.weight ?? 1),
    badWhen,
    latestValue: round1(latestValue),
    baselineValue: round1(baselineValue),
    deltaPct: round1(deltaPct),
    riskDeltaPct: round1(riskDeltaPct),
    signal: deltaPct <= -8 ? "down" : deltaPct >= 8 ? "up" : "flat",
    pointCount: points.length,
    points,
    summary: `${series.label} 기준 ${round1(latestValue)} / 이전평균 ${round1(
      baselineValue,
    )} / 변화 ${round1(deltaPct)}%`,
  };
}

function deriveRegionHint(input: CombinedIntelInput) {
  const regionName = text(input.regionName);
  if (regionName) return regionName;

  const address = text(input.address);
  if (!address) return "전국";

  const parts = address.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).join(" ") || parts[0] || "전국";
}

function deriveCategoryHint(input: CombinedIntelInput) {
  return text(input.categoryName) || text(input.groupName) || "업종";
}

function deriveGroupName(input: CombinedIntelInput) {
  return (
    text(input.groupName) ||
    text(input.businessName) ||
    text(input.categoryName) ||
    text(input.query) ||
    "monitor"
  );
}

function buildDefaultAxisConfigs(input: CombinedIntelInput): KosisAxisConfig[] {
  const region = deriveRegionHint(input);
  const category = deriveCategoryHint(input);

  return [
    {
      key: "population",
      label: "인구·배후수요",
      weight: 22,
      direct: true,
      badWhen: "down",
      keywords: uniqueStrings([
        `${region} 주민등록인구`,
        `${region} 전입`,
        `${region} 순이동`,
        `${region} 가구수`,
        `${region} 청년인구`,
      ]),
    },
    {
      key: "labor",
      label: "고용·구매여력",
      weight: 18,
      direct: true,
      badWhen: "down",
      keywords: uniqueStrings([
        `${region} 취업자`,
        `${region} 고용률`,
        `${region} 경제활동참가율`,
        `${region} 청년고용`,
      ]),
    },
    {
      key: "price",
      label: "물가·마진압박",
      weight: 15,
      direct: true,
      badWhen: "up",
      keywords: uniqueStrings([
        `${region} 소비자물가`,
        `${region} 생활물가`,
        `${region} 신선식품물가`,
      ]),
    },
    {
      key: "consumption",
      label: "소비·서비스 체감경기",
      weight: 15,
      direct: true,
      badWhen: "down",
      keywords: uniqueStrings([
        `${region} 소매판매`,
        `${region} 서비스업생산`,
        `${region} ${category} 소비`,
        `${region} ${category} 유동`,
      ]),
    },
    {
      key: "business",
      label: "사업체·경쟁 구조",
      weight: 20,
      direct: true,
      badWhen: "down",
      keywords: uniqueStrings([
        `${region} ${category} 사업체수`,
        `${region} ${category} 종사자수`,
        `${region} ${category} 창업`,
        `${region} ${category} 경쟁`,
      ]),
    },
    {
      key: "housing",
      label: "주거·지역쇠퇴",
      weight: 10,
      direct: true,
      badWhen: "down",
      keywords: uniqueStrings([
        `${region} 주택보급률`,
        `${region} 건축허가`,
        `${region} 전세가격`,
        `${region} 거래량`,
      ]),
    },
    {
      key: "income_reference",
      label: "소득·가계 보정",
      weight: 8,
      direct: false,
      badWhen: "down",
      keywords: uniqueStrings([
        `${region} 가구소득`,
        `${region} 처분가능소득`,
        `${region} 예금`,
        `${region} 대출`,
      ]),
    },
    {
      key: "macro_reference",
      label: "거시 보정",
      weight: 6,
      direct: false,
      badWhen: "down",
      keywords: uniqueStrings([
        `${region} GRDP`,
        `${region} 생산지수`,
        `${region} 수출`,
        `${region} 경제성장률`,
      ]),
    },
  ];
}

function mergeAxisConfigs(
  defaults: KosisAxisConfig[],
  overrides: Partial<KosisAxisConfig>[],
) {
  const byKey = new Map(overrides.map((item) => [item.key, item]));
  const merged = defaults.map((item) => {
    const override = byKey.get(item.key);
    if (!override) return item;

    return {
      ...item,
      ...override,
      keywords:
        override.keywords && override.keywords.length > 0
          ? uniqueStrings([...item.keywords, ...override.keywords])
          : item.keywords,
      series:
        override.series && override.series.length > 0
          ? override.series
          : item.series,
    } satisfies KosisAxisConfig;
  });

  const extra = overrides
    .filter((item) => item.key && !defaults.some((base) => base.key === item.key))
    .map((item) => ({
      key: item.key!,
      label: item.label || String(item.key),
      weight: Number(item.weight ?? 1),
      direct: Boolean(item.direct),
      badWhen: item.badWhen || "up",
      keywords: uniqueStrings(item.keywords ?? []),
      series: item.series ?? [],
    })) as KosisAxisConfig[];

  return [...merged, ...extra];
}

function loadAxisConfigs(input: CombinedIntelInput) {
  const defaults = buildDefaultAxisConfigs(input);

  const raw = parseEnvJson<Partial<KosisAxisConfig>[] | { axes?: Partial<KosisAxisConfig>[] }>(
    process.env.CLOSE_SIGNAL_KOSIS_AXES_JSON,
    [],
  );

  const overrides = Array.isArray(raw) ? raw : raw.axes ?? [];
  return mergeAxisConfigs(defaults, overrides);
}

async function analyzeAxis(
  axis: KosisAxisConfig,
  input: CombinedIntelInput,
  groupName: string,
): Promise<AxisAnalysis> {
  const keywordRows = uniqueStrings(axis.keywords).map((keyword) =>
    estimateTrendRow(keyword, groupName, axis.badWhen),
  );

  const seriesResults = await Promise.all(
    asArray(axis.series).map((series) => fetchSeriesAnalysis(series, axis.badWhen, input)),
  );

  const validSeries = seriesResults.filter(
    (item): item is SeriesAnalysis => Boolean(item),
  );

  const fallbackLatest =
    weightedAverage(
      keywordRows.map((row) => ({
        value: row.latestRatio,
        weight: row.weight,
      })),
    ) ?? 50;

  const fallbackBaseline =
    weightedAverage(
      keywordRows.map((row) => ({
        value: row.baselineRatio,
        weight: row.weight,
      })),
    ) ?? 50;

  const fallbackDelta =
    weightedAverage(
      keywordRows.map((row) => ({
        value: row.deltaPct,
        weight: row.weight,
      })),
    ) ?? 0;

  const fallbackRiskDelta =
    weightedAverage(
      keywordRows.map((row) => ({
        value: row.riskDeltaPct,
        weight: row.weight,
      })),
    ) ?? 0;

  const liveLatest =
    weightedAverage(
      validSeries.map((row) => ({
        value: row.latestValue,
        weight: row.weight,
      })),
    ) ?? null;

  const liveBaseline =
    weightedAverage(
      validSeries.map((row) => ({
        value: row.baselineValue,
        weight: row.weight,
      })),
    ) ?? null;

  const liveDelta =
    weightedAverage(
      validSeries.map((row) => ({
        value: row.deltaPct,
        weight: row.weight,
      })),
    ) ?? null;

  const liveRiskDelta =
    weightedAverage(
      validSeries.map((row) => ({
        value: row.riskDeltaPct,
        weight: row.weight,
      })),
    ) ?? null;

  const useLive = validSeries.length > 0;

  const latestRatio = round1(useLive ? liveLatest ?? fallbackLatest : fallbackLatest);
  const baselineRatio = round1(useLive ? liveBaseline ?? fallbackBaseline : fallbackBaseline);
  const deltaPct = round1(useLive ? liveDelta ?? fallbackDelta : fallbackDelta);
  const riskDeltaPct = round1(useLive ? liveRiskDelta ?? fallbackRiskDelta : fallbackRiskDelta);
  const score = scoreFromRiskDelta(riskDeltaPct);

  const signal =
    deltaPct <= -8 ? "down" : deltaPct >= 8 ? "up" : "flat";

  const source: AxisAnalysis["source"] =
    validSeries.length === 0
      ? "heuristic"
      : keywordRows.length > 0
        ? "mixed"
        : "kosis_live";

  const summary = useLive
    ? `${axis.label} ${round1(score)}점 · 실데이터 기준 변화 ${round1(deltaPct)}%`
    : `${axis.label} ${round1(score)}점 · 키워드 추정 변화 ${round1(deltaPct)}%`;

  return {
    key: axis.key,
    label: axis.label,
    direct: axis.direct,
    weight: axis.weight,
    source,
    score,
    latestRatio,
    baselineRatio,
    deltaPct,
    riskDeltaPct,
    signal,
    keywords: keywordRows,
    series: validSeries,
    summary,
  };
}

function inferBusinessStress(input: CombinedIntelInput, marketRiskScore: number) {
  const normalized = normalizeText(
    [input.query, input.businessName, input.categoryName, input.address]
      .filter(Boolean)
      .join(" "),
  );

  let score = 32;

  if (!text(input.businessName)) score += 4;
  if (!text(input.address)) score += 4;

  if (
    ["폐업", "휴업", "정리", "매각", "철수", "적자", "하락", "감소"].some((token) =>
      normalized.includes(token),
    )
  ) {
    score += 18;
  }

  if (
    ["리뷰감소", "방문감소", "유동감소", "매출하락", "검색하락", "노출하락"].some((token) =>
      normalized.includes(token),
    )
  ) {
    score += 14;
  }

  score += Math.max(0, (marketRiskScore - 50) * 0.18);

  return round1(clamp(score, 10, 95));
}

function inferRecoverabilityScore(axisMap: Map<AxisKey, AxisAnalysis>, marketRiskScore: number) {
  const baseRisk =
    weightedAverage([
      { value: axisMap.get("population")?.score, weight: 0.28 },
      { value: axisMap.get("labor")?.score, weight: 0.22 },
      { value: axisMap.get("housing")?.score, weight: 0.15 },
      { value: axisMap.get("income_reference")?.score, weight: 0.15 },
      { value: marketRiskScore, weight: 0.2 },
    ]) ?? marketRiskScore;

  return round1(clamp(100 - baseRisk, 5, 95));
}

function reasonLabel(code: string) {
  switch (code) {
    case "population_pressure_high":
      return "배후수요 약화";
    case "labor_pressure_high":
      return "고용·구매여력 악화";
    case "price_pressure_high":
      return "물가·마진압박";
    case "consumption_weak":
      return "소비·서비스 둔화";
    case "competition_dense":
      return "사업체·경쟁 압력";
    case "housing_stress":
      return "주거·지역쇠퇴 압력";
    case "market_risk_high":
      return "시장위험 높음";
    case "business_risk_high":
      return "사업장위험 높음";
    case "recoverability_low":
      return "구조가능성 낮음";
    default:
      return code;
  }
}

function buildReasons(
  axisMap: Map<AxisKey, AxisAnalysis>,
  marketRiskScore: number,
  businessRiskScore: number,
  recoverabilityScore: number,
) {
  const reasons: string[] = [];

  if ((axisMap.get("population")?.score ?? 0) >= 60) reasons.push("population_pressure_high");
  if ((axisMap.get("labor")?.score ?? 0) >= 60) reasons.push("labor_pressure_high");
  if ((axisMap.get("price")?.score ?? 0) >= 60) reasons.push("price_pressure_high");
  if ((axisMap.get("consumption")?.score ?? 0) >= 60) reasons.push("consumption_weak");
  if ((axisMap.get("business")?.score ?? 0) >= 60) reasons.push("competition_dense");
  if ((axisMap.get("housing")?.score ?? 0) >= 60) reasons.push("housing_stress");
  if (marketRiskScore >= 65) reasons.push("market_risk_high");
  if (businessRiskScore >= 60) reasons.push("business_risk_high");
  if (recoverabilityScore < 40) reasons.push("recoverability_low");

  return uniqueStrings(reasons);
}

function buildActions(reasons: string[]) {
  const actions: string[] = [];

  if (reasons.includes("population_pressure_high")) {
    actions.push("배후수요가 남는 시간대·고객군 중심으로 재편");
  }
  if (reasons.includes("labor_pressure_high")) {
    actions.push("가격보다 객단가·재방문 구조를 우선 보정");
  }
  if (reasons.includes("price_pressure_high")) {
    actions.push("원가·고정비·판촉비를 바로 재점검");
  }
  if (reasons.includes("consumption_weak")) {
    actions.push("프로모션보다 전환율 높은 대표상품 중심으로 축소");
  }
  if (reasons.includes("competition_dense")) {
    actions.push("경쟁업체와 겹치지 않는 차별 포지션 재설계");
  }
  if (reasons.includes("housing_stress")) {
    actions.push("주거 배후가 약한 지역은 예약·배달·목적방문형 전략 강화");
  }
  if (reasons.includes("recoverability_low")) {
    actions.push("확장보다 손실 차단과 구조조정 우선");
  }

  if (actions.length === 0) {
    actions.push("급격한 확장보다 운영지표 관찰 유지");
  }

  return actions.slice(0, 4);
}

export async function buildSearchTrendResult(
  input: CombinedIntelInput,
): Promise<SearchTrendResult> {
  const groupName = deriveGroupName(input);
  const providedKeywords = uniqueStrings([
    ...(input.keywords ?? []),
    text(input.query),
    text(input.businessName),
    text(input.categoryName),
    [text(input.regionName), text(input.categoryName)].filter(Boolean).join(" "),
  ]);

  const keywords = providedKeywords.filter(Boolean);
  const keywordRows = keywords.map((keyword) =>
    estimateTrendRow(keyword, groupName, "down"),
  );

  const totalWeight =
    keywordRows.reduce((sum, row) => sum + Math.max(0.0001, row.weight), 0) || 1;

  const trendDeltaPct = round1(
    keywordRows.reduce((sum, row) => sum + row.deltaPct * row.weight, 0) / totalWeight,
  );

  const latestRatio = round1(
    keywordRows.reduce((sum, row) => sum + row.latestRatio * row.weight, 0) / totalWeight,
  );

  const baselineRatio = round1(
    keywordRows.reduce((sum, row) => sum + row.baselineRatio * row.weight, 0) / totalWeight,
  );

  const dominantSignal: TrendSignal =
    trendDeltaPct <= -8 ? "down" : trendDeltaPct >= 8 ? "up" : "flat";

  const axes = await Promise.all(
    loadAxisConfigs(input).map((axis) => analyzeAxis(axis, input, groupName)),
  );

  return {
    groupName,
    keywords,
    trendDeltaPct,
    latestRatio,
    baselineRatio,
    dominantSignal,
    groups: keywordRows,
    axes,
  };
}

export async function buildCombinedIntelResult(
  input: CombinedIntelInput,
): Promise<CombinedIntelResult> {
  const groupName = deriveGroupName(input);
  const axes = await Promise.all(
    loadAxisConfigs(input).map((axis) => analyzeAxis(axis, input, groupName)),
  );

  const directAxes = axes.filter((axis) => axis.direct);
  const referenceAxes = axes.filter((axis) => !axis.direct);
  const axisMap = new Map(axes.map((axis) => [axis.key, axis]));

  const marketRiskScore = round1(
    weightedAverage(
      directAxes.map((axis) => ({
        value: axis.score,
        weight: axis.weight,
      })),
    ) ?? 50,
  );

  const businessRiskScore = inferBusinessStress(input, marketRiskScore);
  const recoverabilityScore = inferRecoverabilityScore(axisMap, marketRiskScore);

  const closingRiskScore = round1(
    weightedAverage([
      { value: marketRiskScore, weight: 0.4 },
      { value: businessRiskScore, weight: 0.4 },
      { value: 100 - recoverabilityScore, weight: 0.2 },
    ]) ?? marketRiskScore,
  );

  const grade = buildGrade(closingRiskScore);
  const reasons = buildReasons(
    axisMap,
    marketRiskScore,
    businessRiskScore,
    recoverabilityScore,
  );
  const reasonLabels = reasons.map(reasonLabel);
  const actions = buildActions(reasons);

  const summary = [
    `시장위험 ${marketRiskScore}점`,
    `사업장위험 ${businessRiskScore}점`,
    `구조가능성 ${recoverabilityScore}점`,
    `최종 폐업위험 ${closingRiskScore}점`,
  ].join(" · ");

  return {
    groupName,
    query: text(input.query),
    businessName: text(input.businessName),
    regionName: text(input.regionName) || deriveRegionHint(input),
    categoryName: text(input.categoryName) || deriveCategoryHint(input),
    address: text(input.address),
    marketRiskScore,
    businessRiskScore,
    recoverabilityScore,
    closingRiskScore,
    summary,
    grade,
    combined: {
      summary,
      grade,
      marketRiskScore,
      businessRiskScore,
      recoverabilityScore,
      closingRiskScore,
    },
    market: {
      score: marketRiskScore,
      risk_score: marketRiskScore,
      summary: `직접반영 6축 평균 ${marketRiskScore}점`,
      axes: directAxes,
      referenceAxes,
    },
    business: {
      score: businessRiskScore,
      risk_score: businessRiskScore,
      summary: `사업장 직접신호 보정 ${businessRiskScore}점`,
    },
    structure: {
      score: recoverabilityScore,
      recoverability_score: recoverabilityScore,
      rescue_chance_score: recoverabilityScore,
      summary: `회복가능성 ${recoverabilityScore}점`,
    },
    closing: {
      score: closingRiskScore,
      risk_score: closingRiskScore,
      grade,
      summary: `최종 폐업위험 ${closingRiskScore}점`,
    },
    reasons,
    reasonLabels,
    actions,
    axes,
  };
}