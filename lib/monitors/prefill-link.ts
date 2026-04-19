export type MonitorPrefillInput = {
  from?: string | null;
  source?: string | null;

  businessName?: string | null;
  categoryName?: string | null;
  regionName?: string | null;
  address?: string | null;
  phone?: string | null;
  businessNumber?: string | null;

  primaryKeyword?: string | null;
  secondaryKeyword?: string | null;
  brandKeyword?: string | null;
  placeQuery?: string | null;

  keyword?: string | null;
  query?: string | null;

  keywords?: Array<string | null | undefined> | null;
  trendKeywords?: Array<string | null | undefined> | null;
  extraKeywords?: Array<string | null | undefined> | null;

  note?: string | null;
  stage?: string | null;
  reason?: string | null;
  score?: string | number | null;

  regionCode?: string | null;
  categoryId?: string | number | null;
  categoryCode?: string | number | null;
};

function compact(value: unknown, limit = 240) {
  const text =
    typeof value === "string"
      ? value.trim()
      : typeof value === "number"
        ? String(value)
        : "";

  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean),
    ),
  );
}

export function buildMonitorPrefillHref(input: MonitorPrefillInput) {
  const params = new URLSearchParams();

  const from = compact(input.from || input.source, 80);
  const businessName = compact(input.businessName, 160);
  const categoryName = compact(input.categoryName, 160);
  const regionName = compact(input.regionName, 160);
  const address = compact(input.address, 240);
  const phone = compact(input.phone, 60);
  const businessNumber = compact(input.businessNumber, 60);
  const regionCode = compact(input.regionCode, 40);
  const categoryId = compact(input.categoryId, 40);
  const categoryCode = compact(input.categoryCode, 40);

  const query = compact(input.query || input.keyword, 220);
  const primaryKeyword = compact(input.primaryKeyword || businessName || query, 220);
  const secondaryKeyword = compact(
    input.secondaryKeyword || [regionName, categoryName].filter(Boolean).join(" "),
    220,
  );
  const brandKeyword = compact(input.brandKeyword || businessName, 220);
  const placeQuery = compact(input.placeQuery || businessName || query, 220);

  const keywordLines = uniqueStrings([
    ...(input.trendKeywords ?? []),
    ...(input.keywords ?? []),
    ...(input.extraKeywords ?? []),
    query,
    primaryKeyword,
    secondaryKeyword,
    brandKeyword,
  ]).join("\n");

  const note = compact(input.note, 800);
  const stage = compact(input.stage, 40);
  const reason = compact(input.reason, 120);
  const score = compact(input.score, 40);

  if (from) params.set("from", from);
  if (businessName) params.set("businessName", businessName);
  if (categoryName) params.set("categoryName", categoryName);
  if (regionName) params.set("regionName", regionName);
  if (address) params.set("address", address);
  if (phone) params.set("phone", phone);
  if (businessNumber) params.set("businessNumber", businessNumber);
  if (primaryKeyword) params.set("primaryKeyword", primaryKeyword);
  if (secondaryKeyword) params.set("secondaryKeyword", secondaryKeyword);
  if (brandKeyword) params.set("brandKeyword", brandKeyword);
  if (placeQuery) params.set("placeQuery", placeQuery);
  if (keywordLines) params.set("extraKeywords", keywordLines);
  if (note) params.set("note", note);
  if (stage) params.set("stage", stage);
  if (reason) params.set("reason", reason);
  if (score) params.set("score", score);
  if (query) params.set("query", query);
  if (regionCode) params.set("regionCode", regionCode);
  if (categoryId) params.set("categoryId", categoryId);
  if (categoryCode) params.set("categoryCode", categoryCode);

  return `/monitors/new?${params.toString()}`;
}