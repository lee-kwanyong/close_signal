import "./load-env";

import fs from "node:fs";
import path from "node:path";

import { upsertInBatches } from "./import-utils";
import { rowHash } from "../lib/utils/hash";

type JsonObject = Record<string, unknown>;

type NormalizedSemasStore = {
  semas_store_id: string;
  store_name: string;

  industry_large_code: string | null;
  industry_large_name: string | null;
  industry_middle_code: string | null;
  industry_middle_name: string | null;
  industry_small_code: string | null;
  industry_small_name: string | null;

  standard_industry_code: string | null;
  standard_industry_name: string | null;

  sido_code: string | null;
  sido_name: string | null;
  sigungu_code: string | null;
  sigungu_name: string | null;
  admin_dong_code: string | null;
  admin_dong_name: string | null;
  legal_dong_code: string | null;
  legal_dong_name: string | null;

  address: string | null;
  road_address: string | null;
  lat: number | null;
  lng: number | null;

  source_file_name: string;
  source_row_hash: string;
  raw_json: JsonObject;
};

const args = process.argv.slice(2);
const csvOnly = args.includes("--csv-only");
const positionalArgs = args.filter((arg) => !arg.startsWith("--"));

const INPUT_DIR = path.resolve(
  positionalArgs[0] ?? "data/raw/collector/collected_raw"
);

const OUTPUT_CSV = path.resolve(
  positionalArgs[1] ??
    "data/processed/collector/normalized/external_semas_store_from_collected_raw.csv"
);

const MAX_JSON_SIZE_TO_PARSE = 5 * 1024 * 1024;

function ensureDir(dir: string) {
  fs.mkdirSync(dir, {
    recursive: true,
  });
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function numberValue(value: unknown): number | null {
  const raw = text(value);

  if (!raw) {
    return null;
  }

  const parsed = Number(raw.replace(/,/g, ""));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function safeJsonParse(textValue: string): unknown | null {
  try {
    return JSON.parse(textValue);
  } catch {
    return null;
  }
}

function walkFiles(dir: string): string[] {
  const result: string[] = [];

  if (!fs.existsSync(dir)) {
    return result;
  }

  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...walkFiles(fullPath));
    }

    if (entry.isFile()) {
      result.push(fullPath);
    }
  }

  return result;
}

function readJsonl(filePath: string): unknown[] {
  const textValue = fs.readFileSync(filePath, "utf8");

  return textValue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => safeJsonParse(line))
    .filter((item): item is unknown => item !== null);
}

function readJson(filePath: string): unknown | null {
  const stat = fs.statSync(filePath);

  if (stat.size > MAX_JSON_SIZE_TO_PARSE) {
    return null;
  }

  const textValue = fs.readFileSync(filePath, "utf8");
  return safeJsonParse(textValue);
}

function looksLikeStoreRecord(value: unknown): value is JsonObject {
  if (!isObject(value)) {
    return false;
  }

  const payload = isObject(value.payload) ? value.payload : value;

  const hasSemasId =
    text(payload.bizesId) !== null ||
    text(value.external_id) !== null ||
    text(value.semas_store_id) !== null;

  const hasName =
    text(payload.bizesNm) !== null ||
    text(value.business_name) !== null ||
    text(value.store_name) !== null ||
    text(value.name) !== null;

  const hasLocation =
    text(value.address) !== null ||
    text(value.road_address) !== null ||
    text(payload.lnoAdr) !== null ||
    text(payload.rdnmAdr) !== null ||
    numberValue(value.lat) !== null ||
    numberValue(value.lng) !== null ||
    numberValue(payload.lat) !== null ||
    numberValue(payload.lon) !== null;

  return hasSemasId && hasName && hasLocation;
}

function collectStoreRecords(value: unknown, output: JsonObject[]) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStoreRecords(item, output);
    }

    return;
  }

  if (!isObject(value)) {
    return;
  }

  if (looksLikeStoreRecord(value)) {
    output.push(value);
    return;
  }

  const likelyContainerKeys = [
    "data",
    "items",
    "results",
    "records",
    "documents",
    "businesses",
    "stores",
    "places",
    "payload",
  ];

  for (const key of likelyContainerKeys) {
    if (key in value) {
      collectStoreRecords(value[key], output);
    }
  }
}

function normalizeStoreRecord(
  raw: JsonObject,
  sourceFileName: string
): NormalizedSemasStore | null {
  const payload = isObject(raw.payload) ? raw.payload : raw;

  const semasStoreId =
    text(payload.bizesId) ??
    text(raw.semas_store_id) ??
    text(raw.store_id) ??
    text(raw.external_id);

  const storeName =
    text(payload.bizesNm) ??
    text(raw.business_name) ??
    text(raw.store_name) ??
    text(raw.name);

  if (!semasStoreId || !storeName) {
    return null;
  }

  const lat =
    numberValue(payload.lat) ??
    numberValue(raw.lat) ??
    numberValue(raw.latitude);

  const lng =
    numberValue(payload.lon) ??
    numberValue(payload.lng) ??
    numberValue(raw.lng) ??
    numberValue(raw.lon) ??
    numberValue(raw.longitude);

  const normalized: NormalizedSemasStore = {
    semas_store_id: semasStoreId,
    store_name: storeName,

    industry_large_code: text(payload.indsLclsCd) ?? text(raw.category_code),
    industry_large_name: text(payload.indsLclsNm) ?? text(raw.category_name),
    industry_middle_code: text(payload.indsMclsCd),
    industry_middle_name: text(payload.indsMclsNm),
    industry_small_code: text(payload.indsSclsCd),
    industry_small_name: text(payload.indsSclsNm),

    standard_industry_code: text(payload.ksicCd),
    standard_industry_name: text(payload.ksicNm),

    sido_code: text(payload.ctprvnCd),
    sido_name: text(payload.ctprvnNm),
    sigungu_code: text(payload.signguCd),
    sigungu_name: text(payload.signguNm),
    admin_dong_code: text(payload.adongCd),
    admin_dong_name: text(payload.adongNm),
    legal_dong_code: text(payload.ldongCd),
    legal_dong_name: text(payload.ldongNm),

    address: text(payload.lnoAdr) ?? text(raw.address),
    road_address: text(payload.rdnmAdr) ?? text(raw.road_address),

    lat,
    lng,

    source_file_name: sourceFileName,
    source_row_hash: rowHash(raw),
    raw_json: raw,
  };

  return normalized;
}

