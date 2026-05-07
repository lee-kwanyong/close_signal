import { db } from "@/lib/db/repositories";
import { normalizeCustomerId } from "@/lib/customer-id";
import { fail, routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function GET(
  _: Request,
  { params }: { params: { customerId: string } }
) {
  const customerId = normalizeCustomerId(params.customerId);

  if (!customerId) {
    return fail(
      "INVALID_CUSTOMER_ID",
      "customerId가 비어 있거나 undefined입니다.",
      400,
      { received: params.customerId }
    );
  }

  return routeGuard(async () => {
    const { data: score, error: scoreError } = await db()
      .from("score_result")
      .select("score_id")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (scoreError) {
      throw new Error(scoreError.message);
    }

    if (!score) {
      return { items: [] };
    }

    const { data, error } = await db()
      .from("diagnosis_result")
      .select("*, diagnosis_code_master(title, recommended_action_codes)")
      .eq("customer_id", customerId)
      .eq("score_id", score.score_id)
      .order("severity_score", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return {
      items: (data ?? []).map((diagnosis: any) => ({
        diagnosis_id: diagnosis.diagnosis_id,
        diagnosis_code: diagnosis.diagnosis_code,
        affected_score_area: diagnosis.affected_score_area,
        severity_score: Number(diagnosis.severity_score),
        confidence_score: Number(diagnosis.confidence_score),
        impact_score: Number(diagnosis.impact_score ?? 0),
        customer_message: diagnosis.customer_message,
        title: diagnosis.diagnosis_code_master?.title ?? diagnosis.diagnosis_code,
        recommended_action_codes:
          diagnosis.evidence_json?.recommended_action_codes ??
          diagnosis.diagnosis_code_master?.recommended_action_codes ??
          [],
      })),
    };
  });
}
