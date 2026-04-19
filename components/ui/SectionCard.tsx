import type { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export default function SectionCard({
  title,
  description,
  action,
  children,
  className = "",
  bodyClassName = "",
}: SectionCardProps) {
  return (
    <section
      className={`rounded-[1.75rem] border border-[#d7ece4] bg-white p-5 shadow-[0_12px_28px_rgba(31,122,99,0.05)] ${className}`}
    >
      {title || description || action ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}

      <div className={bodyClassName}>{children}</div>
    </section>
  );
}