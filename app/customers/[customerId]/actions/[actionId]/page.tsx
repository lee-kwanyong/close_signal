import Link from "next/link";
import { ActionGuide } from "@/components/ActionGuide";
import { AppShell } from "@/components/AppShell";
import { GeneratedAssets } from "@/components/GeneratedAssets";
import { growthSignalApi } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ActionPage({ params }: { params: { customerId: string; actionId: string } }) {
  const [action, assets] = await Promise.all([
    growthSignalApi.getAction(params.actionId),
    growthSignalApi.getActionAssets(params.actionId)
  ]);

  return (
    <AppShell customerId={params.customerId}>
      <div className="topbar">
        <div>
          <div className="eyebrow">Mission Guide</div>
          <h1>미션 실행 가이드</h1>
          <p className="subtle">조언에서 끝나지 않도록, 바로 쓸 수 있는 문구와 체크리스트까지 제공합니다.</p>
        </div>
        <Link className="btn" href={`/customers/${params.customerId}/growth-report`}>리포트로 돌아가기</Link>
      </div>
      <div className="grid two">
        <ActionGuide action={action} />
        <GeneratedAssets assets={assets} />
      </div>
    </AppShell>
  );
}
