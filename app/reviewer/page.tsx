import Link from "next/link";

import { ReviewCollectorPanel } from "@/components/reviewer/ReviewCollectorPanel";
import { ReviewInboxPanel } from "@/components/reviewer/ReviewInboxPanel";

export default function ReviewerPage() {
  return (
    <main className="reviewer-page">
      <section className="reviewer-inner">
        <header className="reviewer-hero reviewer-hero-strong">
          <div>
            <div className="eyebrow">Reviewer</div>
            <h1>배달앱·플레이스 리뷰를 한곳에 모으고 답글까지 추천받으세요</h1>
            <p>
              Reviewer는 Growth Signal과 분리된 리뷰 운영 서비스입니다.
              배달의민족, 요기요, 쿠팡이츠, 네이버플레이스, 카카오맵, 구글
              리뷰를 수집하고 부정 키워드, 리뷰 건강도, 답글 추천을 제공합니다.
            </p>
          </div>

          <Link className="btn primary" href="/">
            Growth Signal 홈으로
          </Link>
        </header>

        <section className="reviewer-positioning">
          <article>
            <strong>01</strong>
            <h3>리뷰 전체 수집</h3>
            <p>배달앱, 플레이스, 지도, 구글 리뷰를 플랫폼별로 모읍니다.</p>
          </article>

          <article>
            <strong>02</strong>
            <h3>부정 키워드 분석</h3>
            <p>
              대기시간, 불친절, 가격, 배달 지연, 위생 같은 반복 이슈를
              감지합니다.
            </p>
          </article>

          <article>
            <strong>03</strong>
            <h3>답글 추천</h3>
            <p>리뷰 유형에 맞춰 사과, 공감, 개선 약속형 답글을 추천합니다.</p>
          </article>

          <article>
            <strong>04</strong>
            <h3>Growth Signal 연동</h3>
            <p>
              부정 리뷰 비율과 리뷰 감소 신호를 2차 케어 보조 데이터로
              전달합니다.
            </p>
          </article>
        </section>

        <ReviewCollectorPanel />

        <ReviewInboxPanel />

        <section className="reviewer-separation-card">
          <div>
            <div className="eyebrow">Separation Rule</div>
            <h2>Growth Signal과 Reviewer는 분리합니다</h2>
            <p>
              Growth Signal은 1차 위험 신호와 2차 케어 프로그램입니다.
              Reviewer는 리뷰 운영 도구입니다. 두 서비스는 데이터로 연결될 수
              있지만, 화면과 사용자 목적은 분리합니다.
            </p>
          </div>

          <Link className="btn primary" href="/">
            Growth Signal 홈으로 돌아가기
          </Link>
        </section>
      </section>
    </main>
  );
}