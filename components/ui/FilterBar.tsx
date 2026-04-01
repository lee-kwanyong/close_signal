import type { ReactNode } from "react";

type FilterBarProps = {
  children: ReactNode;
  className?: string;
};

export default function FilterBar({
  children,
  className = "",
}: FilterBarProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${className}`}
    >
      <div className="grid gap-3">{children}</div>
    </div>
  );
}