import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { growthSignalApi } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function CustomerSuccessPage() {
  const queue = await growthSignalApi.getCustomerSuccessQueue();

  return (
    <AppShell active="customer-success">
      <div className="topbar">
        <div>
          <div className="eyebrow">Customer Success Command Center</div>
          <h1>오늘 도와야 할 고객</h1>
          <p className="subtle">Growth Leverage, Unlock Potential, 실행 반응을 기준으로 우선순위를 정합니다.</p>
        </div>
      </div>

      <section className="card">
        <table className="table">
          <thead>
            <tr>
              <th>고객</th>
              <th>세그먼트</th>
              <th>우선순위</th>
              <th>점수</th>
              <th>Potential</th>
              <th>신뢰도</th>
              <th>내부 액션</th>
            </tr>
          </thead>
          <tbody>
            {queue.items.map((item) => (
              <tr key={item.queue_id}>
                <td><Link href={`/customers/${item.customer_id}/growth-report`}><strong>{item.business_name}</strong></Link></td>
                <td><StatusBadge tone="brand">{item.segment_code}</StatusBadge></td>
                <td><strong>{Math.round(item.priority_score)}</strong></td>
                <td>{item.growth_signal_score ?? "-"}</td>
                <td>{item.unlock_potential_score ? `+${item.unlock_potential_score}` : "-"}</td>
                <td>{item.data_confidence_grade ?? "-"}</td>
                <td>{item.recommended_internal_action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
