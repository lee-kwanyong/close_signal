import { NextRequest } from "next/server";
import { upsertStoreProfile } from "@/lib/db/repositories";
import { routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: { customerId: string } }) {
  return routeGuard(async () => {
    const body = await request.json();
    return upsertStoreProfile(params.customerId, body);
  });
}
