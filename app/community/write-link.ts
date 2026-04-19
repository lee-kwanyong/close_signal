export type CommunityWriteType = "expert" | "worry" | "success" | "story";

export type CommunityComposeInput = {
  type?: string | null;
  topic?: string | null;

  regionCode?: string | null;
  regionName?: string | null;

  industryCategory?: string | null;
  category?: string | null;

  signalId?: string | null;
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

  error?: string | null;
};

function compact(value: unknown, limit = 320) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return "";
  return normalized.length > limit ? `${normalized.slice(0, limit).trim()}…` : normalized;
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
  const externalQuery = compact(input.externalQuery, 220);
  const error = compact(input.error, 220);

  if (regionCode) params.set("regionCode", regionCode);
  if (regionName) params.set("regionName", regionName);
  if (industryCategory) params.set("industryCategory", industryCategory);

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