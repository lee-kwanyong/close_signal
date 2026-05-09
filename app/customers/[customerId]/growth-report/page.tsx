import { AppShell } from "@/components/AppShell";
import { ComponentScoreGrid } from "@/components/ComponentScoreGrid";
import { DataConfidenceCard } from "@/components/DataConfidenceCard";
import { DiagnosisList } from "@/components/DiagnosisList";
import { DriversPanel } from "@/components/DriversPanel";
import { GrowthScoreHero } from "@/components/GrowthScoreHero";
import { MissionSprint } from "@/components/MissionSprint";
import { ScoreHistoryCard } from "@/components/ScoreHistoryCard";
import { ScoreReasonPanel } from "@/components/ScoreReasonPanel";
import { ShareReportCard } from "@/components/ShareReportCard";
import { growthSignalApi } from "@/lib/api";

export const dynamic = "force-dynamic";

async function getScoreHistory(customerId: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  try {
    const response = await fetch(`${baseUrl}/api/v1/customers/${customerId}/score-history`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return { items: [] };
    }

    const envelope = await response.json();
    return envelope.data ?? { items: [] };
  } catch {
    return { items: [] };
  }
}

export default async function GrowthReportPage({
  params
}: {
  params: { customerId: string };
}) {
  const customerId = params.customerId;

  const [report, diagnoses, sprint, history] = await Promise.all([
    growthSignalApi.getLatest(customerId),
    growthSignalApi.getDiagnoses(customerId),
    growthSignalApi.getCurrentSprint(customerId),
    getScoreHistory(customerId)
  ]);

  return (
    <AppShell customerId={customerId}>
      <div className="topbar">
        <div>
          <div className="eyebrow">Growth Signal Report</div>
          <h1>오늘은 이 미션 하나만 완료하면 됩니다.</h1>
          <p className="subtle">
            점수는 평가가 아니라, 올릴 수 있는 성장 루프입니다.
          </p>
        </div>
      </div>

      <div className="grid" style={{ gap: 18 }}>
        <GrowthScoreHero report={report} />

        <ScoreReasonPanel report={report} diagnoses={diagnoses.items} />

        <div className="grid two">
          <ComponentScoreGrid scores={report.component_scores} />
          <DataConfidenceCard report={report} />
        </div>

        <DriversPanel
          positive={report.positive_drivers}
          negative={report.negative_drivers}
        />

        <div className="grid two">
          <DiagnosisList diagnoses={diagnoses.items} />
          <MissionSprint customerId={customerId} sprint={sprint} />
        </div>

        <div className="grid two">
          <ScoreHistoryCard history={history.items ?? []} />
          <ShareReportCard report={report} />
        </div>
      </div>
    </AppShell>
  );
}
