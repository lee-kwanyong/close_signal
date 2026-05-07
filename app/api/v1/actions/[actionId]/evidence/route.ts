import { NextRequest } from "next/server";
import { db, assertNoError, createEvent } from "@/lib/db/repositories";
import { routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: { actionId: string } }) {
  return routeGuard(async () => {
    const body = await request.json();
    const action = await assertNoError(await db().from("action_instance").select("*").eq("action_id", params.actionId).single(), "getActionForEvidence");
    const evidence = await assertNoError(await db().from("action_evidence").insert({
      action_id: params.actionId,
      customer_id: action.customer_id,
      evidence_type: body.evidence_type ?? "text",
      evidence_text: body.evidence_text ?? null,
      evidence_url: body.evidence_url ?? null,
      evidence_image_url: body.evidence_image_url ?? null,
      verification_level: "L1",
      verification_status: "submitted"
    }).select("*").single(), "submitEvidence");
    await db().from("action_instance").update({ status: "evidence_submitted_l1" }).eq("action_id", params.actionId);
    await createEvent(action.customer_id, "EVIDENCE_SUBMITTED", "action_evidence", evidence.evidence_id);
    return { action_id: params.actionId, evidence_id: evidence.evidence_id, verification_level: "L1", verification_status: "submitted" };
  });
}
