import "./load-env";
import "dotenv/config";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function post(path: string, body: unknown) {
  const res = await fetch(`${appUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(`${path}: ${JSON.stringify(json)}`);
  return json.data;
}

async function patch(path: string, body: unknown) {
  const res = await fetch(`${appUrl}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(`${path}: ${JSON.stringify(json)}`);
  return json.data;
}

async function main() {
  const customer = await post("/api/v1/customers", {
    business_number: "1234567890",
    business_name: "성수 파스타",
    owner_name: "홍길동",
    industry_code: "I56114",
    industry_name: "서양식 음식점",
    industry_group: "restaurant",
    address: "서울특별시 성동구 성수동1가 1-1",
    road_address: "서울 성동구 성수이로 1",
    opened_at: "2023-05-01",
    store_count: 1
  });

  await patch(`/api/v1/customers/${customer.customer_id}/profile`, {
    store_type: "offline",
    main_channel: "naver_place",
    customer_goal: "리뷰와 예약 문의를 늘리고 싶어요.",
    target_customer: "성수동 직장인, 데이트 고객",
    main_products: "파스타, 리조또, 와인",
    differentiation_keywords: ["데이트 코스", "시그니처 메뉴", "조용한 분위기"],
    avg_monthly_sales_self_reported: 30000000,
    avg_ticket_size_self_reported: 22000,
    employee_count: 4
  });

  const sync = await post(`/api/v1/customers/${customer.customer_id}/sync/all`, {
    business_number: "1234567890",
    platforms: ["naver", "kakao", "google"],
    run_score_after: true,
    create_sprint: true
  });

  console.log(JSON.stringify({
    customer_id: customer.customer_id,
    growth_report_url: `${appUrl}/customers/${customer.customer_id}/growth-report`,
    admin_url: `${appUrl}/admin/customer-success`,
    score: sync.score?.growth_signal_score
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
