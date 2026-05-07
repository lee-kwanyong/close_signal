import { db } from "@/lib/db/repositories";
import { normalizeCustomerId } from "@/lib/customer-id";
import { fail, routeGuard } from "@/lib/utils/response";

export const runtime = "nodejs";

function getEmptySprint() {
  return {
    sprint_id: null,
    sprint_name: "이번 주 성장 스프린트",
    start_date: null,
    end_date: null,
    target_score_lift: 0,
    sprint_status: "expired",
    today_mission: null,
    weekly_missions: [],
  };
}

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
    const { data: sprint, error } = await db()
      .from("growth_sprint")
      .select("*")
      .eq("customer_id", customerId)
      .eq("sprint_status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!sprint) {
      return getEmptySprint();
    }

    const { data: missions, error: missionError } = await db()
      .from("sprint_mission")
      .select("*")
      .eq("sprint_id", sprint.sprint_id)
      .order("day_number", { ascending: true });

    if (missionError) {
      throw new Error(missionError.message);
    }

    const mapped = (missions ?? []).map((mission: any) => ({
      mission_id: mission.mission_id,
      day_number: mission.day_number,
      mission_type: mission.mission_type,
      action_id: mission.action_id,
      title: mission.title,
      expected_lift: Number(mission.expected_lift ?? 0),
      estimated_minutes: mission.estimated_minutes,
      status: mission.status,
    }));

    return {
      sprint_id: sprint.sprint_id,
      sprint_name: sprint.sprint_name,
      start_date: sprint.start_date,
      end_date: sprint.end_date,
      target_score_lift: Number(sprint.target_score_lift ?? 0),
      sprint_status: sprint.sprint_status,
      today_mission:
        mapped.find((mission: any) => mission.status !== "completed") ??
        mapped[0] ??
        null,
      weekly_missions: mapped,
    };
  });
}
