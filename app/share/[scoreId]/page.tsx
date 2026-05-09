import Link from "next/link";
import { db } from "@/lib/db/repositories";

export const dynamic = "force-dynamic";

type SharePageProps = {
  params: { scoreId: string };
};

async function loadShareReport(scoreId: string) {
  const { data: score, error } = await db()
    .from("score_result")
    .select("*")
    .eq("score_id", scoreId)
    .single();

  if (error || !score) {
    return null;
  }

  const { data: customer } = await db()
    .from("customer")
    .select("customer_id,business_name,industry_name,industry_group,address")
    .eq("customer_id", score.customer_id)
    .maybeSingle();

  const { data: actions } = await db()
    .from("action_instance")
    .select("action_id,title,mission_type,expected_total_lift,status")
    .eq("customer_id", score.customer_id)
    .order("assigned_at", { ascending: false })
    .limit(3);

  return {
    score,
    customer,
    actions: actions ?? []
  };
}

export default async function ShareReportPage({ params }: SharePageProps) {
  const report = await loadShareReport(params.scoreId);

  if (!report) {
    return (
      <main className="share-page">
        <section className="share-card">
          <h1>공유 리포트를 찾을 수 없습니다.</h1>
          <Link className="btn" href="/">홈으로</Link>
        </section>
      </main>
    );
  }

  const { score, customer, actions } = report;
  const positive = Array.isArray(score.positive_drivers_json)
    ? score.positive_drivers_json.slice(0, 3)
    : [];
  const negative = Array.isArray(score.negative_drivers_json)
    ? score.negative_drivers_json.slice(0, 3)
    : [];

  return (
    <main className="share-page">
      <section className="share-card">
        <div className="eyebrow">Growth Signal Shared Report</div>
        <h1>{customer?.business_name ?? "사업장"} 성장 진단 요약</h1>
        <p className="subtle">상담 전 고객에게 공유할 수 있는 간단한 성장 리포트입니다.</p>

        <div className="share-score-grid">
          <div className="share-score-main">
            <span>Growth Signal Score</span>
            <strong>{Math.round(Number(score.growth_signal_score ?? 0))}점</strong>
          </div>

          <div>
            <span>도달 가능 점수</span>
            <strong>{Math.round(Number(score.reachable_score ?? 0))}점</strong>
          </div>

          <div>
            <span>개선 가능 점수</span>
            <strong>+{Math.round(Number(score.unlock_potential_score ?? 0))}점</strong>
          </div>

          <div>
            <span>데이터 신뢰도</span>
            <strong>{score.data_confidence_grade}</strong>
          </div>
        </div>

        <div className="grid two" style={{ marginTop: 22 }}>
          <div className="card soft">
            <span className="badge green">좋은 신호</span>
            {positive.length ? (
              positive.map((item: any) => (
                <p key={item.code}>
                  <strong>{item.label}</strong>
                  <br />
                  {item.description}
                </p>
              ))
            ) : (
              <p>상권과 운영 신호는 추가 데이터가 쌓이면 더 구체화됩니다.</p>
            )}
          </div>

          <div className="card soft">
            <span className="badge orange">개선 신호</span>
            {negative.length ? (
              negative.map((item: any) => (
                <p key={item.code}>
                  <strong>{item.label}</strong>
                  <br />
                  {item.description}
                </p>
              ))
            ) : (
              <p>현재 큰 감점 요인은 확인되지 않았습니다.</p>
            )}
          </div>
        </div>

        <div className="card soft" style={{ marginTop: 22 }}>
          <span className="badge brand">이번 주 추천 미션</span>

          <div className="missions" style={{ marginTop: 14 }}>
            {actions.length ? (
              actions.map((action: any) => (
                <div className="mission-card" key={action.action_id}>
                  <div className="mission-top">
                    <h3>{action.title}</h3>
                    <span className="badge green">
                      +{Math.round(Number(action.expected_total_lift ?? 0))}점
                    </span>
                  </div>
                  <p className="subtle">
                    {action.mission_type} · {action.status}
                  </p>
                </div>
              ))
            ) : (
              <p>추천 미션은 리포트 생성 후 표시됩니다.</p>
            )}
          </div>
        </div>

        <div className="actions-row" style={{ marginTop: 24 }}>
          <Link className="btn primary" href={`/customers/${score.customer_id}/growth-report`}>
            상세 리포트 보기
          </Link>
          <span className="btn">PDF 저장: 브라우저 인쇄 메뉴 사용</span>
        </div>
      </section>
    </main>
  );
}
