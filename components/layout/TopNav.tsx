"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TopNavProps = {
  isLoggedIn?: boolean;
  isAdmin?: boolean;
};

type NavItem = {
  href: string;
  label: string;
};

const primaryNav: NavItem[] = [
  { href: "/", label: "홈" },
  { href: "/monitors", label: "모니터" },
  { href: "/rankings", label: "랭킹" },
  { href: "/signals", label: "시그널" },
  { href: "/business-check", label: "사업자조회" },
  { href: "/market-check", label: "외부검증" },
  { href: "/community", label: "커뮤니티" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClass(isActive: boolean) {
  return [
    "inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition",
    isActive
      ? "border border-sky-200 bg-sky-50 text-[#0B5CAB] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
      : "text-slate-700 hover:bg-white hover:text-[#0B5CAB]",
  ].join(" ");
}

function ghostButtonClass(isActive: boolean) {
  return [
    "inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition",
    isActive
      ? "border-sky-200 bg-sky-50 text-[#0B5CAB]"
      : "border-slate-300 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-[#0B5CAB]",
  ].join(" ");
}

function solidButtonClass(isActive: boolean) {
  return [
    "inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(11,92,171,0.16)] transition",
    isActive
      ? "border-[#084298] bg-[#084298]"
      : "border-[#0B5CAB] bg-[#0B5CAB] hover:border-[#084298] hover:bg-[#084298]",
  ].join(" ");
}

export default function TopNav({
  isLoggedIn = false,
  isAdmin = false,
}: TopNavProps) {
  const pathname = usePathname() ?? "/";

  return (
    <div className="flex items-center gap-4">
      <nav className="min-w-0">
        <div className="flex min-w-0 items-center gap-2 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_24px_rgba(15,23,42,0.05)]">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(isActivePath(pathname, item.href))}
            >
              {item.label}
            </Link>
          ))}

          {isAdmin ? (
            <Link
              href="/admin/collection"
              className={navLinkClass(isActivePath(pathname, "/admin/collection"))}
            >
              운영
            </Link>
          ) : null}
        </div>
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        {isLoggedIn ? (
          <>
            <Link
              href="/account"
              className={ghostButtonClass(isActivePath(pathname, "/account"))}
            >
              내 계정
            </Link>

            <form action="/auth/signout" method="post">
              <button type="submit" className={solidButtonClass(false)}>
                로그아웃
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/auth/login"
              className={ghostButtonClass(isActivePath(pathname, "/auth/login"))}
            >
              로그인
            </Link>

            <Link
              href="/auth/signup"
              className={solidButtonClass(isActivePath(pathname, "/auth/signup"))}
            >
              회원가입
            </Link>
          </>
        )}
      </div>
    </div>
  );
}