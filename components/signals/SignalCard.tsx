import Link from "next/link";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getRiskLabel } from "@/lib/risk";

type SignalCardProps = {
  id: string;
  title: string;
  body?: string | null;
  score: number;
  regionCode?: string | null;
  regionLabel?: string | null;
  categoryId?: string | null;
  categoryLabel?: string | null;
  averageRevenue?: number | null;
  changeRate?: number | null;
  riskLevel?: string | null;
  severityLabel?: string | null;
};

function scoreTone(score: number) {
  if (score >= 80) {
    return {
      ring: "ring-rose-200",
      bg: "bg-rose-50",
      text: "text-rose-700",
      soft: "from-rose-50 to-white",
    };
  }

  if (score >= 60) {
    return {
      ring: "ring-amber-200",
      bg: "bg-amber-50",
      text: "text-amber-700",
      soft: "from-amber-50 to-white",
    };
  }

  if (score >= 40) {
    return {
      ring: "ring-sky-200",
      bg: "bg-sky-50",
      text: "text-sky-700",
      soft: "from-sky-50 to-white",
    };
  }

  return {
    ring: "ring-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    soft: "from-emerald-50 to-white",
  };
}

export default function SignalCard({
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
  severityLabel,
}: SignalCardProps) {
  const riskLabel = getRiskLabel(riskLevel);
  const tone = scoreTone(score);

  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:p-6">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.soft} opacity-70`} />
      <div className="relative">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {regionCode && regionLabel ? (
                <Link
                  href={`/community/${regionCode}`}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {regionLabel}
                </Link>
              ) : null}

              {categoryId && categoryLabel ? (
                <Link
                  href={
                    regionCode
                      ? `/community/${regionCode}/${categoryId}`
                      : `/signals?category=${categoryId}`
                  }
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {categoryLabel}
                </Link>
              ) : null}

              {severityLabel ? (
                <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                  {severityLabel}
                </span>
              ) : null}

              {riskLabel ? (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                  {riskLabel}
                </span>
              ) : null}
            </div>

            <div className="mt-4">
              <Link
                href={`/signals/${id}`}
                className="text-lg font-bold tracking-tight text-slate-950 transition group-hover:text-emerald-700"
              >
                {title}
              </Link>

              {body ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 line-clamp-3">
                  {body}
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {typeof averageRevenue === "number" ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  평균매출 {formatCurrency(averageRevenue)}
                </span>
              ) : null}

              {typeof changeRate === "number" ? (
                <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
                  변화율 {formatPercent(changeRate)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="shrink-0">
            <div
              className={`flex min-w-[110px] flex-col items-center rounded-[24px] border bg-white px-5 py-4 text-center shadow-sm ring-1 ${tone.ring}`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                score
              </div>
              <div className={`mt-1 text-3xl font-extrabold tracking-tight ${tone.text}`}>
                {Math.round(score)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}