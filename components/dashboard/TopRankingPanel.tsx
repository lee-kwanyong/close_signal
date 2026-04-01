import Link from "next/link";
import SectionCard from "@/components/ui/SectionCard";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  mapRankingRow,
  type RankingRow,
} from "@/lib/mappers/rankings";
import { getRiskTone } from "@/lib/risk";

type TopRankingPanelProps = {
  rows: RankingRow[];
};

export default function TopRankingPanel({
  rows,
}: TopRankingPanelProps) {
  return (
    <SectionCard
      title="상위 리스크 랭킹"
      description="위험도가 높은 지역·업종 조합"
      action={
        <Link
          href="/rankings"
          className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          전체 보기
        </Link>
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          title="표시할 랭킹 데이터가 없습니다."
          description="집계 데이터가 준비되면 이 영역에 상위 랭킹이 표시됩니다."
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((row, index) => {
            const item = mapRankingRow(row);
            const href =
              item.regionCode && item.categoryId !== null
                ? `/regions/${item.regionCode}/${item.categoryId}`
                : "/rankings";

            return (
              <Link
                key={`${item.regionCode}-${item.categoryId}-${index}`}
                href={href}
                className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">
                      {item.regionCode || "-"}
                    </div>
                    <div className="mt-1 text-base font-semibold text-slate-900">
                      {item.regionName}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {item.categoryName}
                    </div>
                  </div>

                  <StatusBadge tone={getRiskTone(item.riskScore)} size="sm">
                    {item.riskScore.toFixed(1)}
                  </StatusBadge>
                </div>

                <div className="mt-3 text-sm text-slate-500">
                  시그널 {item.signalCount}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}