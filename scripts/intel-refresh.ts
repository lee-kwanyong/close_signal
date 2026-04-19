import fs from "node:fs";
import path from "node:path";
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

loadEnvFile(envLocalPath);

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

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from("external_intel_targets")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as UnknownRecord[];

  for (const row of rows) {
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;

    const businessName = text(
      row.business_name,
      row.businessName,
      row.name,
      row.company_name,
    );
    const regionName = text(row.region_name, row.regionName);
    const categoryName = text(row.category_name, row.categoryName);

    const metadata = asRecord(row.metadata ?? row.meta ?? row.config);
    const refreshMeta = {
      ...metadata,
      lastIntelRefreshAt: new Date().toISOString(),
      lastIntelRefreshScript: "scripts/intel-refresh.ts",
    };

    const snakePayload: UnknownRecord = {
      metadata: refreshMeta,
      business_name: businessName || null,
      region_name: regionName || null,
      category_name: categoryName || null,
      refreshed_at: new Date().toISOString(),
    };

    const { error: errorA } = await supabase
      .from("external_intel_targets")
      .update(snakePayload)
      .eq("id", id);

    if (!errorA) {
      continue;
    }

    const camelPayload: UnknownRecord = {
      meta: refreshMeta,
      businessName: businessName || null,
      regionName: regionName || null,
      categoryName: categoryName || null,
      refreshedAt: new Date().toISOString(),
    };

    const { error: errorB } = await supabase
      .from("external_intel_targets")
      .update(camelPayload)
      .eq("id", id);

    if (errorB) {
      throw new Error(
        `id=${id} 업데이트 실패: ${errorB.message || errorA.message}`,
      );
    }
  }

  console.log(`intel-refresh done: ${rows.length} rows`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});