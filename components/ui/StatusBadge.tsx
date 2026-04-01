type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: "default" | "high" | "medium" | "low" | "neutral";
  size?: "sm" | "md";
};

function getToneClass(tone: NonNullable<StatusBadgeProps["tone"]>) {
  switch (tone) {
    case "high":
      return "bg-red-50 text-red-700 ring-red-200";
    case "medium":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "low":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "neutral":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "default":
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function getSizeClass(size: NonNullable<StatusBadgeProps["size"]>) {
  switch (size) {
    case "sm":
      return "px-2.5 py-1 text-xs";
    case "md":
    default:
      return "px-3 py-1.5 text-sm";
  }
}

export default function StatusBadge({
  children,
  tone = "default",
  size = "sm",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ring-1 ${getToneClass(
        tone
      )} ${getSizeClass(size)}`}
    >
      {children}
    </span>
  );
}