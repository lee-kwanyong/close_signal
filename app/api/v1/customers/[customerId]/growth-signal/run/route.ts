import { NextRequest } from "next/server";

import { normalizeCustomerId } from "@/lib/customer-id";
import { runGrowthSignalEngine } from "@/lib/engine/run";
import { fail, routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
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
    const body = await request.json().catch(() => ({}));

    return runGrowthSignalEngine(customerId, {
      createSprint: body.create_sprint ?? true,
      scoreVersion: body.score_version ?? "growth-signal-v2+risk-radar-v1",
    });
  });
}
