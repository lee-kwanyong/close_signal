import Link from "next/link";
import SectionCard from "@/components/ui/SectionCard";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  mapSignalRow,
  type SignalRow,
} from "@/lib/mappers/signals";
import { getSeverityLabel, getSeverityTone } from "@/lib/risk";

type RecentSignalPanelProps = {
  rows: SignalRow[];
};

export default function RecentSignalPanel({
  rows,
}: RecentSignalPanelProps) {
  return (
    <SectionCard
      title="최근 시그널"
      description="최근 감지된 이상 징후"
      action={
        <Link
          href="/signals"
          className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          전체 보기
        </Link>
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          title="표시할 시그널 데이터가 없습니다."
          description="새 시그널이 감지되면 이 영역에 표시됩니다."
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((row, index) => {
            const item = mapSignalRow(row);
            const href =
              item.regionCode && item.categoryId !== null
                ? `/regions/${item.regionCode}/${item.categoryId}`
                : "/signals";

            return (
              <Link
                key={`${item.id}-${index}`}
                href={href}
                className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={getSeverityTone(item.severity)} size="sm">
                    {getSeverityLabel(item.severity)}
                  </StatusBadge>
                  <span className="text-xs text-slate-500">{item.createdAt}</span>
                </div>

                <div className="mt-3 text-base font-semibold text-slate-900">
                  {item.title}
                </div>

                <div className="mt-2 text-sm text-slate-500">
                  {item.regionName} · {item.categoryName}
                </div>

                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">
                  {item.body}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}