import { db, assertNoError, getCustomer, getStoreProfile } from "@/lib/db/repositories";
import { generatedAssetsForAction } from "@/lib/engine/assets";
import { routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: { actionId: string } }) {
  return routeGuard(async () => {
    const action = await assertNoError(await db().from("action_instance").select("*").eq("action_id", params.actionId).single(), "getActionForAssetGen");
    const customer = await getCustomer(action.customer_id);
    const profile = await getStoreProfile(action.customer_id);
    const assets = generatedAssetsForAction(customer, profile, action);
    const created = [];
    for (const asset of assets) {
      const { data, error } = await db().from("generated_asset").insert({
        customer_id: action.customer_id,
        action_id: action.action_id,
        asset_type: asset.asset_type,
        industry_group: customer.industry_group ?? "default",
        title: asset.title,
        content_text: asset.content_text ?? null,
        content_json: asset.content_json ?? {},
        language_code: "ko",
        created_by: "manual_regenerate"
      }).select("*").single();
      if (!error && data) created.push(data);
    }
    return { created_assets: created };
  });
}
