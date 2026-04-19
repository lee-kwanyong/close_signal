"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MobileNavProps = {
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

function navButtonClass(isActive: boolean) {
  return [
    "shrink-0 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition",
    isActive
      ? "border-sky-200 bg-sky-50 text-[#0B5CAB]"
      : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-[#0B5CAB]",
  ].join(" ");
}

function solidButtonClass(isActive: boolean) {
  return [
    "shrink-0 rounded-2xl border px-4 py-2.5 text-sm font-semibold text-white transition",
    isActive
      ? "border-[#084298] bg-[#084298]"
      : "border-[#0B5CAB] bg-[#0B5CAB] hover:border-[#084298] hover:bg-[#084298]",
  ].join(" ");
}

export default function MobileNav({
  isLoggedIn = false,
  isAdmin = false,
}: MobileNavProps) {
  const pathname = usePathname() ?? "/";

  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={navButtonClass(isActivePath(pathname, item.href))}
          >
            {item.label}
          </Link>
        ))}

        {isAdmin ? (
          <Link
            href="/admin/collection"
            className={navButtonClass(isActivePath(pathname, "/admin/collection"))}
          >
            운영
          </Link>
        ) : null}
      </div>

      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto border-t border-slate-100 px-4 py-3 sm:px-6">
        {isLoggedIn ? (
          <>
            <Link
              href="/account"
              className={navButtonClass(isActivePath(pathname, "/account"))}
            >
              내 계정
            </Link>

            <form action="/auth/signout" method="post" className="shrink-0">
              <button type="submit" className={solidButtonClass(false)}>
                로그아웃
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/auth/login"
              className={navButtonClass(isActivePath(pathname, "/auth/login"))}
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