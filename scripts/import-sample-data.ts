import "./load-env";
import { execFileSync } from "node:child_process";

function run(script: string) {
  console.log(`running ${script}`);
  execFileSync("npx", ["tsx", script], { stdio: "inherit", shell: process.platform === "win32" });
}

run("scripts/import-semas-store.ts");
run("scripts/import-seoul-market.ts");
run("scripts/import-living-population.ts");
console.log("sample data imported");
