import { db } from "@/lib/db/repositories";
import { fail, routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorize(request: Request) {
  const url = new URL(request.url);
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  return !expected || url.searchParams.get("secret") === expected || auth === `Bearer ${expected}`;
}

export async function GET(request: Request) {
  if (!authorize(request)) return fail("UNAUTHORIZED", "Invalid cron secret", 401);
  return routeGuard(async () => {
    const { data: rows, error } = await db().from("v_customer_growth_overview").select("*").limit(1000);
    if (error) throw new Error(error.message);
    let created = 0;
    for (const row of rows ?? []) {
      if (!row.score_id) continue;
      let segment = "GENERAL_MONITORING";
      let action = "이번 주 미션 진행 상황을 확인하세요.";
      let priority = 50;
      if ((row.growth_leverage_score ?? 0) >= 75 && (row.conversion_readiness_score ?? 100) < 55) {
        segment = "HIGH_LEVERAGE_LOW_CONVERSION";
        action = "플레이스 최적화 미션 완료를 유도하세요.";
        priority = 88;
      } else if (row.cs_intervention_needed) {
        segment = "CS_INTERVENTION_NEEDED";
        action = "고객성공팀이 직접 개입해야 합니다.";
        priority = 82;
      } else if ((row.data_confidence_score ?? 100) < 60) {
        segment = "DATA_POOR";
        action = "지도 URL과 목표 입력을 유도하세요.";
        priority = 70;
      }
      await db().from("customer_success_queue").insert({ customer_id: row.customer_id, score_id: row.score_id, segment_code: segment, priority_score: priority, recommended_internal_action: action });
      created++;
    }
    return { created_rows: created };
  });
}
