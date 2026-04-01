import Link from "next/link";

type NavItem = {
  href: string;
  label: string;
  badge?: number;
};

type TopNavProps = {
  items: NavItem[];
};

export default function TopNav({ items }: TopNavProps) {
  return (
    <nav className="hidden items-center gap-2 md:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <span>{item.label}</span>
          {item.badge && item.badge > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}