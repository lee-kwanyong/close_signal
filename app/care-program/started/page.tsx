import Link from "next/link";

type CareProgramStartedPageProps = {
  searchParams?: {
    leadId?: string;
    customerId?: string;
  };
};

export default function CareProgramStartedPage({
  searchParams,
}: CareProgramStartedPageProps) {
  const leadId = searchParams?.leadId;
  const customerId = searchParams?.customerId;
  const growthReportUrl = customerId
    ? `/customers/${customerId}/growth-report`
    : null;

  return (
    <main className="care-program-page">
      <section className="care-program-inner">
        <header className="care-hero">
          <div>
            <div className="eyebrow">Care Started</div>
            <h1>2차 케어 프로그램이 시작되었습니다</h1>
            <p>
              고객 계정과 Growth Care Report 생성이 완료되었습니다. 이제
              리포트에서 위험 신호와 이번 주 실행 액션을 확인할 수 있습니다.
            </p>
          </div>

          <Link className="btn" href="/">
            홈으로
          </Link>
        </header>

        <section className="care-success-banner">
          <div>
            <div className="eyebrow">Growth Report Ready</div>
            <h2>Growth Care Report 준비 완료</h2>
            <p>
              결제 이후 2차 케어 고객으로 등록되었고, Growth Signal 진단이
              실행되었습니다.
            </p>
          </div>

          <div className="care-success-meta">
            <span>Lead ID</span>
            <strong>{leadId ?? "생성됨"}</strong>
            <span>Customer ID</span>
            <strong>{customerId ?? "생성됨"}</strong>
          </div>
        </section>

        <section className="care-process">
          <article>
            <span>01</span>
            <h3>고객 계정 생성</h3>
            <p>결제 고객을 Growth Signal 고객으로 등록했습니다.</p>
          </article>

          <article>
            <span>02</span>
            <h3>Growth Report 생성</h3>
            <p>매출, 상권, 리뷰, 경쟁 신호 기반 리포트를 생성했습니다.</p>
          </article>

          <article>
            <span>03</span>
            <h3>Reviewer 연결</h3>
            <p>리뷰 데이터를 연결하면 고객 반응 신호가 더 정교해집니다.</p>
          </article>

          <article>
            <span>04</span>
            <h3>실행 액션 확인</h3>
            <p>이번 주 바로 실행할 수 있는 미션을 확인합니다.</p>
          </article>
        </section>

        <section className="care-plan-grid">
          <article className="care-plan-card">
            <div className="eyebrow">Next Action</div>
            <h2>이제 리포트를 확인하세요</h2>
            <p>
              생성된 Growth Care Report에서 점수, 위험 신호, 추천 액션, 리뷰
              신호 연결 상태를 확인할 수 있습니다.
            </p>

            <ul>
              <li>Growth Signal 점수 확인</li>
              <li>위험 신호 확인</li>
              <li>추천 액션 확인</li>
              <li>Reviewer 리뷰 신호 연결</li>
            </ul>
          </article>

          <article className="care-checkout-box">
            <div>
              <div className="eyebrow">Actions</div>
              <h2>바로 이동</h2>
              <p>
                리포트로 이동하거나, Reviewer에서 리뷰를 먼저 수집해 고객 반응
                신호를 보강할 수 있습니다.
              </p>
            </div>

            <div className="care-checkout-actions">
              {growthReportUrl ? (
                <Link className="btn primary" href={growthReportUrl}>
                  Growth Care Report 보기
                </Link>
              ) : null}

              <Link className="btn" href="/reviewer">
                Reviewer 연결하기
              </Link>

              <Link className="btn" href="/admin/customer-success">
                CS 큐 보기
              </Link>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}