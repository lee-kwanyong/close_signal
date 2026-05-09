"use client";

import Link from "next/link";
import type { GrowthSignalLatestDto } from "@/lib/dto";

export function ShareReportCard({ report }: { report: GrowthSignalLatestDto }) {
  const shareUrl = `/share/${report.score_id}`;

  return (
    <section className="card soft">
      <div className="eyebrow">Share</div>
      <h2>공유용 요약 리포트</h2>
      <p>
        상담 전 고객에게 보낼 수 있는 간단한 리포트입니다.
        점수, 좋은 신호, 개선 신호, 이번 주 미션 중심으로 보여줍니다.
      </p>

      <div className="actions-row">
        <Link className="btn primary" href={shareUrl} target="_blank">
          공유 리포트 열기
        </Link>

        <button
          className="btn"
          type="button"
          onClick={() => {
            const url = `${window.location.origin}${shareUrl}`;
            navigator.clipboard?.writeText(url);
          }}
        >
          공유 링크 복사
        </button>
      </div>
    </section>
  );
}
