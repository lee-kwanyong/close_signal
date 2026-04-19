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
      className={`rounded-[1.5rem] border border-[#d7ece4] bg-white p-4 sm:p-5 shadow-[0_10px_24px_rgba(31,122,99,0.04)] ${className}`}
    >
      <div className="grid gap-3">{children}</div>
    </div>
  );
}