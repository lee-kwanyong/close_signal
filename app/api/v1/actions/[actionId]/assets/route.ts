import { db, assertNoError } from "@/lib/db/repositories";
import { routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: { actionId: string } }) {
  return routeGuard(async () => {
    const action = await assertNoError(await db().from("action_instance").select("*").eq("action_id", params.actionId).single(), "getActionAssetsAction");
    const { data, error } = await db().from("generated_asset").select("*").eq("action_id", params.actionId).order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return {
      action_id: params.actionId,
      assets: (data ?? []).map((a: any) => ({ asset_id: a.asset_id, asset_type: a.asset_type, title: a.title, content_text: a.content_text, content_json: a.content_json })),
      safety_note: action.metadata_json?.safety_note ?? null
    };
  });
}
