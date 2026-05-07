import Link from "next/link";

import { CareProgramCheckoutBox } from "./CareProgramCheckoutBox";

type CareProgramPageProps = {
  searchParams?: {
    businessNumber?: string;
    checkoutStatus?: string;
  };
};

export default function CareProgramPage({
  searchParams,
}: CareProgramPageProps) {
  const businessNumber = searchParams?.businessNumber;
  const checkoutStatus = searchParams?.checkoutStatus;

  return (
    <main className="care-program-page">
      <section className="care-program-inner">
        <header className="care-hero">
          <div>
            <div className="eyebrow">Growth Care Program</div>
            <h1>결제 후 2차 케어 프로그램</h1>
            <p>
              1차 위험 신호 확인 후, 결제 고객에게는 상세 Growth Report와
              이번 주 실행 액션, 리뷰/상권/운영 개선 케어를 제공합니다.
            </p>
          </div>

          <Link className="btn" href="/">
            1차 체크 다시 하기
          </Link>
        </header>

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
            <div className="eyebrow">Basic</div>
            <h2>Growth Care Basic</h2>
            <p>1차 위험 신호 이후 가장 먼저 연결할 기본 케어 플랜입니다.</p>

            <strong className="care-price">월 49,000원</strong>

            <ul>
              <li>상세 Growth Report</li>
              <li>주간 실행 액션 3개</li>
              <li>리뷰/상권 신호 요약</li>
              <li>CS 큐 자동 등록</li>
            </ul>
          </article>

          <CareProgramCheckoutBox
            businessNumber={businessNumber}
            checkoutStatus={checkoutStatus}
          />
        </section>
      </section>
    </main>
  );
}