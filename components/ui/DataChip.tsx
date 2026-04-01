import type { ReactNode } from "react";

type DataChipProps = {
  children: ReactNode;
  tone?: "default" | "danger" | "warning" | "success" | "neutral";
};

function getToneClass(tone: NonNullable<DataChipProps["tone"]>) {
  switch (tone) {
    case "danger":
      return "bg-red-50 text-red-700";
    case "warning":
      return "bg-amber-50 text-amber-700";
    case "success":
      return "bg-emerald-50 text-emerald-700";
    case "neutral":
      return "bg-slate-100 text-slate-700";
    case "default":
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function DataChip({
  children,
  tone = "default",
}: DataChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${getToneClass(
        tone
      )}`}
    >
      {children}
    </span>
  );
}