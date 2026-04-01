import MetricCard from "@/components/ui/MetricCard";

type SummaryGridProps = {
  totalRegions: number;
  totalCategories: number;
  rankingCount: number;
  signalCount: number;
};

export default function SummaryGrid({
  totalRegions,
  totalCategories,
  rankingCount,
  signalCount,
}: SummaryGridProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="집계 지역 수" value={totalRegions} />
      <MetricCard label="집계 업종 수" value={totalCategories} />
      <MetricCard label="리스크 랭킹 수" value={rankingCount} />
      <MetricCard label="감지 시그널 수" value={signalCount} />
    </section>
  );
}