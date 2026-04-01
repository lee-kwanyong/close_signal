import Link from "next/link";

type NavItem = {
  href: string;
  label: string;
  badge?: number;
};

type MobileNavProps = {
  items: NavItem[];
};

export default function MobileNav({ items }: MobileNavProps) {
  return (
    <div className="border-t border-slate-100 bg-white md:hidden">
      <div className="mx-auto flex h-12 w-full max-w-7xl items-center gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <span>{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}