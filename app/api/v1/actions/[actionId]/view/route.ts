import { db, assertNoError, createEvent } from "@/lib/db/repositories";
import { routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: { actionId: string } }) {
  return routeGuard(async () => {
    const action = await assertNoError(await db().from("action_instance").update({ status: "viewed", viewed_at: new Date().toISOString() }).eq("action_id", params.actionId).select("*").single(), "viewAction");
    await createEvent(action.customer_id, "ACTION_VIEWED", "action_instance", action.action_id);
    return { action_id: action.action_id, status: action.status };
  });
}
