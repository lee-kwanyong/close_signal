import { redirect } from "next/navigation";
import { buildCommunityComposeHref } from "@/lib/community/write-link";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function looksLikeRegionCode(value: string) {
  return /^KR($|-)/i.test(value);
}

export default async function LegacyCommunityNewPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const sp = (await searchParams) ?? {};

  const regionRaw = one(sp.region) || one(sp.regionCode);
  const regionCode = looksLikeRegionCode(regionRaw) ? regionRaw : one(sp.regionCode);
  const regionName = one(sp.regionName) || (looksLikeRegionCode(regionRaw) ? "" : regionRaw);

  const industryCategory = one(sp.industryCategory) || one(sp.category);
  const externalQuery =
    one(sp.externalQuery) || [regionName, industryCategory].filter(Boolean).join(" ");

  redirect(
    buildCommunityComposeHref({
      type: one(sp.type) || one(sp.topic),
      regionCode,
      regionName,
      industryCategory,

      signalId: one(sp.signalId),
      signalType: one(sp.signalType),
      signalTitle: one(sp.signalTitle),
      signalSummary: one(sp.signalSummary),
      recommendedAction: one(sp.recommendedAction),
      why: one(sp.why),
      personalizedMessage: one(sp.personalizedMessage),

      title: one(sp.title),
      content: one(sp.content),

      businessNumber: one(sp.businessNumber),
      businessStatusLabel: one(sp.businessStatusLabel),
      externalQuery,
      error: one(sp.error),
    })
  );
}