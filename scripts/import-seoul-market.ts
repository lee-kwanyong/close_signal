import "./load-env";
import { normalizeSeoulMarket } from "../lib/import/normalizers";
import { readCsv, resolveDataFile, upsertInBatches } from "./import-utils";

async function main() {
  const filePath = resolveDataFile(process.argv[2] ?? "sample_data/seoul_market_sales.csv");
  const rows = await readCsv(filePath);
  await upsertInBatches("external_seoul_market_sales", rows.map((r) => normalizeSeoulMarket(r, filePath)), "source_row_hash");
}

main().catch((error) => { console.error(error); process.exit(1); });
