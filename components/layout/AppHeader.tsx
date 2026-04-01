import Link from "next/link";

const navItems = [
  { href: "/", label: "대시보드" },
  { href: "/rankings", label: "리스크 랭킹" },
  { href: "/signals", label: "시그널" },
  { href: "/watchlist", label: "관심목록" },
];

export default function AppHeader() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        backdropFilter: "blur(12px)",
        background: "rgba(243,244,246,0.88)",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "#111827",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "#0f172a",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            CS
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
            }}
          >
            Close Signal
          </div>
        </Link>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                textDecoration: "none",
                color: "#374151",
                fontSize: 14,
                fontWeight: 600,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid transparent",
                background: "transparent",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/login"
            style={{
              textDecoration: "none",
              height: 40,
              padding: "0 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: "#111827",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            로그인
          </Link>
        </div>
      </div>
    </header>
  );
}