import { db, assertNoError, createEvent } from "@/lib/db/repositories";
import { routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: { actionId: string } }) {
  return routeGuard(async () => {
    const action = await assertNoError(await db().from("action_instance").update({ status: "clicked", clicked_at: new Date().toISOString() }).eq("action_id", params.actionId).select("*").single(), "clickAction");
    await createEvent(action.customer_id, "ACTION_CLICKED", "action_instance", action.action_id);
    return { action_id: action.action_id, status: action.status };
  });
}
