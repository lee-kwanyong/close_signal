import { db, assertNoError, createEvent } from "@/lib/db/repositories";
import { mapScoreRow } from "@/lib/engine/run";
import { normalizeCustomerId } from "@/lib/customer-id";
import { fail, routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function GET(
  _: Request,
  { params }: { params: { customerId: string } }
) {
  const customerId = normalizeCustomerId(params.customerId);

  if (!customerId) {
    return fail(
      "INVALID_CUSTOMER_ID",
      "customerId가 비어 있거나 undefined입니다.",
      400,
      { received: params.customerId }
    );
  }

  return routeGuard(async () => {
    const row = await assertNoError(
      await db()
        .from("score_result")
        .select("*")
        .eq("customer_id", customerId)
        .order("score_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .single(),
      "latestScore"
    );

    await createEvent(
      customerId,
      "REPORT_VIEWED",
      "score_result",
      row.score_id,
      Number(row.growth_signal_score),
      { source: "api" }
    );

    return mapScoreRow(row);
  });
}
