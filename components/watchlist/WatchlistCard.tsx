import WatchlistCard from "@/components/watchlist/WatchlistCard";
import EmptyState from "@/components/ui/EmptyState";
import { mapWatchlistRow, type WatchlistRow } from "@/lib/mappers/watchlist";

type WatchlistListProps = {
  rows: WatchlistRow[];
  renderAction?: (item: ReturnType<typeof mapWatchlistRow>, index: number) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
};

export default function WatchlistList({
  rows,
  renderAction,
  emptyTitle = "저장된 항목이 없습니다.",
  emptyDescription = "리스크 랭킹이나 시그널 화면에서 관심 항목을 추가해보세요.",
}: WatchlistListProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionHref="/rankings"
        actionLabel="리스크 랭킹 보기"
      />
    );
  }

  return (
    <div className="grid gap-4">
      {rows.map((row, index) => {
        const item = mapWatchlistRow(row);

        return (
          <WatchlistCard
            key={`${item.regionCode}-${item.categoryId}-${item.watchlistId ?? index}`}
            regionCode={item.regionCode}
            regionName={item.regionName}
            categoryId={item.categoryId}
            categoryName={item.categoryName}
            riskScore={item.riskScore}
            riskGrade={item.riskGrade}
            signalCount={item.signalCount}
            scoreDate={item.scoreDate}
            action={renderAction ? renderAction(item, index) : null}
          />
        );
      })}
    </div>
  );
}