import Link from "next/link";

export default function AppFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid #e5e7eb",
        background: "#ffffff",
        marginTop: 28,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "24px 20px 32px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 0.8fr) minmax(0, 0.8fr)",
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  background: "#0f172a",
                  color: "#ffffff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                CS
              </div>
              <strong
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#111827",
                }}
              >
                Close Signal
              </strong>
            </div>

            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: 14,
                lineHeight: 1.7,
                maxWidth: 520,
              }}
            >
              지역·업종별 개폐업 흐름, churn, 생존율, 위험 신호를 결합해
              폐업 전조를 모니터링하는 리스크 인텔리전스 대시보드입니다.
            </p>
          </div>

          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#111827",
                marginBottom: 12,
              }}
            >
              서비스
            </div>
            <FooterLinks
              items={[
                { href: "/", label: "대시보드" },
                { href: "/rankings", label: "리스크 랭킹" },
                { href: "/signals", label: "시그널" },
                { href: "/watchlist", label: "관심목록" },
              ]}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#111827",
                marginBottom: 12,
              }}
            >
              바로가기
            </div>
            <FooterLinks
              items={[
                { href: "/rankings", label: "상위 위험 랭킹" },
                { href: "/signals", label: "최신 위험 신호" },
                { href: "/watchlist", label: "저장한 목록 보기" },
              ]}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            color: "#9ca3af",
            fontSize: 12,
          }}
        >
          <span>© 2026 Close Signal. All rights reserved.</span>
          <span>Risk Monitoring Dashboard</span>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({
  items,
}: {
  items: Array<{ href: string; label: string }>;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 10,
      }}
    >
      {items.map((item) => (
        <Link
          key={`${item.href}-${item.label}`}
          href={item.href}
          style={{
            textDecoration: "none",
            color: "#6b7280",
            fontSize: 14,
          }}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}