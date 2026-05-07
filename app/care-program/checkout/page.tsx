import Link from "next/link";

type CareProgramCheckoutPageProps = {
  searchParams?: {
    sessionId?: string;
    businessNumber?: string;
    plan?: string;
  };
};

export default function CareProgramCheckoutPage({
  searchParams,
}: CareProgramCheckoutPageProps) {
  const sessionId = searchParams?.sessionId ?? "demo-session";
  const businessNumber = searchParams?.businessNumber;
  const plan = searchParams?.plan ?? "growth-care-basic";

  const doneHref = `/care-program?checkoutStatus=success${
    businessNumber ? `&businessNumber=${businessNumber}` : ""
  }`;

  return (
    <main className="care-program-page">
      <section className="care-program-inner">
        <header className="care-hero">
          <div>
            <div className="eyebrow">Demo Checkout</div>
            <h1>2차 케어 프로그램 결제 화면</h1>
            <p>
              현재는 실제 결제 모듈 연결 전 데모 화면입니다. 실제 결제 모듈을
              붙이면 이 페이지가 결제 승인, 실패, 콜백 처리 화면으로 바뀝니다.
            </p>
          </div>

          <Link className="btn" href="/care-program">
            뒤로가기
          </Link>
        </header>

        <section className="care-checkout-box">
          <h2>결제 정보</h2>

          <div className="care-payment-summary">
            <div>
              <span>세션 ID</span>
              <strong>{sessionId}</strong>
            </div>

            <div>
              <span>플랜</span>
              <strong>{plan}</strong>
            </div>

            <div>
              <span>사업자번호</span>
              <strong>{businessNumber ?? "미입력"}</strong>
            </div>

            <div>
              <span>결제 금액</span>
              <strong>월 49,000원</strong>
            </div>
          </div>

          <div className="care-success-box">
            <strong>다음 연결 예정</strong>
            <p>
              실제 결제 성공 후 customer 생성, store_profile 저장,
              growth-signal/run 실행, Growth Care Report 이동을 연결합니다.
            </p>
          </div>

          <div className="care-checkout-actions">
            <Link className="btn primary" href={doneHref}>
              데모 결제 완료 처리
            </Link>

            <Link className="btn" href="/care-program">
              취소
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}