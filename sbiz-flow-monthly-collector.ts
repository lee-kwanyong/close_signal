import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { createClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;

type SourceRow = {
  id: number;
  source_key: string;
  source_name: string | null;
  source_type: string | null;
  is_active: boolean | null;
};

type NormalizedSbizRow = {
  base_month: string;
  region_code: string;
  region_name: string | null;
  category_id: number;
  category_name: string | null;
  open_count: number | null;
  close_count: number | null;
  raw_payload: JsonRecord;
  source_key: string;
  observed_at: string | null;
  collected_at: string;
};

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const SOURCE_KEY = process.env.CLOSE_SIGNAL_SOURCE_KEY || "sbiz_flow_monthly";
const FILE_PATH = process.env.SBIZ_FLOW_FILE_PATH || "";
const FILE_URL = process.env.SBIZ_FLOW_FILE_URL || "";
const FILE_ENCODING = (process.env.SBIZ_FLOW_FILE_ENCODING || "utf-8").toLowerCase();
const DEFAULT_BASE_MONTH = process.env.SBIZ_BASE_MONTH || "";
const REQUEST_TIMEOUT_MS = Number(process.env.CLOSE_SIGNAL_REQUEST_TIMEOUT_MS || "60000");
const UPSERT_BATCH_SIZE = Number(process.env.CLOSE_SIGNAL_BATCH_SIZE || "500");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are required.");
}

