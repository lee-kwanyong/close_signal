import "./load-env";
import { normalizeLivingPopulation } from "../lib/import/normalizers";
import { readCsv, resolveDataFile, upsertInBatches } from "./import-utils";

async function main() {
  const filePath = resolveDataFile(process.argv[2] ?? "sample_data/seoul_living_population.csv");
  const rows = await readCsv(filePath);
  await upsertInBatches("external_seoul_living_population", rows.map((r) => normalizeLivingPopulation(r, filePath)), "source_row_hash");
}

main().catch((error) => { console.error(error); process.exit(1); });
