import SignalCard from "@/components/signals/SignalCard";
import EmptyState from "@/components/ui/EmptyState";
import { mapSignalRow, type SignalRow } from "@/lib/mappers/signals";

type SignalListProps = {
  rows: SignalRow[];
  renderAction?: (item: ReturnType<typeof mapSignalRow>, index: number) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
};

export default function SignalList({
  rows,
  renderAction,
  emptyTitle = "조회 결과가 없습니다.",
  emptyDescription = "조건을 변경한 뒤 다시 확인해 주세요.",
}: SignalListProps) {
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
        const item = mapSignalRow(row);

        return (
          <SignalCard
            key={item.id || `${item.regionCode}-${item.categoryId}-${index}`}
            title={item.title}
            body={item.body}
            severity={item.severity}
            createdAt={item.createdAt}
            regionCode={item.regionCode}
            regionName={item.regionName}
            categoryId={item.categoryId}
            categoryName={item.categoryName}
            action={renderAction ? renderAction(item, index) : null}
          />
        );
      })}
    </div>
  );
}