import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-[#d7ece4] bg-white p-8 text-center shadow-[0_12px_28px_rgba(31,122,99,0.04)]">
      <div className="mx-auto inline-flex rounded-full border border-[#b7e2d3] bg-[#eef9f4] px-3 py-1 text-xs font-semibold text-[#1f7a63]">
        EMPTY
      </div>

      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>

      {description ? (
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      ) : null}

      {(actionHref && actionLabel) || (secondaryHref && secondaryLabel) ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {actionHref && actionLabel ? (
            <Link
              href={actionHref}
              className="inline-flex h-10 items-center rounded-xl border border-[#b7e2d3] bg-[#e7f7f1] px-4 text-sm font-medium text-[#1f7a63] transition hover:bg-[#dcf2e9]"
            >
              {actionLabel}
            </Link>
          ) : null}

          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className="inline-flex h-10 items-center rounded-xl border border-[#cce4db] bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-[#f4fbf8] hover:text-[#1f7a63]"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}