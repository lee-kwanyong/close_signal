import Link from "next/link";

import { CareProgramStartPanel } from "./CareProgramStartPanel";

export const dynamic = "force-dynamic";

type CareProgramPageProps = {
  searchParams?: {
    businessNumber?: string;
    checkoutStatus?: string;
    sessionId?: string;
    plan?: string;
  };
};

function onlyDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function buildDemoCheckoutHref(businessNumber?: string) {
  const normalizedBusinessNumber = onlyDigits(businessNumber);
  const sessionId = `demo_${Date.now()}`;

  const params = new URLSearchParams({
    checkoutStatus: "success",
    sessionId,
    plan: "growth-care-basic",
  });

  if (normalizedBusinessNumber) {
    params.set("businessNumber", normalizedBusinessNumber);
  }

  return `/care-program?${params.toString()}`;
}

export default function CareProgramPage({
  searchParams,
}: CareProgramPageProps) {
  const businessNumber = onlyDigits(searchParams?.businessNumber);
  const checkoutStatus = searchParams?.checkoutStatus;
  const sessionId = searchParams?.sessionId;
  const plan = searchParams?.plan ?? "growth-care-basic";

  const isCheckoutSuccess = checkoutStatus === "success";
  const demoCheckoutHref = buildDemoCheckoutHref(businessNumber);

  return (
    <main className="care-program-page">
      <section className="care-program-inner">
        <header className="care-hero">
          <div>
            <div className="eyebrow">Growth Care Program</div>
            <h1>결제 후 2차 케어 프로그램</h1>
            <p>
              1차 위험 신호 확인 후, 결제 고객에게는 상세 Growth Report와 이번
              주 실행 액션, 리뷰·상권·운영 개선 케어를 제공합니다.
            </p>

            {businessNumber ? (
              <p className="care-hero-meta">
                연결된 사업자번호: <strong>{businessNumber}</strong>
              </p>
            ) : null}
          </div>

          <div className="care-hero-actions">
            <Link className="btn" href="/">
              1차 체크 다시 하기
            </Link>

            <Link className="btn" href="/reviewer">
              Reviewer 보기
            </Link>
          </div>
        </header>

        {isCheckoutSuccess ? (
          <section className="care-success-banner">
            <div>
              <div className="eyebrow">Payment Complete</div>
              <h2>데모 결제가 완료되었습니다</h2>
              <p>
                실제 결제 모듈 연결 전 단계입니다. 이제 2차 케어 리드를
                생성하고, 다음 단계에서 Growth Report와 CS 큐를 연결합니다.
              </p>
            </div>

            <div className="care-success-meta">
              <span>세션 ID</span>
              <strong>{sessionId ?? "demo-session"}</strong>
              <span>플랜</span>
              <strong>{plan}</strong>
            </div>
          </section>
        ) : null}

        <section className="care-process">
          <article>
            <span>01</span>
            <h3>상세 Growth Report</h3>
            <p>
              단순 점수가 아니라 어떤 신호 때문에 위험이 커졌는지 매출, 리뷰,
              상권, 경쟁, 운영 영역별로 보여줍니다.
            </p>
          </article>

          <article>
            <span>02</span>
            <h3>이번 주 실행 액션</h3>
            <p>
              리뷰 회복, 점심시간 매출 개선, 경쟁 매장 대비 차별화처럼 바로
              실행 가능한 액션을 제안합니다.
            </p>
          </article>

          <article>
            <span>03</span>
            <h3>리뷰·상권 데이터 보강</h3>
            <p>
              Reviewer 또는 리뷰 신호 데이터를 연결하면 고객 반응 변화를 더
              정확하게 추적할 수 있습니다.
            </p>
          </article>

          <article>
            <span>04</span>
            <h3>관리자 케어 연결</h3>
            <p>
              위험 구간 고객은 CS 큐에 올라가고, 관리자는 우선순위에 따라
              케어할 수 있습니다.
            </p>
          </article>
        </section>

        <section className="care-plan-grid">
          <article className="care-plan-card">
            <div className="eyebrow">Basic Plan</div>
            <h2>Growth Care Basic</h2>
            <p>
              1차 위험 신호 이후 가장 먼저 연결할 기본 케어 플랜입니다.
            </p>

            <strong className="care-price">월 49,000원</strong>

            <ul>
              <li>상세 Growth Report</li>
              <li>주간 실행 액션 3개</li>
              <li>리뷰·상권 신호 요약</li>
              <li>CS 큐 자동 등록</li>
              <li>Reviewer 리뷰 신호 연동</li>
            </ul>
          </article>

          <CareProgramStartPanel
            businessNumber={businessNumber}
            checkoutStatus={checkoutStatus}
            sessionId={sessionId}
            plan={plan}
            demoCheckoutHref={demoCheckoutHref}
          />
        </section>

        <section className="growth-review-card">
          <div className="growth-review-head">
            <div>
              <div className="eyebrow">Growth Signal · Review Signal</div>
              <h2>리뷰 신호 요약</h2>
              <p>
                Reviewer에서 수집한 리뷰를 주간 지표로 변환하면 여기에 고객
                반응 신호가 표시됩니다.
              </p>
            </div>

            <span className="growth-review-status empty">데이터 대기</span>
          </div>

          <div className="growth-review-summary-box">
            <h3>Reviewer 지표 생성 후 연결됩니다</h3>
            <p>
              Reviewer에서 리뷰를 수집한 뒤 “Growth Signal 지표 생성”을
              실행하면 review_weekly_stats와 review_issue_snapshots에 저장된
              리뷰 신호를 2차 케어 리포트에서 활용할 수 있습니다.
            </p>
          </div>

          <div className="growth-review-metrics">
            <div>
              <strong>-</strong>
              <span>최근 주 리뷰 수</span>
            </div>

            <div>
              <strong>-</strong>
              <span>리뷰 감소율</span>
            </div>

            <div>
              <strong>-</strong>
              <span>부정 리뷰 비율</span>
            </div>

            <div>
              <strong>-</strong>
              <span>평균 평점</span>
            </div>
          </div>

          <div className="care-review-actions">
            <Link className="btn primary" href="/reviewer">
              Reviewer에서 리뷰 수집하기
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}