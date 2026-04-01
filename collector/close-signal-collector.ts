import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

type SourceRow = {
  id: number;
  source_key: string;
  source_name: string | null;
  source_type: string | null;
  parser_key: string | null;
  is_active: boolean | null;
};

type JsonRecord = Record<string, unknown>;

type RawIngestRow = {
  external_id: string;
  raw_payload: JsonRecord;
  payload: JsonRecord;
  collected_at: string;
  observed_at: string | null;
};

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const SOURCE_KEY = process.env.CLOSE_SIGNAL_SOURCE_KEY || "sbiz_store_live_6h";
const SOURCE_DATA_URL =
  process.env.CLOSE_SIGNAL_SOURCE_DATA_URL ||
  "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListByDate";
const SOURCE_FORMAT = (process.env.CLOSE_SIGNAL_SOURCE_FORMAT || "json").toLowerCase();

const SERVICE_KEY = process.env.CLOSE_SIGNAL_SERVICE_KEY || "";
const DATE_KEY = process.env.CLOSE_SIGNAL_DATE_KEY || "";
const START_PAGE_NO = Number(process.env.CLOSE_SIGNAL_PAGE_NO || "1");
const NUM_OF_ROWS = Number(process.env.CLOSE_SIGNAL_NUM_OF_ROWS || "1000");

const REQUEST_TIMEOUT_MS = Number(process.env.CLOSE_SIGNAL_REQUEST_TIMEOUT_MS || "60000");
const UPSERT_BATCH_SIZE = Number(process.env.CLOSE_SIGNAL_BATCH_SIZE || "500");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are required.");
}

if (!SOURCE_DATA_URL) {
  throw new Error("CLOSE_SIGNAL_SOURCE_DATA_URL is required.");
}

if (!SERVICE_KEY) {
  throw new Error("CLOSE_SIGNAL_SERVICE_KEY is required.");
}

if (!DATE_KEY) {
  throw new Error("CLOSE_SIGNAL_DATE_KEY is required.");
}

if (!/^\d{8}$/.test(DATE_KEY)) {
  throw new Error("CLOSE_SIGNAL_DATE_KEY must be YYYYMMDD.");
}

if (SOURCE_FORMAT !== "json") {
  throw new Error("CLOSE_SIGNAL_SOURCE_FORMAT must be json for this collector.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "close-signal-collector/1.0",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function buildPageUrl(pageNo: number): string {
  const url = new URL(SOURCE_DATA_URL);

  url.searchParams.set("ServiceKey", SERVICE_KEY);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(NUM_OF_ROWS));
  url.searchParams.set("key", DATE_KEY);
  url.searchParams.set("type", "json");

  return url.toString();
}

function extractItemsFromGovResponse(payload: unknown): JsonRecord[] {
  if (!payload || typeof payload !== "object") return [];

  const root = payload as Record<string, unknown>;
  const response = root.response as Record<string, unknown> | undefined;
  const body = response?.body as Record<string, unknown> | undefined;
  const items = body?.items as unknown;

  if (Array.isArray(items)) {
    return items.filter(
      (item): item is JsonRecord => typeof item === "object" && item !== null
    );
  }

  if (items && typeof items === "object") {
    const itemNode = (items as Record<string, unknown>).item;

    if (Array.isArray(itemNode)) {
      return itemNode.filter(
        (item): item is JsonRecord => typeof item === "object" && item !== null
      );
    }

    if (itemNode && typeof itemNode === "object") {
      return [itemNode as JsonRecord];
    }
  }

  return [];
}

function extractTotalCount(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;
  const response = root.response as Record<string, unknown> | undefined;
  const body = response?.body as Record<string, unknown> | undefined;
  const totalCount = body?.totalCount;

  if (totalCount === null || totalCount === undefined) return null;

  const n = Number(totalCount);
  return Number.isFinite(n) ? n : null;
}

function extractResultCode(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const root = payload as Record<string, unknown>;
  const response = root.response as Record<string, unknown> | undefined;
  const header = response?.header as Record<string, unknown> | undefined;

  return normalizeText(header?.resultCode);
}

function extractResultMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const root = payload as Record<string, unknown>;
  const response = root.response as Record<string, unknown> | undefined;
  const header = response?.header as Record<string, unknown> | undefined;

  return normalizeText(header?.resultMsg);
}

