import Link from "next/link";
import type { ReactNode } from "react";

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function riskTone(value?: string | null) {
  const raw = String(value || "").toLowerCase();

  if (raw.includes("critical")) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  if (raw.includes("high")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (raw.includes("medium")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function riskLabel(value?: string | null) {
  const raw = String(value || "").toLowerCase();

  if (raw.includes("critical")) return "치명적";
  if (raw.includes("high")) return "고위험";
  if (raw.includes("medium")) return "주의";
  if (raw.includes("low")) return "관찰";
  return value || "-";
}

type RankingCardProps = {
  regionCode: string;
  regionName: string;
  categoryId: string | number;
  categoryName: string;
  riskScore: number;
  riskGrade?: string | null;
  signalCount?: number | null;
  businessCount?: number | null;
  changeValue?: number | null;
  scoreDate?: string | null;
  signalTitle?: string | null;
  signalSummary?: string | null;
  signalTypeLabel?: string | null;
  signalTypeTone?: string | null;
  revenueLabel?: string | null;
  revenueTone?: string | null;
  actionText?: string | null;
  detailHref?: string | null;
  writeHref?: string | null;
  monitorHref?: string | null;
  monitorLabel?: string | null;
  action?: ReactNode;
};

export default function RankingCard({
  regionCode,
  regionName,
  categoryId,
  categoryName,
  riskScore,
  riskGrade,
  signalCount,
  businessCount,
  changeValue,
  scoreDate,
  signalTitle,
  signalSummary,
  signalTypeLabel,
  signalTypeTone,
  revenueLabel,
  revenueTone,
  actionText,
  detailHref,
  writeHref,
  monitorHref,
  monitorLabel,
  action,
}: RankingCardProps) {
  const regionCategoryHref = `/regions/${encodeURIComponent(regionCode)}/${encodeURIComponent(
    String(categoryId),
  )}`;

  return (
    <article className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-500">
            {regionName} · {categoryName}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${riskTone(
                riskGrade,
              )}`}
            >
              {riskLabel(riskGrade)}
            </span>

            {signalTypeLabel ? (
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  signalTypeTone || "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                {signalTypeLabel}
              </span>
            ) : null}

            {revenueLabel ? (
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  revenueTone || "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                {revenueLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-500">위험점수</div>
          <div className="mt-1 text-3xl font-bold tracking-[-0.03em] text-slate-950">
            {formatNumber(riskScore)}
          </div>
          <div className="mt-1 text-xs text-slate-500">기준일 {formatDate(scoreDate)}</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">시그널 수</div>
          <div className="mt-1 text-lg font-bold text-slate-950">
            {formatNumber(Number(signalCount || 0))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">사업체 수</div>
          <div className="mt-1 text-lg font-bold text-slate-950">
            {formatNumber(Number(businessCount || 0))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">순변화</div>
          <div
            className={`mt-1 text-lg font-bold ${
              Number(changeValue || 0) < 0 ? "text-rose-700" : "text-slate-950"
            }`}
          >
            {formatNumber(Number(changeValue || 0))}
          </div>
        </div>
      </div>

      {signalTitle || signalSummary || actionText ? (
        <div className="mt-5 rounded-[1.6rem] border border-emerald-100 bg-emerald-50/40 p-4">
          {signalTitle ? (
            <div className="text-sm font-bold text-slate-950">{signalTitle}</div>
          ) : null}

          {signalSummary ? (
            <p className="mt-2 text-sm leading-7 text-slate-600">{signalSummary}</p>
          ) : null}

          {actionText ? (
            <div className="mt-3 rounded-2xl border border-white/70 bg-white px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Action
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-700">{actionText}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {monitorHref ? (
        <div className="mt-5 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/40 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
            Next Step
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            이 조합은 탐지 결과입니다. 실제 개입은 모니터 인테이크로 넘겨 사업장 중심으로
            이어가면 됩니다.
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        {monitorHref ? (
          <Link
            href={monitorHref}
            className="inline-flex items-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            {monitorLabel || "모니터 인테이크"}
          </Link>
        ) : null}

        <Link
          href={regionCategoryHref}
          className="inline-flex items-center rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-emerald-50 hover:text-emerald-800"
        >
          지역·업종 상세
        </Link>

        {detailHref ? (
          <Link
            href={detailHref}
            className="inline-flex items-center rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-emerald-50 hover:text-emerald-800"
          >
            시그널 상세
          </Link>
        ) : null}

        {writeHref ? (
          <Link
            href={writeHref}
            className="inline-flex items-center rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-emerald-50 hover:text-emerald-800"
          >
            이 조합으로 글쓰기
          </Link>
        ) : null}

        {action}
      </div>
    </article>
  );
}