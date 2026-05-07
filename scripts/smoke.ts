import "./load-env";
import "dotenv/config";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function request(method: string, path: string, body?: unknown) {
  const res = await fetch(`${appUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(`${method} ${path}: ${JSON.stringify(json)}`);
  return json.data;
}

async function main() {
  const customer = await request("POST", "/api/v1/customers", {
    business_number: "1234567890",
    business_name: "성수 파스타 Smoke",
    owner_name: "홍길동",
    industry_name: "서양식 음식점",
    industry_group: "restaurant",
    address: "서울특별시 성동구 성수동1가 1-1",
    road_address: "서울 성동구 성수이로 1",
    opened_at: "2023-05-01"
  });
  await request("PATCH", `/api/v1/customers/${customer.customer_id}/profile`, {
    main_products: "파스타, 리조또",
    customer_goal: "지도 노출 개선",
    differentiation_keywords: ["시그니처 메뉴", "데이트 코스", "포장 가능"]
  });
  await request("POST", `/api/v1/customers/${customer.customer_id}/sync/all`, { business_number: "1234567890", run_score_after: true, create_sprint: true });
  const report = await request("GET", `/api/v1/customers/${customer.customer_id}/growth-signal/latest`);
  const sprint = await request("GET", `/api/v1/customers/${customer.customer_id}/sprints/current`);
  const action = await request("GET", `/api/v1/actions/${sprint.weekly_missions[0].action_id}`);
  const assets = await request("GET", `/api/v1/actions/${action.action_id}/assets`);
  const completed = await request("POST", `/api/v1/actions/${action.action_id}/complete`, { completion_note: "Smoke complete" });
  console.log(JSON.stringify({
    customer_id: customer.customer_id,
    report_url: `${appUrl}/customers/${customer.customer_id}/growth-report`,
    action_url: `${appUrl}/customers/${customer.customer_id}/actions/${action.action_id}`,
    score: report.growth_signal_score,
    mission_count: sprint.weekly_missions.length,
    asset_count: assets.assets.length,
    completed: completed.status
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
