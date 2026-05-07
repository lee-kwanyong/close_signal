import { db } from "@/lib/db/repositories";
import { routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return routeGuard(async () => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "open";
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const { data, error } = await db().from("v_today_customer_success_queue").select("*").eq("status", status).limit(limit);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });
}
