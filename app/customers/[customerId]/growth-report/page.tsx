import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { ComponentScoreGrid } from "@/components/ComponentScoreGrid";
import { DataConfidenceCard } from "@/components/DataConfidenceCard";
import { DiagnosisList } from "@/components/DiagnosisList";
import { DriversPanel } from "@/components/DriversPanel";
import { GrowthScoreHero } from "@/components/GrowthScoreHero";
import { MissionSprint } from "@/components/MissionSprint";
import { CustomerReviewSignalCard } from "@/components/growth/CustomerReviewSignalCard";
import { ClosureRiskActionsPanel } from "@/components/risk/ClosureRiskActionsPanel";
import { ClosureRiskHero } from "@/components/risk/ClosureRiskHero";
import { ClosureRiskSignalsPanel } from "@/components/risk/ClosureRiskSignalsPanel";
import { ReviewDataModuleCard } from "@/components/risk/ReviewDataModuleCard";
import { growthSignalApi } from "@/lib/api";
import { normalizeCustomerId } from "@/lib/customer-id";

export const dynamic = "force-dynamic";

type GrowthReportPageProps = {
  params: {
    customerId: string;
  };
};

function InvalidCustomerIdState() {
  return (
    <AppShell>
      <section className="card">
        <div className="eyebrow">Growth Signal</div>
        <h1>고객 ID가 설정되지 않았습니다</h1>

        <p className="subtle">
          현재 주소의 customerId가 비어 있거나 undefined입니다. 홈으로 돌아가
          1차 위험 체크 또는 데모 고객 설정을 다시 진행해주세요.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 20,
          }}
        >
          <Link className="btn primary" href="/">
            홈으로 돌아가기
          </Link>

          <Link className="btn" href="/care-program">
            2차 케어 프로그램 보기
          </Link>

          <Link className="btn" href="/reviewer">
            Reviewer 보기
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

function ReportLoadErrorState({
  customerId,
  errorMessage,
}: {
  customerId: string;
  errorMessage: string;
}) {
  return (
    <AppShell customerId={customerId}>
      <section className="card">
        <div className="eyebrow">Growth Signal</div>
        <h1>Growth Report를 불러오지 못했습니다</h1>

        <p className="subtle">
          customerId는 정상적으로 들어왔지만, Growth Report 데이터 조회 중
          오류가 발생했습니다.
        </p>

        <div className="card soft" style={{ marginTop: 18 }}>
          <h3>오류 내용</h3>
          <p style={{ wordBreak: "break-all" }}>{errorMessage}</p>
        </div>

        <div className="card soft" style={{ marginTop: 18 }}>
          <h3>확인할 것</h3>
          <p>
            아직 고객 데이터가 없다면 2차 케어 프로그램에서 고객을 생성하거나{" "}
            <code>npm run seed:demo</code>로 데모 고객을 만든 뒤 다시
            확인해주세요. Supabase 환경변수나 DB migration이 누락되어도 이
            화면이 실패할 수 있습니다.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 20,
          }}
        >
          <Link className="btn primary" href="/">
            홈으로 돌아가기
          </Link>

          <Link className="btn" href="/care-program">
            2차 케어 프로그램 보기
          </Link>

          <Link className="btn" href="/reviewer">
            Reviewer 보기
          </Link>

          <Link className="btn" href="/admin/customer-success">
            CS 큐 보기
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

export default async function GrowthReportPage({
  params,
}: GrowthReportPageProps) {
  const customerId = normalizeCustomerId(params.customerId);

  if (!customerId) {
    return <InvalidCustomerIdState />;
  }

  try {
    const [report, diagnoses, sprint] = await Promise.all([
      growthSignalApi.getLatest(customerId),
      growthSignalApi.getDiagnoses(customerId),
      growthSignalApi.getCurrentSprint(customerId),
    ]);

    return (
      <AppShell customerId={customerId}>
        <div className="topbar">
          <div>
            <div className="eyebrow">Growth Signal Report</div>
            <h1>Growth Care Report</h1>

            <p className="subtle">
              1차 위험 체크 이후 결제 고객에게 제공되는 2차 케어 리포트입니다.
              매출, 상권, 경쟁, 리뷰, 운영 데이터를 종합해 현재 성장 신호와
              리스크 신호, 이번 주 실행 액션을 보여줍니다.
            </p>
          </div>
        </div>

        <div className="grid" style={{ gap: 18 }}>
          <ClosureRiskHero risk={report.closure_risk} />

          <div id="growth-risk-signals" className="grid two">
            <ClosureRiskSignalsPanel risk={report.closure_risk} />
            <ClosureRiskActionsPanel risk={report.closure_risk} />
          </div>

          <CustomerReviewSignalCard customerId={customerId} />

          <div id="review-signal-module">
            <ReviewDataModuleCard risk={report.closure_risk} />
          </div>

          <div className="grid two">
            <GrowthScoreHero report={report} />
            <ComponentScoreGrid scores={report.component_scores} />
          </div>

          <DataConfidenceCard report={report} />

          <DriversPanel
            positive={report.positive_drivers}
            negative={report.negative_drivers}
          />

          <div className="grid two">
            <DiagnosisList diagnoses={diagnoses.items} />
            <MissionSprint customerId={customerId} sprint={sprint} />
          </div>
        </div>
      </AppShell>
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

    return (
      <ReportLoadErrorState
        customerId={customerId}
        errorMessage={errorMessage}
      />
    );
  }
}