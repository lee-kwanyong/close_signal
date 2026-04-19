import Link from "next/link";

export default async function WritePage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f8faf8" }}>
      <section style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div
          style={{
            borderRadius: 28,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            padding: 24,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              color: "#15803d",
              fontSize: 12,
              fontWeight: 800,
              marginBottom: 14,
            }}
          >
            WRITE ENTRY
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 40,
              lineHeight: 1.1,
              letterSpacing: "-0.05em",
              fontWeight: 900,
              color: "#111827",
            }}
          >
            어떤 글을 남길지
            <br />
            먼저 선택하세요
          </h1>

          <p
            style={{
              margin: "14px 0 0",
              maxWidth: 760,
              fontSize: 15,
              lineHeight: 1.8,
              color: "#4b5563",
            }}
          >
            단순 자유게시판이 아니라, 위험 신호와 연결되는 글 흐름으로 구성합니다. 목적에
            맞는 유형을 먼저 선택한 뒤 작성 화면으로 들어가면 됩니다.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {[
            {
              href: "/community/write?topic=ask",
              title: "전문가 질문",
              desc: "운영, 창업, 상권 판단, 철수 타이밍처럼 답변이 필요한 질문을 남깁니다.",
              accentBg: "#f0fdf4",
              accentBorder: "#bbf7d0",
              accentText: "#15803d",
            },
            {
              href: "/community/write?topic=start",
              title: "처음 시작",
              desc: "새로 시작하려는 사람의 준비 과정, 지역 선택, 업종 고민을 정리합니다.",
              accentBg: "#ffffff",
              accentBorder: "#e5e7eb",
              accentText: "#111827",
            },
            {
              href: "/community/write?topic=anonymous",
              title: "익명 고민",
              desc: "이름을 드러내기 어려운 불안, 폐업 고민, 매출 하락 같은 현실 문제를 남깁니다.",
              accentBg: "#ffffff",
              accentBorder: "#e5e7eb",
              accentText: "#111827",
            },
            {
              href: "/community/write?topic=success",
              title: "성공사례",
              desc: "작지만 실제 도움이 되는 회복 경험, 운영 개선, 전환 성공 사례를 남깁니다.",
              accentBg: "#ffffff",
              accentBorder: "#e5e7eb",
              accentText: "#111827",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "block",
                textDecoration: "none",
                color: "inherit",
                borderRadius: 24,
                border: `1px solid ${item.accentBorder}`,
                background: item.accentBg,
                padding: 22,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  lineHeight: 1.3,
                  letterSpacing: "-0.03em",
                  fontWeight: 800,
                  color: item.accentText,
                  marginBottom: 10,
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: "#4b5563",
                }}
              >
                {item.desc}
              </div>

              <div
                style={{
                  marginTop: 18,
                  fontSize: 13,
                  fontWeight: 800,
                  color: item.accentText,
                }}
              >
                이 유형으로 작성하기
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}