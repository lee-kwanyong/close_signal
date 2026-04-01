import RankingCard from "@/components/rankings/RankingCard";
import EmptyState from "@/components/ui/EmptyState";
import { mapRankingRow, type RankingRow } from "@/lib/mappers/rankings";

type RankingListProps = {
  rows: RankingRow[];
  renderAction?: (item: ReturnType<typeof mapRankingRow>, index: number) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
};

export default function RankingList({
  rows,
  renderAction,
  emptyTitle = "조회 결과가 없습니다.",
  emptyDescription = "검색 조건을 조정한 뒤 다시 확인해 주세요.",
}: RankingListProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {rows.map((row, index) => {
        const item = mapRankingRow(row);

        return (
          <RankingCard
            key={`${item.regionCode}-${item.categoryId}-${index}`}
            regionCode={item.regionCode}
            regionName={item.regionName}
            categoryId={item.categoryId}
            categoryName={item.categoryName}
            riskScore={item.riskScore}
            riskGrade={item.riskGrade}
            signalCount={item.signalCount}
            businessCount={item.businessCount}
            changeValue={item.changeValue}
            scoreDate={item.scoreDate}
            action={renderAction ? renderAction(item, index) : null}
          />
        );
      })}
    </div>
  );
}