export type CommunityWriteType = "expert" | "worry" | "success" | "story";

export type CommunityComposeInput = {
  type?: string | null;
  topic?: string | null;

  regionCode?: string | null;
  regionName?: string | null;

  industryCategory?: string | null;
  category?: string | null;

  categoryId?: string | number | null;

  signalId?: string | number | null;
  signalType?: string | null;
  signalTitle?: string | null;
  signalSummary?: string | null;
  recommendedAction?: string | null;
  why?: string | null;
  personalizedMessage?: string | null;

  title?: string | null;
  content?: string | null;

  businessNumber?: string | null;
  businessStatusLabel?: string | null;
  externalQuery?: string | null;

  keyword?: string | null;
  keywords?: Array<string | null | undefined> | null;
  query?: string | null;
  stage?: string | null;
  source?: string | null;
  reason?: string | null;

  error?: string | null;
};

function compact(value: unknown, limit = 320) {
  const text = typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
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

export function normalizeCommunityWriteType(value?: string | null): CommunityWriteType {
  const raw = String(value || "").trim().toLowerCase();

  if (raw === "ask" || raw === "expert" || raw === "question") return "expert";
  if (raw === "anonymous" || raw === "worry") return "worry";
  if (raw === "success") return "success";
  if (raw === "start" || raw === "story" || raw === "discussion" || raw === "report") {
    return "story";
  }

  return "story";
}

export function buildCommunityComposeHref(input: CommunityComposeInput) {
  const params = new URLSearchParams();

  params.set("type", normalizeCommunityWriteType(input.type || input.topic));

  const regionCode = compact(input.regionCode, 60);
  const regionName = compact(input.regionName, 120);
  const industryCategory = compact(input.industryCategory || input.category, 160);
  const categoryId = compact(input.categoryId, 60);

  const signalId = compact(input.signalId, 60);
  const signalType = compact(input.signalType, 120);
  const signalTitle = compact(input.signalTitle, 220);
  const signalSummary = compact(input.signalSummary, 320);
  const recommendedAction = compact(input.recommendedAction, 320);
  const why = compact(input.why, 320);
  const personalizedMessage = compact(input.personalizedMessage, 320);

  const title = compact(input.title, 220);
  const content = compact(input.content, 1000);

  const businessNumber = compact(input.businessNumber, 80);
  const businessStatusLabel = compact(input.businessStatusLabel, 180);

  const keywordList = uniqueStrings([
    compact(input.query, 220),
    compact(input.keyword, 220),
    ...((input.keywords ?? []).map((value) => compact(value, 220))),
  ]);

  const externalQuery = compact(
    input.externalQuery || keywordList[0] || [regionName, industryCategory].filter(Boolean).join(" "),
    220,
  );

  const error = compact(input.error, 220);

  if (regionCode) params.set("regionCode", regionCode);
  if (regionName) params.set("regionName", regionName);
  if (industryCategory) params.set("industryCategory", industryCategory);
  if (categoryId) params.set("categoryId", categoryId);

  if (signalId) params.set("signalId", signalId);
  if (signalType) params.set("signalType", signalType);
  if (signalTitle) params.set("signalTitle", signalTitle);
  if (signalSummary) params.set("signalSummary", signalSummary);
  if (recommendedAction) params.set("recommendedAction", recommendedAction);
  if (why) params.set("why", why);
  if (personalizedMessage) params.set("personalizedMessage", personalizedMessage);

  if (title) params.set("title", title);
  if (content) params.set("content", content);

  if (businessNumber) params.set("businessNumber", businessNumber);
  if (businessStatusLabel) params.set("businessStatusLabel", businessStatusLabel);
  if (externalQuery) params.set("externalQuery", externalQuery);

  if (error) params.set("error", error);

  return `/community/write?${params.toString()}`;
}