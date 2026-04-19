"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";

type UnknownRecord = Record<string, unknown>;

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim();
}

function requireFormValue(formData: FormData, key: string, label: string): string {
  const value = readFormValue(formData, key);
  if (!value) {
    throw new Error(`${label}은(는) 필수입니다.`);
  }
  return value;
}

function splitKeywords(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\r?\n|,/g)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function readOptionalNumber(formData: FormData, key: string): number | null {
  const value = readFormValue(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readOptionalInteger(formData: FormData, key: string): number | null {
  const value = readFormValue(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

async function tryUpdateColumns(
  monitorId: number,
  payload: UnknownRecord
): Promise<boolean> {
  const entries = Object.entries(payload).filter(([, value]) => {
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value as object).length > 0;
    return true;
  });

  if (entries.length === 0) return true;

  const supabase = supabaseAdmin();
  const updatePayload = Object.fromEntries(entries);

  const { error } = await supabase
    .from("external_intel_targets")
    .update(updatePayload)
    .eq("id", monitorId);

  return !error;
}

async function saveOptionalFields(args: {
  monitorId: number;
  phone: string;
  businessNumber: string;
  primaryKeyword: string;
  secondaryKeyword: string;
  brandKeyword: string;
  placeQuery: string;
  extraKeywords: string[];
  note: string;
  businessName: string;
  categoryName: string;
  regionName: string;
  address: string;
  from: string;
  regionCode: string;
  categoryId: number | null;
  stage: string;
  reason: string;
  score: number | null;
  query: string;
}) {
  const {
    monitorId,
    phone,
    businessNumber,
    primaryKeyword,
    secondaryKeyword,
    brandKeyword,
    placeQuery,
    extraKeywords,
    note,
    businessName,
    categoryName,
    regionName,
    address,
    from,
    regionCode,
    categoryId,
    stage,
    reason,
    score,
    query,
  } = args;

  const extraKeywordsText = extraKeywords.join("\n");

  const scalarCandidates: UnknownRecord[] = [
    { latest_stage: stage || "caution" },
    { stage: stage || "caution" },

    { source_type: from },
    { source: from },

    { region_code: regionCode },
    { category_id: categoryId },

    { phone },
    { business_number: businessNumber },

    { primary_keyword: primaryKeyword },
    { secondary_keyword: secondaryKeyword },
    { brand_keyword: brandKeyword },
    { place_query: placeQuery },

    { latest_reason_code: reason },
    { reason_code: reason },

    { note },

    { extra_keywords: extraKeywordsText },
    { keywords_text: extraKeywordsText },
    { keyword_candidates: extraKeywordsText },
    { search_keywords: extraKeywordsText },

    { query: query || primaryKeyword || businessName },
  ];

  if (score != null) {
    scalarCandidates.push(
      { latest_score_hint: score },
      { intake_score_hint: score }
    );
  }

  for (const payload of scalarCandidates) {
    await tryUpdateColumns(monitorId, payload);
  }

  const keywordArrayCandidates: UnknownRecord[] = [
    { extra_keywords: extraKeywords },
    { keyword_candidates: extraKeywords },
    { search_keywords: extraKeywords },
    { keywords: extraKeywords },
  ];

  for (const payload of keywordArrayCandidates) {
    await tryUpdateColumns(monitorId, payload);
  }

  const metadata = {
    phone: phone || null,
    businessNumber: businessNumber || null,
    primaryKeyword: primaryKeyword || null,
    secondaryKeyword: secondaryKeyword || null,
    brandKeyword: brandKeyword || null,
    placeQuery: placeQuery || null,
    extraKeywords,
    note: note || null,
    source: {
      from: from || null,
      regionCode: regionCode || null,
      categoryId,
      stage: stage || null,
      reason: reason || null,
      score,
      query: query || null,
    },
    initialInput: {
      businessName,
      categoryName,
      regionName,
      address,
    },
  };

  const jsonCandidates: UnknownRecord[] = [
    { metadata },
    { meta: metadata },
    { config: metadata },
    { input_payload: metadata },
    { raw_payload: metadata },
    { extra: metadata },
  ];

  for (const payload of jsonCandidates) {
    await tryUpdateColumns(monitorId, payload);
  }
}

export async function createMonitorAction(formData: FormData) {
  const businessName = requireFormValue(formData, "businessName", "상호명");
  const categoryName = requireFormValue(formData, "categoryName", "업종");
  const regionName = requireFormValue(formData, "regionName", "지역");
  const address = requireFormValue(formData, "address", "주소");

  const phone = readFormValue(formData, "phone");
  const businessNumber = readFormValue(formData, "businessNumber");
  const primaryKeyword = readFormValue(formData, "primaryKeyword");
  const secondaryKeyword = readFormValue(formData, "secondaryKeyword");
  const brandKeyword = readFormValue(formData, "brandKeyword");
  const placeQuery = readFormValue(formData, "placeQuery");
  const note = readFormValue(formData, "note");
  const extraKeywords = splitKeywords(readFormValue(formData, "extraKeywords"));

  const from = readFormValue(formData, "from");
  const regionCode = readFormValue(formData, "regionCode");
  const categoryId = readOptionalInteger(formData, "categoryId");
  const stage = readFormValue(formData, "stage");
  const reason = readFormValue(formData, "reason");
  const score = readOptionalNumber(formData, "score");
  const query = readFormValue(formData, "query");

  const supabase = supabaseAdmin();

  const basePayload: UnknownRecord = {
    business_name: businessName,
    category_name: categoryName,
    region_name: regionName,
    address,
  };

  const { data, error } = await supabase
    .from("external_intel_targets")
    .insert(basePayload)
    .select("id")
    .single();

  if (error) {
    throw new Error(`모니터 등록 실패: ${error.message}`);
  }

  const monitorId =
    typeof data?.id === "number"
      ? data.id
      : typeof data?.id === "string"
      ? Number(data.id)
      : NaN;

  if (!Number.isFinite(monitorId) || monitorId <= 0) {
    throw new Error("모니터 등록 후 ID를 확인하지 못했습니다.");
  }

  await saveOptionalFields({
    monitorId,
    phone,
    businessNumber,
    primaryKeyword,
    secondaryKeyword,
    brandKeyword,
    placeQuery,
    extraKeywords,
    note,
    businessName,
    categoryName,
    regionName,
    address,
    from,
    regionCode,
    categoryId,
    stage,
    reason,
    score,
    query,
  });

  revalidatePath("/monitors");
  revalidatePath(`/monitors/${monitorId}`);
  redirect(`/monitors/${monitorId}`);
}