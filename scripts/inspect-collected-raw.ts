import * as fs from "node:fs";
import * as path from "node:path";

type KeyStats = Record<
  string,
  {
    count: number;
    examples: string[];
  }
>;

type FileInventoryRow = {
  relativePath: string;
  directory: string;
  fileName: string;
  extension: string;
  sizeBytes: number;
};

const INPUT_DIR = path.resolve(
  process.argv[2] ?? "data/raw/collector/collected_raw"
);

const OUTPUT_DIR = path.resolve(
  process.argv[3] ?? "data/processed/collector/inventory"
);

const MAX_JSON_SIZE_TO_PARSE = 5 * 1024 * 1024;
const MAX_JSONL_LINES_TO_PARSE = 5;
const MAX_DEPTH = 6;
const MAX_SAMPLE_ROWS = 300;

function ensureDir(dir: string) {
  fs.mkdirSync(dir, {
    recursive: true,
  });
}

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);

  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function writeCsv(filePath: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    fs.writeFileSync(filePath, "", "utf8");
    return;
  }

  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );

  const lines = [
    columns.map(csvEscape).join(","),
    ...rows.map((row) =>
      columns.map((column) => csvEscape(row[column])).join(",")
    ),
  ];

  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
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

function safeParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function addKeyStat(stats: KeyStats, key: string, example?: unknown) {
  if (!stats[key]) {
    stats[key] = {
      count: 0,
      examples: [],
    };
  }

  stats[key].count += 1;

  if (
    example !== null &&
    example !== undefined &&
    typeof example !== "object" &&
    stats[key].examples.length < 3
  ) {
    const text = String(example).trim();

    if (text && text.length <= 160 && !stats[key].examples.includes(text)) {
      stats[key].examples.push(text);
    }
  }
}

function collectKeys(
  value: unknown,
  keyStats: KeyStats,
  prefix = "",
  depth = 0
) {
  if (depth > MAX_DEPTH) {
    return;
  }

  if (Array.isArray(value)) {
    const arrayKey = prefix ? `${prefix}[]` : "[]";
    addKeyStat(keyStats, arrayKey, `[array:${value.length}]`);

    for (const item of value.slice(0, 3)) {
      collectKeys(item, keyStats, arrayKey, depth + 1);
    }

    return;
  }

  if (!value || typeof value !== "object") {
    if (prefix) {
      addKeyStat(keyStats, prefix, value);
    }

    return;
  }

  const objectValue = value as Record<string, unknown>;

  for (const [key, child] of Object.entries(objectValue)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    addKeyStat(keyStats, nextKey, child);
    collectKeys(child, keyStats, nextKey, depth + 1);
  }
}

function flattenPrimitiveValues(
  value: unknown,
  output: Record<string, unknown> = {},
  prefix = "",
  depth = 0
): Record<string, unknown> {
  if (depth > MAX_DEPTH) {
    return output;
  }

  if (Array.isArray(value)) {
    if (prefix) {
      output[prefix] = `[array:${value.length}]`;
    }

    if (value.length > 0) {
      flattenPrimitiveValues(value[0], output, `${prefix}[]`, depth + 1);
    }

    return output;
  }

  if (!value || typeof value !== "object") {
    if (prefix) {
      output[prefix] = value;
    }

    return output;
  }

  const objectValue = value as Record<string, unknown>;

  for (const [key, child] of Object.entries(objectValue)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    flattenPrimitiveValues(child, output, nextKey, depth + 1);
  }

  return output;
}

function parseJsonFile(filePath: string): unknown | null {
  const text = fs.readFileSync(filePath, "utf8");
  return safeParseJson(text);
}

function parseJsonlSample(filePath: string): unknown[] {
  const text = fs.readFileSync(filePath, "utf8");

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_JSONL_LINES_TO_PARSE)
    .map((line) => safeParseJson(line))
    .filter((item): item is unknown => item !== null);
}