function pickObservedAt(record: JsonRecord): string | null {
  const candidates = [
    record.modifiedDate,
    record.modifiedAt,
    record.updatedAt,
    record.updateDate,
    record.lastChangedAt,
    record.stdrDt,
  ];

  for (const value of candidates) {
    const text = normalizeText(value);
    if (!text) continue;

    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}

function buildExternalId(record: JsonRecord, index: number): string {
  const candidates = [
    record.bizesId,
    record.bizesid,
    record.storeId,
    record.id,
    record.상가업소번호,
    record.manageNo,
    record.mgtNo,
  ];

  for (const candidate of candidates) {
    const text = normalizeText(candidate);
    if (text) return text;
  }

  const fingerprint = createHash("md5")
    .update(JSON.stringify(record))
    .digest("hex");

  return `store-${DATE_KEY}-${index + 1}-${fingerprint}`;
}

function toRawIngestRow(record: JsonRecord, index: number): RawIngestRow {
  const collectedAt = new Date().toISOString();

  return {
    external_id: buildExternalId(record, index),
    raw_payload: record,
    payload: record,
    collected_at: collectedAt,
    observed_at: pickObservedAt(record),
  };
}

async function loadSource(sourceKey: string): Promise<SourceRow> {
  const { data, error } = await supabase
    .from("sources")
    .select("id, source_key, source_name, source_type, parser_key, is_active")
    .eq("source_key", sourceKey)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load source: ${error?.message || sourceKey}`);
  }

  if (!data.is_active) {
    throw new Error(`Source is inactive: ${sourceKey}`);
  }

  return data as SourceRow;
}

async function beginRun(sourceId: number): Promise<number> {
  const { data, error } = await supabase.rpc("begin_source_run", {
    p_source_id: sourceId,
    p_request_meta: {
      trigger: "collector",
      source_key: SOURCE_KEY,
      source_data_url: SOURCE_DATA_URL,
      source_format: SOURCE_FORMAT,
      date_key: DATE_KEY,
      page_no: START_PAGE_NO,
      num_of_rows: NUM_OF_ROWS,
    },
  });

  if (error) {
    throw new Error(`begin_source_run failed: ${error.message}`);
  }

  return Number(data);
}

async function ingestBatch(sourceId: number, runId: number, rows: RawIngestRow[]) {
  const { error } = await supabase.rpc("ingest_raw_records_json", {
    p_source_id: sourceId,
    p_source_run_id: runId,
    p_rows: rows,
  });

  if (error) {
    throw new Error(`ingest_raw_records_json failed: ${error.message}`);
  }
}

async function finishRun(
  runId: number,
  status: "success" | "failed",
  errorMessage: string | null,
  stats: JsonRecord
) {
  const { error } = await supabase.rpc("finish_source_run", {
    p_run_id: runId,
    p_status: status,
    p_error_message: errorMessage,
    p_stats: stats,
  });

  if (error) {
    throw new Error(`finish_source_run failed: ${error.message}`);
  }
}

async function runPipeline() {
  const { error } = await supabase.rpc("run_full_ingestion_pipeline", {
    p_source_id: null,
  });

  if (error) {
    throw new Error(`run_full_ingestion_pipeline failed: ${error.message}`);
  }
}

async function fetchAllPages() {
  let pageNo = START_PAGE_NO;
  let totalFetched = 0;
  let totalCount: number | null = null;
  const pages: JsonRecord[][] = [];
  const pageSummaries: Array<{
    pageNo: number;
    itemCount: number;
    resultCode: string;
    resultMsg: string;
  }> = [];

  while (true) {
    const url = buildPageUrl(pageNo);
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`Fetch failed on page ${pageNo}: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as unknown;
    const resultCode = extractResultCode(payload);
    const resultMsg = extractResultMessage(payload);

    if (resultCode && resultCode !== "00" && resultCode !== "0" && resultCode.toUpperCase() !== "NORMAL_SERVICE") {
      throw new Error(`API error on page ${pageNo}: ${resultCode} ${resultMsg}`.trim());
    }

    const items = extractItemsFromGovResponse(payload);
    const pageTotalCount = extractTotalCount(payload);

    if (totalCount === null && pageTotalCount !== null) {
      totalCount = pageTotalCount;
    }

    pages.push(items);
    totalFetched += items.length;

    pageSummaries.push({
      pageNo,
      itemCount: items.length,
      resultCode,
      resultMsg,
    });

    if (items.length === 0) break;
    if (items.length < NUM_OF_ROWS) break;
    if (totalCount !== null && totalFetched >= totalCount) break;

    pageNo += 1;
  }

  return {
    rows: pages.flat(),
    totalFetched,
    totalCount,
    pagesFetched: pageSummaries.length,
    pageSummaries,
  };
}

async function main() {
  const startedAt = Date.now();
  const source = await loadSource(SOURCE_KEY);
  const runId = await beginRun(source.id);

  try {
    const fetched = await fetchAllPages();
    const normalizedRows = fetched.rows.map(toRawIngestRow);

    for (const batch of chunk(normalizedRows, UPSERT_BATCH_SIZE)) {
      await ingestBatch(source.id, runId, batch);
    }

    await runPipeline();

    await finishRun(runId, "success", null, {
      collector: {
        source_key: SOURCE_KEY,
        date_key: DATE_KEY,
        source_data_url: SOURCE_DATA_URL,
        pages_fetched: fetched.pagesFetched,
        fetched_count: fetched.totalFetched,
        total_count: fetched.totalCount,
        normalized_count: normalizedRows.length,
        duration_ms: Date.now() - startedAt,
        page_summaries: fetched.pageSummaries,
      },
    });

    console.log(
      JSON.stringify({
        ok: true,
        run_id: runId,
        source_id: source.id,
        fetched_count: fetched.totalFetched,
        pages_fetched: fetched.pagesFetched,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await finishRun(runId, "failed", message, {
      collector: {
        source_key: SOURCE_KEY,
        date_key: DATE_KEY,
        source_data_url: SOURCE_DATA_URL,
        duration_ms: Date.now() - startedAt,
      },
    });

    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});