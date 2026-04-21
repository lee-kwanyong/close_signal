import Link from "next/link";

const consumerNavItems = [
  { href: "/", label: "대시보드" },
  { href: "/rankings", label: "출점·위험 랭킹" },
  { href: "/signals", label: "상권 변화 신호" },
  { href: "/watchlist", label: "관심 후보지" },
];

const hqNavItem = { href: "/hq", label: "본사운영" };

export default function AppHeader() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        backdropFilter: "blur(12px)",
        background: "rgba(255,255,255,0.92)",
        borderBottom: "1px solid #E5E7EB",
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
              width: 42,
              height: 42,
              borderRadius: 14,
              background: "#169BF4",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: "0 10px 24px rgba(22,155,244,0.22)",
            }}
          >
            CS
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: "#0F172A",
                lineHeight: 1.1,
                whiteSpace: "nowrap",
              }}
            >
              Close Signal
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 12,
                color: "#64748B",
                whiteSpace: "nowrap",
              }}
            >
              대시보드는 소개, 데이터 확인은 랭킹·시그널
            </div>
          </div>
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
            marginLeft: "auto",
          }}
        >
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            {consumerNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: "none",
                  color: "#334155",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "10px 12px",
                  borderRadius: 12,
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
              width: 1,
              height: 28,
              background: "#E5E7EB",
            }}
          />

          <Link
            href={hqNavItem.href}
            style={{
              textDecoration: "none",
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid #BFDBFE",
              background: "#EFF6FF",
              color: "#0A6FD6",
              display: "inline-flex",
              alignItems: "center",
              fontSize: 14,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {hqNavItem.label}
          </Link>

          <Link
            href="/auth/login"
            style={{
              textDecoration: "none",
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid #169BF4",
              background: "#169BF4",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              fontSize: 14,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            로그인
          </Link>
        </div>
      </div>
    </header>
  );
}