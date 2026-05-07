import { NextRequest } from "next/server";
import { createCustomer } from "@/lib/db/repositories";
import { routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return routeGuard(async () => {
    const body = await request.json();
    return createCustomer({
      business_number: body.business_number,
      business_name: body.business_name,
      owner_name: body.owner_name,
      industry_code: body.industry_code,
      industry_name: body.industry_name,
      industry_group: body.industry_group,
      address: body.address,
      road_address: body.road_address,
      opened_at: body.opened_at,
      store_count: body.store_count
    });
  });
}