if (!FILE_PATH && !FILE_URL) {
  throw new Error("SBIZ_FLOW_FILE_PATH or SBIZ_FLOW_FILE_URL is required.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function nullIfBlank(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

function toInt(value: unknown): number | null {
  const raw = normalizeText(value).replace(/,/g, "");
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  return Math.trunc(num);
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function stablePositiveInt(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

function normalizeEncodingLabel(label: string): string {
  if (label === "cp949" || label === "ms949" || label === "euckr") return "euc-kr";
  return label;
}

function decodeBuffer(buffer: Buffer, encoding: string): string {
  const decoder = new TextDecoder(normalizeEncodingLabel(encoding));
  return decoder.decode(buffer);
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/csv,text/plain,application/octet-stream,*/*",
        "User-Agent": "close-signal-sbiz-flow-collector/1.0",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function loadBytes(): Promise<{ bytes: Buffer; sourceLabel: string }> {
  if (FILE_PATH) {
    const bytes = await readFile(FILE_PATH);
    return { bytes, sourceLabel: FILE_PATH };
  }

  const response = await fetchWithTimeout(FILE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    bytes: Buffer.from(arrayBuffer),
    sourceLabel: FILE_URL,
  };
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      result.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  result.push(current);
  return result.map((value) => value.trim());
}

function detectDelimiter(text: string): string {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  const candidates = [",", "\t", "|", ";"];
  let best = ",";
  let bestScore = -1;

  for (const delimiter of candidates) {
    const score = lines.reduce((sum, line) => sum + splitCsvLine(line, delimiter).length, 0);
    if (score > bestScore) {
      bestScore = score;
      best = delimiter;
    }
  }

  return best;
}

function parseCsv(text: string): JsonRecord[] {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(clean);
  const headers = splitCsvLine(lines[0], delimiter);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const row: JsonRecord = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function getFirst(row: JsonRecord, aliases: string[]): unknown {
  for (const alias of aliases) {
    if (alias in row) {
      const value = row[alias];
      const text = normalizeText(value);
      if (text) return value;
    }
  }
  return null;
}

function parseMonthLike(value: unknown): string | null {
  const raw = normalizeText(value);
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw.slice(0, 7)}-01`;
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  if (/^\d{6}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-01`;
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-01`;

  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
  }

  return null;
}

function inferBaseMonthFromSourceLabel(sourceLabel: string): string | null {
  const fileName = basename(sourceLabel);
  const match = fileName.match(/(20\d{2})[-_]?(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-01`;
}

function resolveBaseMonth(row: JsonRecord, sourceLabel: string): string {
  const direct = parseMonthLike(
    getFirst(row, [
      "base_month",
      "기준년월",
      "기준월",
      "년월",
      "월",
      "stdrYm",
      "stdrYmd",
      "기준일자",
    ]),
  );

  if (direct) return direct;

  const fallback =
    parseMonthLike(DEFAULT_BASE_MONTH) ||
    inferBaseMonthFromSourceLabel(sourceLabel);

  if (!fallback) {
    throw new Error(
      "Failed to resolve base month. Set SBIZ_BASE_MONTH=YYYY-MM-01 or include a month column in the file.",
    );
  }

  return fallback;
}

function resolveRegionName(row: JsonRecord): string | null {
  const sido = nullIfBlank(
    getFirst(row, ["시도명", "시도", "시도별", "광역시도명", "sido_name", "region_name_1"]),
  );

  const sigungu = nullIfBlank(
    getFirst(row, ["시군구명", "시군구", "시군구별", "구군명", "sigungu_name", "region_name_2"]),
  );

  if (sido && sigungu) return `${sido} ${sigungu}`;
  return sigungu || sido || nullIfBlank(getFirst(row, ["region_name", "지역명", "행정구역명"]));
}

function resolveRegionCode(row: JsonRecord, regionName: string | null): string | null {
  const explicit = nullIfBlank(
    getFirst(row, [
      "region_code",
      "행정구역코드",
      "시군구코드",
      "시군구별코드",
      "법정동코드",
      "sigungu_cd",
      "sigungu_code",
    ]),
  );

  if (explicit) return explicit;
  return regionName ? regionName.replace(/\s+/g, "_") : null;
}

function resolveCategoryName(row: JsonRecord): string | null {
  return (
    nullIfBlank(
      getFirst(row, [
        "category_name",
        "업종명",
        "업종",
        "업종별",
        "생활업종명",
        "상권업종대분류명",
        "svc_induty_nm",
      ]),
    ) || null
  );
}

function resolveCategoryId(row: JsonRecord, categoryName: string | null): number | null {
  const explicit = toInt(
    getFirst(row, [
      "category_id",
      "업종코드",
      "업종별코드",
      "생활업종코드",
      "상권업종대분류코드",
      "svc_induty_cd",
      "industry_code",
    ]),
  );

  if (explicit !== null) return explicit;
  if (!categoryName) return null;

  return stablePositiveInt(categoryName);
}

function resolveOpenCount(row: JsonRecord): number | null {
  return toInt(
    getFirst(row, [
      "open_count",
      "신생",
      "신규",
      "신생사업자수",
      "신규사업자수",
      "개업",
      "개업수",
      "open",
      "opened_count",
    ]),
  );
}

function resolveCloseCount(row: JsonRecord): number | null {
  return toInt(
    getFirst(row, [
      "close_count",
      "폐업",
      "폐업수",
      "폐업사업자수",
      "휴폐업수",
      "휴업폐업수",
      "close",
      "closed_count",
    ]),
  );
}

function pickObservedAt(row: JsonRecord, baseMonth: string): string | null {
  const direct = parseMonthLike(
    getFirst(row, [
      "observed_at",
      "기준년월",
      "기준월",
      "기준일자",
      "stdrYm",
      "stdrYmd",
    ]),
  );

  const value = direct || baseMonth;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeRow(row: JsonRecord, sourceLabel: string): NormalizedSbizRow | null {
  const baseMonth = resolveBaseMonth(row, sourceLabel);
  const regionName = resolveRegionName(row);
  const regionCode = resolveRegionCode(row, regionName);
  const categoryName = resolveCategoryName(row);
  const categoryId = resolveCategoryId(row, categoryName);
  const openCount = resolveOpenCount(row);
  const closeCount = resolveCloseCount(row);

  if (!regionCode || categoryId === null) {
    return null;
  }

  if (openCount === null && closeCount === null) {
    return null;
  }

  return {
    base_month: baseMonth,
    region_code: regionCode,
    region_name: regionName,
    category_id: categoryId,
    category_name: categoryName,
    open_count: openCount,
    close_count: closeCount,
    raw_payload: row,
    source_key: SOURCE_KEY,
    observed_at: pickObservedAt(row, baseMonth),
    collected_at: new Date().toISOString(),
  };
}

async function loadSource(sourceKey: string): Promise<SourceRow> {
  const { data, error } = await supabase
    .from("sources")
    .select("id, source_key, source_name, source_type, is_active")
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

async function tryBeginRun(sourceId: number, sourceLabel: string): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc("begin_source_run", {
      p_source_id: sourceId,
      p_request_meta: {
        trigger: "collector",
        source_key: SOURCE_KEY,
        file_path: FILE_PATH || null,
        file_url: FILE_URL || null,
        file_label: sourceLabel,
        file_encoding: FILE_ENCODING,
        default_base_month: DEFAULT_BASE_MONTH || null,
      },
    });

    if (error) {
      console.warn(`[begin_source_run skipped] ${error.message}`);
      return null;
    }

    return Number(data);
  } catch (error) {
    console.warn(
      `[begin_source_run skipped] ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

async function tryFinishRun(
  runId: number | null,
  status: "success" | "failed",
  errorMessage: string | null,
  stats: JsonRecord,
) {
  if (!runId) return;

  try {
    const { error } = await supabase.rpc("finish_source_run", {
      p_run_id: runId,
      p_status: status,
      p_error_message: errorMessage,
      p_stats: stats,
    });

    if (error) {
      console.warn(`[finish_source_run skipped] ${error.message}`);
    }
  } catch (error) {
    console.warn(
      `[finish_source_run skipped] ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function upsertNormalizedRows(rows: NormalizedSbizRow[]): Promise<number> {
  let total = 0;

  for (const batch of chunk(rows, UPSERT_BATCH_SIZE)) {
    const { data, error } = await supabase.rpc("upsert_normalized_sbiz_flow_monthly", {
      p_rows: batch,
    });

    if (error) {
      throw new Error(`upsert_normalized_sbiz_flow_monthly failed: ${error.message}`);
    }

    total += Number(data || 0);
  }

  return total;
}

async function refreshRiskPipeline(fromMonth: string | null) {
  const { data, error } = await supabase.rpc("refresh_public_business_risk_pipeline", {
    p_from_month: fromMonth,
  });

  if (error) {
    throw new Error(`refresh_public_business_risk_pipeline failed: ${error.message}`);
  }

  return data;
}

async function main() {
  const startedAt = Date.now();
  const { bytes, sourceLabel } = await loadBytes();
  const csvText = decodeBuffer(bytes, FILE_ENCODING);
  const parsedRows = parseCsv(csvText);
  const normalizedRows = parsedRows
    .map((row) => normalizeRow(row, sourceLabel))
    .filter((row): row is NormalizedSbizRow => Boolean(row));

  if (normalizedRows.length === 0) {
    const headerPreview = parsedRows[0] ? Object.keys(parsedRows[0]) : [];
    throw new Error(
      `No valid rows were normalized from the SBIZ monthly flow file. headers=${JSON.stringify(headerPreview)}`,
    );
  }

  const source = await loadSource(SOURCE_KEY);
  const runId = await tryBeginRun(source.id, sourceLabel);

  try {
    const upsertedCount = await upsertNormalizedRows(normalizedRows);

    const minMonth =
      normalizedRows
        .map((row) => row.base_month)
        .sort()[0] || null;

    const pipelineResult = await refreshRiskPipeline(minMonth);

    await tryFinishRun(runId, "success", null, {
      collector: {
        source_key: SOURCE_KEY,
        file_path: FILE_PATH || null,
        file_url: FILE_URL || null,
        file_label: sourceLabel,
        file_encoding: FILE_ENCODING,
        parsed_count: parsedRows.length,
        normalized_count: normalizedRows.length,
        upserted_count: upsertedCount,
        min_month: minMonth,
        duration_ms: Date.now() - startedAt,
        pipeline_result: pipelineResult,
      },
    });

    console.log(
      JSON.stringify({
        ok: true,
        source_key: SOURCE_KEY,
        run_id: runId,
        parsed_count: parsedRows.length,
        normalized_count: normalizedRows.length,
        upserted_count: upsertedCount,
        min_month: minMonth,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await tryFinishRun(runId, "failed", message, {
      collector: {
        source_key: SOURCE_KEY,
        file_path: FILE_PATH || null,
        file_url: FILE_URL || null,
        file_label: sourceLabel,
        file_encoding: FILE_ENCODING,
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