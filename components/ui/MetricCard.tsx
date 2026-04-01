import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "danger" | "warning" | "success";
};

function getValueToneClass(tone: NonNullable<MetricCardProps["tone"]>) {
  switch (tone) {
    case "danger":
      return "text-red-600";
    case "warning":
      return "text-amber-600";
    case "success":
      return "text-emerald-600";
    case "default":
    default:
      return "text-slate-900";
  }
}

export default function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${getValueToneClass(tone)}`}>
        {value}
      </div>
      {hint ? <div className="mt-2 text-sm text-slate-500">{hint}</div> : null}
    </div>
  );
}