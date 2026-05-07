import { db, assertNoError, createEvent } from "@/lib/db/repositories";
import { routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";

function mapAction(action: any, template?: any) {
  const meta = action.metadata_json ?? {};
  return {
    action_id: action.action_id,
    customer_id: action.customer_id,
    action_code: action.action_code,
    mission_type: action.mission_type,
    title: action.title,
    description: action.description,
    status: action.status,
    expected_total_lift: Number(action.expected_total_lift ?? 0),
    expected_component_lift: action.expected_component_lift_json ?? {},
    estimated_minutes: meta.estimated_minutes ?? template?.estimated_minutes ?? null,
    guide: meta.guide_json ?? template?.guide_json ?? {},
    safety_note: meta.safety_note ?? template?.safety_note ?? null
  };
}

export async function GET(_: Request, { params }: { params: { actionId: string } }) {
  return routeGuard(async () => {
    const action = await assertNoError(await db().from("action_instance").select("*").eq("action_id", params.actionId).single(), "getAction");
    await createEvent(action.customer_id, "ACTION_VIEWED", "action_instance", action.action_id, null, { source: "api" });
    return mapAction(action);
  });
}
