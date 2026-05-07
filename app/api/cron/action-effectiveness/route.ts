import { db } from "@/lib/db/repositories";
import { fail, routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";
export const maxDuration = 300;

type ActionOutcomeRow = {
  action_code: string | null;
  industry_group: string | null;
  market_type: string | null;
  customer_segment: string | null;
  completion_status: string | null;
  score_lift: number | string | null;
};

function authorize(request: Request) {
  const url = new URL(request.url);
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  return (
    !expected ||
    url.searchParams.get("secret") === expected ||
    auth === `Bearer ${expected}`
  );
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function getGroupKey(row: ActionOutcomeRow): string | null {
  if (!row.action_code) {
    return null;
  }

  return [
    row.action_code,
    row.industry_group ?? "default",
    row.market_type ?? "all",
    row.customer_segment ?? "all",
  ].join("|");
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return fail("UNAUTHORIZED", "Invalid cron secret", 401);
  }

  return routeGuard(async () => {
    const { data: outcomes, error } = await db()
      .from("action_outcome")
      .select("*")
      .limit(50000);

    if (error) {
      throw new Error(error.message);
    }

    const outcomeRows = (outcomes ?? []) as unknown as ActionOutcomeRow[];
    const groups = new Map<string, ActionOutcomeRow[]>();

    for (const row of outcomeRows) {
      const key = getGroupKey(row);

      if (!key) {
        continue;
      }

      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    let upserts = 0;

    for (const [key, rows] of Array.from(groups.entries())) {
      const [action_code, industry_group, market_type, customer_segment] =
        key.split("|");

      const completed = rows.filter((row: ActionOutcomeRow) =>
        ["completed", "verified", "persisted"].includes(
          row.completion_status ?? ""
        )
      );

      const avgLift =
        rows.reduce(
          (acc: number, row: ActionOutcomeRow) =>
            acc + toNumber(row.score_lift),
          0
        ) / Math.max(rows.length, 1);

      const completionRate =
        Math.round((completed.length / Math.max(rows.length, 1)) * 10000) /
        100;

      const confidenceLevel =
        rows.length >= 100
          ? 90
          : rows.length >= 50
            ? 75
            : rows.length >= 20
              ? 60
              : rows.length >= 10
                ? 40
                : 20;

      const { error: upsertError } = await db()
        .from("action_effectiveness_summary")
        .upsert(
          {
            action_code,
            industry_group,
            market_type,
            customer_segment,
            sample_size: rows.length,
            completion_rate: completionRate,
            avg_score_lift: Math.round(avgLift * 100) / 100,
            confidence_level: confidenceLevel,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict:
              "action_code,industry_group,market_type,customer_segment",
          }
        );

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      upserts += 1;
    }

    return {
      updated_rows: upserts,
    };
  });
}