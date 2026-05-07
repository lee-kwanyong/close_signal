import { getCustomer } from "@/lib/db/repositories";
import { routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: { customerId: string } }) {
  return routeGuard(async () => getCustomer(params.customerId));
}