function csvEscape(value: unknown): string {
  const textValue =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  if (
    textValue.includes(",") ||
    textValue.includes("\n") ||
    textValue.includes('"')
  ) {
    return `"${textValue.replace(/"/g, '""')}"`;
  }

  return textValue;
}

function writeCsv(filePath: string, rows: NormalizedSemasStore[]) {
  ensureDir(path.dirname(filePath));

  const columns: Array<keyof NormalizedSemasStore> = [
    "semas_store_id",
    "store_name",
    "industry_large_code",
    "industry_large_name",
    "industry_middle_code",
    "industry_middle_name",
    "industry_small_code",
    "industry_small_name",
    "standard_industry_code",
    "standard_industry_name",
    "sido_code",
    "sido_name",
    "sigungu_code",
    "sigungu_name",
    "admin_dong_code",
    "admin_dong_name",
    "legal_dong_code",
    "legal_dong_name",
    "address",
    "road_address",
    "lat",
    "lng",
    "source_file_name",
    "source_row_hash",
    "raw_json",
  ];

  const lines = [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => csvEscape(row[column])).join(",")
    ),
  ];

  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

async function main() {
  if (!fs.existsSync(INPUT_DIR)) {
    throw new Error(`입력 폴더를 찾을 수 없습니다: ${INPUT_DIR}`);
  }

  const files = walkFiles(INPUT_DIR);
  const candidates: JsonObject[] = [];

  let jsonlFileCount = 0;
  let jsonFileCount = 0;
  let parsedJsonFileCount = 0;
  let parsedJsonlLineCount = 0;

  for (const filePath of files) {
    const extension = path.extname(filePath).toLowerCase();
    const relativePath = path.relative(INPUT_DIR, filePath);

    if (extension === ".jsonl") {
      jsonlFileCount += 1;

      const items = readJsonl(filePath);
      parsedJsonlLineCount += items.length;

      for (const item of items) {
        collectStoreRecords(
          {
            ...(isObject(item) ? item : { value: item }),
            __source_file_name: relativePath,
          },
          candidates
        );
      }
    }

    if (extension === ".json") {
      jsonFileCount += 1;

      const parsed = readJson(filePath);

      if (parsed !== null) {
        parsedJsonFileCount += 1;

        collectStoreRecords(
          {
            ...(isObject(parsed) ? parsed : { value: parsed }),
            __source_file_name: relativePath,
          },
          candidates
        );
      }
    }
  }

  const byId = new Map<string, NormalizedSemasStore>();

  for (const candidate of candidates) {
    const sourceFileName =
      text(candidate.__source_file_name) ?? "collected_raw";

    const normalized = normalizeStoreRecord(candidate, sourceFileName);

    if (!normalized) {
      continue;
    }

    byId.set(normalized.semas_store_id, normalized);
  }

  const rows = Array.from(byId.values()).sort((a, b) =>
    a.semas_store_id.localeCompare(b.semas_store_id)
  );

  writeCsv(OUTPUT_CSV, rows);

  console.log("");
  console.log("collected_raw → external_semas_store 정규화 완료");
  console.log("=".repeat(70));
  console.log(`입력 폴더: ${INPUT_DIR}`);
  console.log(`출력 CSV : ${OUTPUT_CSV}`);
  console.log("");
  console.log(`전체 파일 수: ${files.length}`);
  console.log(`JSONL 파일 수: ${jsonlFileCount}`);
  console.log(`JSON 파일 수: ${jsonFileCount}`);
  console.log(`파싱된 JSON 파일 수: ${parsedJsonFileCount}`);
  console.log(`파싱된 JSONL 라인 수: ${parsedJsonlLineCount}`);
  console.log(`후보 레코드 수: ${candidates.length}`);
  console.log(`중복 제거 후 매장 수: ${rows.length}`);
  console.log("");

  if (rows.length > 0) {
    console.log("샘플 5개:");
    console.table(
      rows.slice(0, 5).map((row) => ({
        semas_store_id: row.semas_store_id,
        store_name: row.store_name,
        sido_name: row.sido_name,
        sigungu_name: row.sigungu_name,
        industry_small_name: row.industry_small_name,
        lat: row.lat,
        lng: row.lng,
      }))
    );
  }

  if (csvOnly) {
    console.log("");
    console.log("--csv-only 옵션으로 실행되어 DB import는 생략합니다.");
    return;
  }

  if (rows.length === 0) {
    console.log("import할 행이 없습니다.");
    return;
  }

  await upsertInBatches(
    "external_semas_store",
    rows as unknown as Record<string, unknown>[],
    "semas_store_id"
  );

  console.log("");
  console.log(`external_semas_store import 완료: ${rows.length}건`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});