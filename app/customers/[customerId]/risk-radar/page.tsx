import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { ClosureRiskActionsPanel } from "@/components/risk/ClosureRiskActionsPanel";
import { ClosureRiskHero } from "@/components/risk/ClosureRiskHero";
import { ClosureRiskSignalsPanel } from "@/components/risk/ClosureRiskSignalsPanel";
import { ReviewDataModuleCard } from "@/components/risk/ReviewDataModuleCard";
import { growthSignalApi } from "@/lib/api";
import { normalizeCustomerId } from "@/lib/customer-id";

export const dynamic = "force-dynamic";

function InvalidCustomerState() {
  return (
    <AppShell active="risk-radar">
      <section className="card">
        <div className="eyebrow">Risk Radar</div>
        <h1>고객 ID가 설정되지 않았습니다</h1>
        <p className="subtle">
          현재 주소의 customerId가 비어 있거나 undefined입니다. 홈으로 돌아가
          데모 고객 ID를 설정한 뒤 다시 시도해주세요.
        </p>
        <div className="actions-row">
          <Link className="btn primary" href="/">
            홈으로 돌아가기
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

export default async function RiskRadarPage({
  params,
}: {
  params: { customerId: string };
}) {
  const customerId = normalizeCustomerId(params.customerId);

  if (!customerId) {
    return <InvalidCustomerState />;
  }

  try {
    const report = await growthSignalApi.getLatest(customerId);

    return (
      <AppShell customerId={customerId} active="risk-radar">
        <div className="topbar">
          <div>
            <div className="eyebrow">New Engine Track</div>
            <h1>Risk Radar</h1>
            <p className="subtle">
              새로 붙인 엔진은 Growth Report와 분리해서 봅니다. 이 페이지는
              성장 점수가 아니라 사업 안정성을 흔드는 조기 경고 신호에만
              집중합니다.
            </p>
          </div>

          <Link className="btn" href={`/customers/${customerId}/growth-report`}>
            Growth Report로 돌아가기
          </Link>
        </div>

        <div className="grid" style={{ gap: 18 }}>
          <ClosureRiskHero risk={report.closure_risk} />

          <div className="grid two">
            <ClosureRiskSignalsPanel risk={report.closure_risk} />
            <ClosureRiskActionsPanel risk={report.closure_risk} />
          </div>

          <ReviewDataModuleCard risk={report.closure_risk} />
        </div>
      </AppShell>
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

    return (
      <AppShell customerId={customerId} active="risk-radar">
        <section className="card">
          <div className="eyebrow">Risk Radar</div>
          <h1>Risk Radar를 불러오지 못했습니다</h1>
          <p className="subtle">Growth Signal 최신 리포트가 먼저 필요합니다.</p>
          <div className="card soft" style={{ marginTop: 16 }}>
            <h3>오류 내용</h3>
            <p style={{ wordBreak: "break-all" }}>{errorMessage}</p>
          </div>
          <div className="actions-row">
            <Link className="btn primary" href={`/customers/${customerId}/growth-report`}>
              Growth Report로 이동
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }
}
