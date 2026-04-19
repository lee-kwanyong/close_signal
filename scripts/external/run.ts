import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const cwd = process.cwd();
const envLocalPath = path.join(cwd, ".env.local");

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

loadEnvFile(envLocalPath);

type UnknownRecord = Record<string, unknown>;

type ExternalTargetRow = {
  id: number;
  business_name?: string | null;
  region_name?: string | null;
  category_name?: string | null;
  address?: string | null;
  metadata?: unknown;
  meta?: unknown;
  config?: unknown;
};

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

function buildStableFingerprint(row: ExternalTargetRow) {
  const parts = [
    text(row.business_name),
    text(row.region_name),
    text(row.category_name),
    text(row.address),
  ].filter(Boolean);

  return sha1(parts.join("|"));
}

function createSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function fetchTargets(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("external_intel_targets")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`external_intel_targets 조회 실패: ${error.message}`);
  }

  return (data ?? []) as ExternalTargetRow[];
}

async function updateTargetFingerprint(
  supabase: SupabaseClient,
  row: ExternalTargetRow,
  fingerprint: string,
) {
  const existingMeta = asRecord(row.metadata ?? row.meta ?? row.config);

  const mergedMeta = {
    ...existingMeta,
    externalFingerprint: fingerprint,
    externalFingerprintUpdatedAt: new Date().toISOString(),
  };

  const snakePayload: UnknownRecord = {
    metadata: mergedMeta,
  };

  const { error: errorA } = await supabase
    .from("external_intel_targets")
    .update(snakePayload)
    .eq("id", row.id);

  if (!errorA) return;

  const camelPayload: UnknownRecord = {
    meta: mergedMeta,
  };

  const { error: errorB } = await supabase
    .from("external_intel_targets")
    .update(camelPayload)
    .eq("id", row.id);

  if (errorB) {
    throw new Error(
      `external_intel_targets id=${row.id} 업데이트 실패: ${errorB.message || errorA.message}`,
    );
  }
}

async function main() {
  const supabase = createSupabaseAdmin();
  const rows = await fetchTargets(supabase);

  for (const row of rows) {
    const fingerprint = buildStableFingerprint(row);
    await updateTargetFingerprint(supabase, row, fingerprint);
  }

  console.log(`external/run done: ${rows.length} rows`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});