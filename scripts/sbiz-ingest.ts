import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const envLocalPath = path.join(projectRoot, ".env.local");

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/g);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function loadEnvFiles() {
  loadEnvFile(envLocalPath);
}

loadEnvFiles();

type UnknownRecord = Record<string, unknown>;

function text(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function sha1(value: string) {
  return crypto.createHash("sha1").update(value).digest("hex");
}

function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function buildStableKey(row: UnknownRecord) {
  const parts = [
    text(row.region_code, row.regionCode),
    text(row.region_name, row.regionName),
    text(row.category_id, row.categoryId),
    text(row.category_name, row.categoryName),
    text(row.score_date, row.scoreDate),
  ].filter(Boolean);

  return sha1(parts.join("|"));
}

async function main() {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("sbiz_region_category_metrics")
    .select("*")
    .order("score_date", { ascending: false })
    .limit(5000);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as UnknownRecord[];

  for (const row of rows) {
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;

    const stableKey = buildStableKey(row);
    const metadata = asRecord(row.metadata ?? row.meta ?? row.config);

    const mergedMeta = {
      ...metadata,
      stableKey,
      ingestedAt: new Date().toISOString(),
      ingestedByScript: "scripts/sbiz-ingest.ts",
    };

    const snakePayload: UnknownRecord = {
      metadata: mergedMeta,
    };

    const { error: errorA } = await supabase
      .from("sbiz_region_category_metrics")
      .update(snakePayload)
      .eq("id", id);

    if (!errorA) continue;

    const camelPayload: UnknownRecord = {
      meta: mergedMeta,
    };

    const { error: errorB } = await supabase
      .from("sbiz_region_category_metrics")
      .update(camelPayload)
      .eq("id", id);

    if (errorB) {
      throw new Error(`id=${id} 업데이트 실패: ${errorB.message || errorA.message}`);
    }
  }

  console.log(`sbiz-ingest done: ${rows.length} rows`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});