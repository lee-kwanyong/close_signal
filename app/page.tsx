import Link from "next/link";

import { BusinessRiskQuickCheck } from "@/components/public/BusinessRiskQuickCheck";

export default function HomePage() {
  return (
    <main className="public-landing">
      <section className="public-landing-inner">
        <header className="public-header">
          <div>
            <div className="eyebrow">Growth Signal</div>
            <h1>사업자번호로 먼저 위험 신호를 확인하세요</h1>
            <p className="subtle">
              Growth Signal은 소상공인이 결제하기 전에 “내 가게가 지금
              위험한지”를 먼저 확인하고, 결제 후에는 회복을 위한 2차 케어
              프로그램으로 연결되는 서비스입니다.
            </p>
          </div>

          <div className="public-header-actions">
            <Link className="btn" href="/reviewer">
              Reviewer 보기
            </Link>
            <Link className="btn" href="/admin/customer-success">
              관리자 CS 큐
            </Link>
          </div>
        </header>

        <section className="public-hero-panel">
          <div className="public-hero-text">
            <div className="eyebrow">Step 1 · Free Risk Check</div>
            <h2>1차 위험 신호 확인</h2>
            <p>
              사업자등록번호와 매장 후보를 기준으로 지역, 업종, 경쟁 밀도를
              확인합니다. 이 단계에서는 무료로 위험 신호를 보여주고, 결제
              후에는 상세 케어 리포트와 실행 액션을 제공합니다.
            </p>
          </div>

          <div className="public-risk-steps">
            <article>
              <strong>01</strong>
              <h3>사업자번호 입력</h3>
              <p>고객이 가장 먼저 입력하는 진입점입니다.</p>
            </article>

            <article>
              <strong>02</strong>
              <h3>매장 후보 선택</h3>
              <p>상호명과 지역으로 수집된 매장 데이터를 매칭합니다.</p>
            </article>

            <article>
              <strong>03</strong>
              <h3>1차 위험 신호</h3>
              <p>상권·업종·경쟁 밀도 기반 위험 신호를 보여줍니다.</p>
            </article>

            <article>
              <strong>04</strong>
              <h3>2차 케어 연결</h3>
              <p>결제 후 상세 리포트와 실행 액션으로 이어집니다.</p>
            </article>
          </div>

          <BusinessRiskQuickCheck />
        </section>

        <section className="public-secondary-grid">
          <article className="card public-product-card">
            <div className="eyebrow">Step 2 · Paid Care</div>
            <h2>결제 후 2차 케어 프로그램</h2>
            <p>
              1차 체크에서 위험 신호가 보이면 결제 후 Growth Care 리포트,
              주간 액션, 리뷰/상권/운영 개선 가이드를 제공합니다.
            </p>

            <ul>
              <li>상세 위험 원인 분석</li>
              <li>이번 주 실행 액션 추천</li>
              <li>매출·리뷰·상권 변화 추적</li>
              <li>관리자 또는 CS 케어 연결</li>
            </ul>

            <Link className="btn primary" href="/care-program">
              케어 프로그램 보기
            </Link>
          </article>

          <article className="card public-product-card">
            <div className="eyebrow">Separate Product · Reviewer</div>
            <h2>Reviewer는 따로 운영</h2>
            <p>
              Reviewer는 Growth Signal과 섞지 않는 별도 서비스입니다. 리뷰
              계정 연동, 리뷰 분석, 리뷰 응답 보조를 담당합니다.
            </p>

            <ul>
              <li>네이버/카카오/구글 리뷰 계정 관리</li>
              <li>부정 리뷰 키워드 분석</li>
              <li>리뷰 응답 초안 생성</li>
              <li>리뷰 변화 신호를 Growth Signal에 보조 데이터로 제공</li>
            </ul>

            <Link className="btn" href="/reviewer">
              Reviewer 페이지 보기
            </Link>
          </article>
        </section>
      </section>
    </main>
  );
}