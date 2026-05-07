import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function readCsv(filePath: string): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = [];
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });
  return rows;
}

export async function upsertInBatches(table: string, rows: Record<string, unknown>[], onConflict: string, batchSize = Number(process.env.IMPORT_BATCH_SIZE ?? 500)) {
  const supabase = supabaseAdmin();
  let imported = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw error;
    imported += chunk.length;
    console.log(`[${table}] imported ${imported}/${rows.length}`);
  }
}

export function resolveDataFile(relativePath: string) {
  return path.resolve(process.cwd(), relativePath);
}
