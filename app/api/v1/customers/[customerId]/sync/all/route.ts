import { NextRequest } from "next/server";
import { routeGuard } from "@/lib/utils/response";
import { syncAll } from "@/lib/sync/syncAll";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest, { params }: { params: { customerId: string } }) {
  return routeGuard(async () => {
    const body = await request.json().catch(() => ({}));
    return syncAll(params.customerId, {
      businessNumber: body.business_number,
      platforms: body.platforms,
      runScoreAfter: body.run_score_after ?? true,
      createSprint: body.create_sprint ?? true,
      scoreVersion: body.score_version ?? "gs-300-v1"
    });
  });
}
