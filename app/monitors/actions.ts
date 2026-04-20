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
        .filter(Boolean),
    ),
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

function errorCodeOf(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code?: unknown }).code ?? "");
  }
  return "";
}

function errorMessageOf(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "알 수 없는 오류");
  }
  return "알 수 없는 오류";
}

function isIgnorableSchemaError(error: unknown) {
  const code = errorCodeOf(error);
  const message = errorMessageOf(error).toLowerCase();

  if (["42P01", "42703", "PGRST204", "PGRST205"].includes(code)) {
    return true;
  }

  return (
    message.includes("could not find the table") ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find the relation")
  );
}

function appendStatusToPath(
  path: string,
  status: Record<string, string | number | undefined | null>,
) {
  const safePath = path.trim() || "/rankings";
  const [pathname, search = ""] = safePath.split("?");
  const params = new URLSearchParams(search);

  Object.entries(status).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function stageFromSeverity(value: string) {
  const raw = value.trim().toLowerCase();

  if (raw === "critical" || raw === "high") return "critical";
  if (raw === "moderate" || raw === "warning" || raw === "caution") return "caution";
  return "observe";
}

async function tryUpdateColumns(
  monitorId: number,
  payload: UnknownRecord,
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
    scalarCandidates.push({ latest_score_hint: score }, { intake_score_hint: score });
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

async function deleteEq(
  tableName: string,
  column: string,
  value: string | number,
): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from(tableName)
    .delete()
    .eq(column, value)
    .select("id");

  if (error) {
    if (isIgnorableSchemaError(error)) return 0;
    throw new Error(`[${tableName}.${column}] ${errorMessageOf(error)}`);
  }

  return Array.isArray(data) ? data.length : 0;
}

async function deleteIn(
  tableName: string,
  column: string,
  values: number[],
): Promise<number> {
  if (values.length === 0) return 0;

  const { data, error } = await supabaseAdmin()
    .from(tableName)
    .delete()
    .in(column, values)
    .select("id");

  if (error) {
    if (isIgnorableSchemaError(error)) return 0;
    throw new Error(`[${tableName}.${column}] ${errorMessageOf(error)}`);
  }

  return Array.isArray(data) ? data.length : 0;
}

async function selectIds(tableName: string, column: string, value: number): Promise<number[]> {
  const { data, error } = await supabaseAdmin()
    .from(tableName)
    .select("id")
    .eq(column, value);

  if (error) {
    if (isIgnorableSchemaError(error)) return [];
    throw new Error(`[${tableName}.${column}] ${errorMessageOf(error)}`);
  }

  return (data ?? [])
    .map((row) => {
      const raw = row?.id;
      if (typeof raw === "number") return raw;
      if (typeof raw === "string") return Number(raw);
      return NaN;
    })
    .filter((value) => Number.isFinite(value) && value > 0);
}

async function deleteMonitorCascade(monitorId: number) {
  const snapshotIds = await selectIds("business_health_snapshots", "monitor_id", monitorId);

  if (snapshotIds.length > 0) {
    await deleteIn("business_snapshot_reasons", "snapshot_id", snapshotIds);
    await deleteIn("business_snapshot_reasons", "business_health_snapshot_id", snapshotIds);
    await deleteIn("snapshot_recommended_actions", "snapshot_id", snapshotIds);
    await deleteIn(
      "snapshot_recommended_actions",
      "business_health_snapshot_id",
      snapshotIds,
    );
  }

  const taskIds = await selectIds("intervention_tasks", "monitor_id", monitorId);

  if (taskIds.length > 0) {
    await deleteIn("intervention_outcomes", "task_id", taskIds);
    await deleteIn("intervention_outcomes", "intervention_task_id", taskIds);
  }

  await deleteEq("intervention_outcomes", "monitor_id", monitorId);
  await deleteEq("intervention_tasks", "monitor_id", monitorId);
  await deleteEq("snapshot_recommended_actions", "monitor_id", monitorId);
  await deleteEq("business_snapshot_reasons", "monitor_id", monitorId);
  await deleteEq("business_health_snapshots", "monitor_id", monitorId);

  await deleteEq("external_intel_records", "monitor_id", monitorId);
  await deleteEq("external_intel_signals", "monitor_id", monitorId);
  await deleteEq("external_intel_snapshots", "monitor_id", monitorId);
  await deleteEq("external_intel_events", "monitor_id", monitorId);

  await deleteEq("external_intel_targets", "id", monitorId);
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
  revalidatePath("/signals");
  revalidatePath("/rankings");

  redirect("/monitors");
}

export async function createMonitorFromRankingAction(formData: FormData) {
  const regionCode = requireFormValue(formData, "regionCode", "지역 코드");
  const regionName = requireFormValue(formData, "regionName", "지역명");
  const categoryId = readOptionalInteger(formData, "categoryId");
  const categoryName = requireFormValue(formData, "categoryName", "업종명");
  const severity = readFormValue(formData, "severity");
  const summaryText = readFormValue(formData, "summaryText");
  const recoveryDirection = readFormValue(formData, "recoveryDirection");
  const integratedFinalScore = readOptionalNumber(formData, "integratedFinalScore");
  const next = readFormValue(formData, "next") || "/rankings";

  if (categoryId === null) {
    redirect(appendStatusToPath(next, { error: "monitor_missing_category" }));
  }

  const supabase = supabaseAdmin();

  const { data: existing, error: existingError } = await supabase
    .from("external_intel_targets")
    .select("id")
    .eq("region_code", regionCode)
    .eq("category_id", categoryId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError && !isIgnorableSchemaError(existingError)) {
    redirect(
      appendStatusToPath(next, {
        error: "monitor_lookup_failed",
      }),
    );
  }

  if (existing?.id) {
    revalidatePath("/monitors");
    revalidatePath("/rankings");
    redirect(
      appendStatusToPath(next, {
        success: "monitor_exists",
      }),
    );
  }

  const businessName = `${regionName} · ${categoryName}`;
  const address = regionName;
  const stage = stageFromSeverity(severity || "observe");

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
    redirect(
      appendStatusToPath(next, {
        error: "monitor_add_failed",
      }),
    );
  }

  const monitorId =
    typeof data?.id === "number"
      ? data.id
      : typeof data?.id === "string"
        ? Number(data.id)
        : NaN;

  if (!Number.isFinite(monitorId) || monitorId <= 0) {
    redirect(
      appendStatusToPath(next, {
        error: "monitor_add_failed",
      }),
    );
  }

  await saveOptionalFields({
    monitorId,
    phone: "",
    businessNumber: "",
    primaryKeyword: businessName,
    secondaryKeyword: categoryName,
    brandKeyword: regionName,
    placeQuery: businessName,
    extraKeywords: [regionName, categoryName].filter(Boolean),
    note: recoveryDirection || summaryText,
    businessName,
    categoryName,
    regionName,
    address,
    from: "ranking",
    regionCode,
    categoryId,
    stage,
    reason: "ranking_monitor_created",
    score: integratedFinalScore,
    query: businessName,
  });

  revalidatePath("/monitors");
  revalidatePath(`/monitors/${monitorId}`);
  revalidatePath("/signals");
  revalidatePath("/rankings");

  redirect(
    appendStatusToPath(next, {
      success: "monitor_added",
    }),
  );
}

export async function deleteMonitorAction(formData: FormData) {
  const rawMonitorId = readFormValue(formData, "monitorId");
  const monitorId = Number(rawMonitorId);

  if (!Number.isFinite(monitorId) || monitorId <= 0) {
    throw new Error("삭제할 모니터 ID가 올바르지 않습니다.");
  }

  await deleteMonitorCascade(monitorId);

  revalidatePath("/monitors");
  revalidatePath(`/monitors/${monitorId}`);
  revalidatePath("/signals");
  revalidatePath("/rankings");

  redirect("/monitors");
}