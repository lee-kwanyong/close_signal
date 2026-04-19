import Link from "next/link";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getRiskLabel } from "@/lib/risk";

type WatchlistCardProps = {
  id: string;
  title: string;
  body?: string | null;
  score?: number | null;
  regionCode?: string | null;
  regionLabel?: string | null;
  categoryId?: string | null;
  categoryLabel?: string | null;
  averageRevenue?: number | null;
  changeRate?: number | null;
  riskLevel?: string | null;
};

export default function WatchlistCard({
  id,
  title,
  body,
  score,
  regionCode,
  regionLabel,
  categoryId,
  categoryLabel,
  averageRevenue,
  changeRate,
  riskLevel,
}: WatchlistCardProps) {
  const riskLabel = getRiskLabel(riskLevel);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            {regionCode && regionLabel ? (
              <Link href={`/community/${regionCode}`} className="rounded-full bg-zinc-100 px-2 py-1 hover:bg-zinc-200">
                {regionLabel}
              </Link>
            ) : null}
            {categoryId && categoryLabel ? (
              <Link
                href={regionCode ? `/community/${regionCode}/${categoryId}` : `/signals?category=${categoryId}`}
                className="rounded-full bg-zinc-100 px-2 py-1 hover:bg-zinc-200"
              >
                {categoryLabel}
              </Link>
            ) : null}
          </div>

          <div>
            <Link href={`/signals/${id}`} className="text-lg font-semibold text-zinc-900 hover:underline">
              {title}
            </Link>
            {body ? <p className="mt-1 text-sm text-zinc-600 line-clamp-3">{body}</p> : null}
          </div>
        </div>

        {typeof score === "number" ? (
          <div className="text-right">
            <div className="text-2xl font-bold text-zinc-900">{Math.round(score)}</div>
            <div className="text-xs text-zinc-500">score</div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        {riskLabel ? <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">{riskLabel}</span> : null}
        {typeof averageRevenue === "number" ? (
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">
            평균매출 {formatCurrency(averageRevenue)}
          </span>
        ) : null}
        {typeof changeRate === "number" ? (
          <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-800">
            변화율 {formatPercent(changeRate)}
          </span>
        ) : null}
      </div>
    </article>
  );
}