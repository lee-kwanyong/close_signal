import { spawn } from "node:child_process";

type CollectorTask = {
  key: "review" | "accessibility" | "tourism";
  file: string;
};

const ALL_TASKS: CollectorTask[] = [
  {
    key: "review",
    file: "collector/review-region-category-collector.ts",
  },
  {
    key: "accessibility",
    file: "collector/accessibility-region-collector.ts",
  },
  {
    key: "tourism",
    file: "collector/tourism-region-collector.ts",
  },
];

function parseCollectorFilter(): Set<string> | null {
  const raw =
    process.env.COLLECTOR_KEYS ||
    process.env.QUALITY_COLLECTOR_KEYS ||
    "";

  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.length === 0) return null;
  return new Set(values);
}

function resolveTasks(): CollectorTask[] {
  const filter = parseCollectorFilter();
  if (!filter) return ALL_TASKS;

  return ALL_TASKS.filter((task) => filter.has(task.key));
}

async function runTask(task: CollectorTask) {
  await new Promise<void>((resolve, reject) => {
    const command = process.platform === "win32" ? "npx.cmd" : "npx";
    const child = spawn(command, ["tsx", task.file], {
      stdio: "inherit",
      shell: false,
      env: process.env,
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`collector failed: ${task.key} (exit ${code ?? "unknown"})`));
    });
  });
}

async function main() {
  const tasks = resolveTasks();

  if (tasks.length === 0) {
    throw new Error("No quality collectors selected.");
  }

  const startedAt = Date.now();

  for (const task of tasks) {
    console.log(
      JSON.stringify({
        step: "collector:start",
        collector: task.key,
        file: task.file,
      }),
    );

    await runTask(task);

    console.log(
      JSON.stringify({
        step: "collector:done",
        collector: task.key,
        file: task.file,
      }),
    );
  }

  console.log(
    JSON.stringify({
      ok: true,
      collectors: tasks.map((task) => task.key),
      duration_ms: Date.now() - startedAt,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});