import Link from "next/link";
import { db } from "@/lib/db/repositories";

export const dynamic = "force-dynamic";

type RecentCustomer = {
  customer_id: string;
  business_name: string | null;
  industry_group: string | null;
  created_at: string | null;
};

async function loadRecentCustomers(): Promise<RecentCustomer[]> {
  try {
    const { data, error } = await db()
      .from("customer")
      .select("customer_id,business_name,industry_group,created_at")
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) return [];
    return (data ?? []) as RecentCustomer[];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const demoCustomerId = process.env.NEXT_PUBLIC_DEMO_CUSTOMER_ID;
  const recentCustomers = await loadRecentCustomers();
  const firstCustomer = recentCustomers[0];

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 56px",
        background:
          "radial-gradient(circle at top left, rgba(51,92,255,0.10), transparent 34%), #f6f7fb"
      }}
    >
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gap: 24
        }}
      >
        <div
          className="card"
          style={{
            padding: 34,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, 0.75fr)",
            gap: 28,
            alignItems: "center"
          }}
        >
          <div>
            <div className="eyebrow">Growth Signal 300 Cloud</div>

            <h1 style={{ fontSize: 44, maxWidth: 760 }}>
              소상공인 성장 신호를 점수화하고, 이번 주 실행 미션까지 추천합니다.
            </h1>

            <p className="subtle" style={{ fontSize: 16, maxWidth: 760 }}>
              Supabase, Node.js, Vercel 기준으로 작동하는 Growth Signal 300입니다.
              고객의 상권, 경쟁, 디지털 발견성, 전환 준비도, 실행 속도를 분석하고
              바로 실행할 수 있는 성장 미션을 생성합니다.
            </p>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 24
              }}
            >
              {demoCustomerId ? (
                <Link
                  className="btn primary"
                  href={`/customers/${demoCustomerId}/growth-report`}
                >
                  데모 리포트 보기
                </Link>
              ) : null}

              {firstCustomer ? (
                <Link
                  className="btn primary"
                  href={`/customers/${firstCustomer.customer_id}/growth-report`}
                >
                  최신 고객 리포트 보기
                </Link>
              ) : null}

              <Link className="btn" href="/admin/customer-success">
                고객성공 화면
              </Link>
            </div>
          </div>

          <div
            className="card soft"
            style={{
              boxShadow: "none",
              display: "grid",
              gap: 14
            }}
          >
            <div>
              <div className="eyebrow">현재 작동 플로우</div>
              <h2 style={{ marginTop: 6 }}>300점 엔진 구성</h2>
            </div>

            <div className="timeline">
              <div className="timeline-item">
                <span className="dot" />
                <div>
                  <strong>1. 고객 생성</strong>
                  <p>사업장, 업종, 주소, 목표 정보를 저장합니다.</p>
                </div>
              </div>

              <div className="timeline-item">
                <span className="dot" />
                <div>
                  <strong>2. Sync / Score</strong>
                  <p>상권, 경쟁, 지도, 행동 데이터를 기반으로 점수를 계산합니다.</p>
                </div>
              </div>

              <div className="timeline-item">
                <span className="dot" />
                <div>
                  <strong>3. Mission</strong>
                  <p>이번 주 실행할 성장 미션 3개와 실행물을 생성합니다.</p>
                </div>
              </div>

              <div className="timeline-item">
                <span className="dot" />
                <div>
                  <strong>4. CS Queue</strong>
                  <p>우리가 먼저 도와야 할 고객을 우선순위로 정리합니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid three">
          <div className="card soft">
            <span className="badge brand">Score</span>
            <h3 style={{ marginTop: 14 }}>Growth Signal Score</h3>
            <p>
              상권기회, 경쟁포지션, 디지털발견, 전환준비, 신뢰반응,
              실행속도, 운영기본 점수를 합산합니다.
            </p>
          </div>

          <div className="card soft">
            <span className="badge green">Action</span>
            <h3 style={{ marginTop: 14 }}>이번 주 성장 미션</h3>
            <p>
              Quick Win, High Impact, Trust Builder 구조로 고객이 바로 실행할 수
              있는 미션을 추천합니다.
            </p>
          </div>

          <div className="card soft">
            <span className="badge purple">Learning</span>
            <h3 style={{ marginTop: 14 }}>Action Outcome Learning</h3>
            <p>
              액션 완료, 증빙, 점수 변화, 다음 액션 완료 여부를 저장해 추천
              정책을 개선합니다.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="topbar" style={{ marginBottom: 14 }}>
            <div>
              <div className="eyebrow">최근 생성 고객</div>
              <h2>리포트 바로가기</h2>
            </div>
            <Link className="btn" href="/admin/customer-success">
              CS 큐 보기
            </Link>
          </div>

          {recentCustomers.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>고객</th>
                  <th>업종 그룹</th>
                  <th>생성일</th>
                  <th>리포트</th>
                </tr>
              </thead>
              <tbody>
                {recentCustomers.map((customer) => (
                  <tr key={customer.customer_id}>
                    <td>
                      <strong>{customer.business_name ?? "이름 없음"}</strong>
                    </td>
                    <td>{customer.industry_group ?? "-"}</td>
                    <td>
                      {customer.created_at
                        ? new Date(customer.created_at).toLocaleString("ko-KR")
                        : "-"}
                    </td>
                    <td>
                      <Link
                        className="btn"
                        href={`/customers/${customer.customer_id}/growth-report`}
                      >
                        리포트 열기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">
              아직 생성된 고객이 없습니다. <code>npm run seed:demo</code> 또는{" "}
              <code>npm run smoke</code>를 실행하면 고객 리포트가 생성됩니다.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
