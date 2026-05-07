import { NextRequest } from "next/server";
import { createEvent } from "@/lib/db/repositories";
import { routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return routeGuard(async () => {
    const body = await request.json();
    const event = await createEvent(body.customer_id, body.event_name, body.entity_type, body.entity_id, body.event_value, body.metadata ?? {});
    return { event_id: event.event_id, event_name: event.event_name, event_time: event.event_time };
  });
}