function main() {
  ensureDir(OUTPUT_DIR);

  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`입력 폴더를 찾을 수 없습니다: ${INPUT_DIR}`);
    process.exit(1);
  }

  const files = walkFiles(INPUT_DIR);

  const extensionStats: Record<string, number> = {};
  const keyStats: KeyStats = {};
  const fileInventoryRows: FileInventoryRow[] = [];
  const summarySampleRows: Array<Record<string, unknown>> = [];

  let summaryJsonCount = 0;
  let jsonCount = 0;
  let jsonlCount = 0;
  let csvCount = 0;
  let sqlCount = 0;
  let parseErrorCount = 0;

  for (const filePath of files) {
    const stat = fs.statSync(filePath);
    const relativePath = path.relative(INPUT_DIR, filePath);
    const directory = path.dirname(relativePath);
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase() || "(none)";

    extensionStats[extension] = (extensionStats[extension] ?? 0) + 1;

    fileInventoryRows.push({
      relativePath,
      directory,
      fileName,
      extension,
      sizeBytes: stat.size,
    });

    if (extension === ".json") {
      jsonCount += 1;
    }

    if (extension === ".jsonl") {
      jsonlCount += 1;
    }

    if (extension === ".csv") {
      csvCount += 1;
    }

    if (extension === ".sql") {
      sqlCount += 1;
    }

    try {
      if (fileName.toLowerCase() === "summary.json") {
        summaryJsonCount += 1;

        const parsed = parseJsonFile(filePath);

        if (parsed === null) {
          parseErrorCount += 1;
          continue;
        }

        collectKeys(parsed, keyStats);

        if (summarySampleRows.length < MAX_SAMPLE_ROWS) {
          summarySampleRows.push({
            relativePath,
            directory,
            sizeBytes: stat.size,
            ...flattenPrimitiveValues(parsed),
          });
        }

        continue;
      }

      if (extension === ".json" && stat.size <= MAX_JSON_SIZE_TO_PARSE) {
        const parsed = parseJsonFile(filePath);

        if (parsed === null) {
          parseErrorCount += 1;
          continue;
        }

        collectKeys(parsed, keyStats);
      }

      if (extension === ".jsonl") {
        const parsedItems = parseJsonlSample(filePath);

        if (parsedItems.length === 0) {
          parseErrorCount += 1;
          continue;
        }

        for (const item of parsedItems) {
          collectKeys(item, keyStats);
        }
      }
    } catch {
      parseErrorCount += 1;
    }
  }

  const extensionRows = Object.entries(extensionStats)
    .map(([extension, count]) => ({
      extension,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const keyRows = Object.entries(keyStats)
    .map(([key, stat]) => ({
      key,
      count: stat.count,
      examples: stat.examples.join(" | "),
    }))
    .sort((a, b) => b.count - a.count);

  const report = {
    inputDir: INPUT_DIR,
    outputDir: OUTPUT_DIR,
    totalFiles: files.length,
    totalDirectories: new Set(fileInventoryRows.map((row) => row.directory))
      .size,
    summaryJsonCount,
    jsonCount,
    jsonlCount,
    csvCount,
    sqlCount,
    parseErrorCount,
    extensionStats,
    topKeys: keyRows.slice(0, 100),
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "collector_inventory_report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );

  writeCsv(
    path.join(OUTPUT_DIR, "collector_file_inventory.csv"),
    fileInventoryRows
  );

  writeCsv(
    path.join(OUTPUT_DIR, "collector_extension_inventory.csv"),
    extensionRows
  );

  writeCsv(path.join(OUTPUT_DIR, "collector_key_inventory.csv"), keyRows);

  writeCsv(
    path.join(OUTPUT_DIR, "collector_summary_sample.csv"),
    summarySampleRows
  );

  console.log("");
  console.log("수집 원본 데이터 인벤토리 생성 완료");
  console.log("=".repeat(60));
  console.log(`입력 폴더: ${INPUT_DIR}`);
  console.log(`출력 폴더: ${OUTPUT_DIR}`);
  console.log("");
  console.log(`총 파일 수: ${files.length}`);
  console.log(`summary.json 수: ${summaryJsonCount}`);
  console.log(`.json 수: ${jsonCount}`);
  console.log(`.jsonl 수: ${jsonlCount}`);
  console.log(`.csv 수: ${csvCount}`);
  console.log(`.sql 수: ${sqlCount}`);
  console.log(`파싱 오류 수: ${parseErrorCount}`);
  console.log("");

  console.log("확장자 통계");
  console.table(extensionRows);

  console.log("상위 key 30개");
  console.table(keyRows.slice(0, 30));
}

main();