import "./load-env";
import { normalizeSemas } from "../lib/import/normalizers";
import { readCsv, resolveDataFile, upsertInBatches } from "./import-utils";

async function main() {
  const filePath = resolveDataFile(process.argv[2] ?? "sample_data/semas_store.csv");
  const rows = await readCsv(filePath);
  await upsertInBatches("external_semas_store", rows.map((r) => normalizeSemas(r, filePath)), "semas_store_id");
}

main().catch((error) => { console.error(error); process.exit(1); });
