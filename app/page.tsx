import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

type DashboardSummary = {
  latest_score_date: string | null;
  region_count: number | null;
  category_count: number | null;
  ranking_count: number | null;
  signal_count: number | null;
  avg_base_score: number | null;
  avg_adjusted_score: number | null;
};

type TopRankingRow = {
  region_code: string;
  category_id: number;
  category_name: string | null;
  score_date: string;
  base_score: number | null;
  adjusted_score: number | null;
  risk_grade: string | null;
  signal_count: number | null;
  open_prev_30d: number | null;
  close_prev_30d: number | null;
  net_prev_30d: number | null;
  churn_prev_30d: number | null;
  survival_prev_12m: number | null;
  national_survival_avg_12m: number | null;
  national_churn_avg_30d: number | null;
};

type SignalRow = {
  id: number;
  signal_date: string;
  region_code: string;
  category_id: number;
  category_name: string | null;
  signal_type: string | null;
  signal_strength: number | null;
  title: string | null;
  description: string | null;
  evidence: unknown;
  created_at: string | null;
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("ko-KR").format(Number(value));
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return Number(value).toFixed(1);
}

function riskBadgeStyle(grade: string | null | undefined): React.CSSProperties {
  const value = (grade || "").toLowerCase();

  if (value === "critical") {
    return {
      background: "#fef2f2",
      color: "#b91c1c",
      border: "1px solid #fecaca",
    };
  }

  if (value === "high") {
    return {
      background: "#fff7ed",
      color: "#c2410c",
      border: "1px solid #fed7aa",
    };
  }

  if (value === "medium") {
    return {
      background: "#fffbeb",
      color: "#a16207",
      border: "1px solid #fde68a",
    };
  }

  return {
    background: "#f0fdfa",
    color: "#0f766e",
    border: "1px solid #99f6e4",
  };
}

function signalBadgeStyle(strength: number | null | undefined): React.CSSProperties {
  const value = Number(strength || 0);

  if (value >= 80) {
    return {
      background: "#fef2f2",
      color: "#b91c1c",
      border: "1px solid #fecaca",
    };
  }

  if (value >= 60) {
    return {
      background: "#fff7ed",
      color: "#c2410c",
      border: "1px solid #fed7aa",
    };
  }

  if (value >= 40) {
    return {
      background: "#fffbeb",
      color: "#a16207",
      border: "1px solid #fde68a",
    };
  }

  return {
    background: "#eff6ff",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
    };
}

export default async function HomePage() {
  const supabase = getSupabase();

  const [summaryRes, topRankingsRes, signalsRes] = await Promise.all([
    supabase.rpc("get_dashboard_summary"),
    supabase.rpc("get_top_risk_rankings", { p_limit: 8 }),
    supabase.rpc("get_risk_signals_feed", {
      p_region_code: null,
      p_category_id: null,
      p_limit: 6,
      p_offset: 0,
    }),
  ]);

  const summary = ((summaryRes.data || [])[0] || null) as DashboardSummary | null;
  const topRankings = (topRankingsRes.data || []) as TopRankingRow[];
  const signals = (signalsRes.data || []) as SignalRow[];

  return (
    <main
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "24px 20px 48px",
      }}
    >
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 24,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background: "#f8fafc",
                color: "#334155",
                border: "1px solid #e2e8f0",
                marginBottom: 14,
              }}
            >
              Close Signal
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 34,
                lineHeight: 1.15,
                fontWeight: 800,
                color: "#111827",
              }}
            >
              지역·업종별 폐업 전조 신호와
              <br />
              위험 랭킹을 한 화면에서 모니터링합니다.
            </h1>

            <p
              style={{
                margin: "14px 0 0",
                color: "#6b7280",
                fontSize: 15,
                lineHeight: 1.7,
              }}
            >
              최근 개·폐업 흐름, churn, 생존율, 스코어, 위험 신호를 결합해
              지역/업종 단위 리스크를 추적합니다.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/rankings"
              style={{
                height: 44,
                padding: "0 16px",
                borderRadius: 12,
                background: "#111827",
                color: "#ffffff",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                fontWeight: 600,
                border: "1px solid #111827",
              }}
            >
              위험 랭킹 보기
            </Link>

            <Link
              href="/signals"
              style={{
                height: 44,
                padding: "0 16px",
                borderRadius: 12,
                background: "#ffffff",
                color: "#111827",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                fontWeight: 600,
                border: "1px solid #d1d5db",
              }}
            >
              위험 신호 보기
            </Link>

            <Link
              href="/watchlist"
              style={{
                height: 44,
                padding: "0 16px",
                borderRadius: 12,
                background: "#ffffff",
                color: "#111827",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                fontWeight: 600,
                border: "1px solid #d1d5db",
              }}
            >
              관심목록 보기
            </Link>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <KpiCard
          label="최신 점수 기준일"
          value={summary?.latest_score_date || "-"}
        />
        <KpiCard
          label="지역 수"
          value={formatNumber(summary?.region_count)}
        />
        <KpiCard
          label="카테고리 수"
          value={formatNumber(summary?.category_count)}
        />
        <KpiCard
          label="랭킹 건수"
          value={formatNumber(summary?.ranking_count)}
        />
        <KpiCard
          label="신호 건수"
          value={formatNumber(summary?.signal_count)}
        />
        <KpiCard
          label="평균 Base Score"
          value={formatScore(summary?.avg_base_score)}
        />
        <KpiCard
          label="평균 Adjusted Score"
          value={formatScore(summary?.avg_adjusted_score)}
        />
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 0.8fr)",
          gap: 20,
        }}
      >
        <div
          style={{
            minWidth: 0,
            display: "grid",
            gap: 20,
          }}
        >
          <Panel
            title="상위 위험 랭킹"
            actionHref="/rankings"
            actionLabel="전체 보기"
          >
            {topRankings.length === 0 ? (
              <EmptyState text="표시할 랭킹 데이터가 없습니다." />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {topRankings.map((row, index) => (
                  <Link
                    key={`${row.region_code}-${row.category_id}`}
                    href={`/regions/${row.region_code}/${row.category_id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 18,
                        padding: 16,
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              flexWrap: "wrap",
                              marginBottom: 8,
                            }}
                          >
                            <span
                              style={{
                                minWidth: 28,
                                height: 28,
                                borderRadius: 999,
                                background: "#f3f4f6",
                                color: "#111827",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 13,
                                fontWeight: 800,
                              }}
                            >
                              {index + 1}
                            </span>

                            <strong
                              style={{
                                fontSize: 17,
                                lineHeight: 1.4,
                                color: "#111827",
                              }}
                            >
                              {row.region_code} ·{" "}
                              {row.category_name || `카테고리 ${row.category_id}`}
                            </strong>

                            <span
                              style={{
                                ...riskBadgeStyle(row.risk_grade),
                                borderRadius: 999,
                                padding: "4px 10px",
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              {(row.risk_grade || "low").toUpperCase()}
                            </span>
                          </div>

                          <div
                            style={{
                              color: "#6b7280",
                              fontSize: 13,
                              lineHeight: 1.6,
                            }}
                          >
                            기준일 {row.score_date} · 시그널 {row.signal_count ?? 0}건
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, minmax(110px, 1fr))",
                            gap: 10,
                            minWidth: 240,
                          }}
                        >
                          <MiniStat label="Adjusted" value={formatScore(row.adjusted_score)} />
                          <MiniStat label="Base" value={formatScore(row.base_score)} />
                          <MiniStat label="폐업(30d)" value={formatNumber(row.close_prev_30d)} />
                          <MiniStat label="Churn(30d)" value={formatScore(row.churn_prev_30d)} />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="빠른 이동">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              <QuickLinkCard
                href="/rankings"
                title="위험 랭킹"
                description="지역/업종별 스코어 정렬"
              />
              <QuickLinkCard
                href="/signals"
                title="위험 신호"
                description="최근 감지 신호 피드 확인"
              />
              <QuickLinkCard
                href="/watchlist"
                title="관심목록"
                description="저장한 지역/업종 추적"
              />
            </div>
          </Panel>
        </div>

        <div
          style={{
            minWidth: 0,
            display: "grid",
            gap: 20,
          }}
        >
          <Panel
            title="최신 위험 신호"
            actionHref="/signals"
            actionLabel="전체 보기"
          >
            {signals.length === 0 ? (
              <EmptyState text="표시할 위험 신호가 없습니다." />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {signals.map((signal) => (
                  <Link
                    key={signal.id}
                    href={`/regions/${signal.region_code}/${signal.category_id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 18,
                        padding: 16,
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          flexWrap: "wrap",
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            ...signalBadgeStyle(signal.signal_strength),
                            borderRadius: 999,
                            padding: "4px 10px",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          강도 {signal.signal_strength ?? 0}
                        </span>

                        <span
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                          }}
                        >
                          {signal.signal_date}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#111827",
                          lineHeight: 1.45,
                          marginBottom: 6,
                        }}
                      >
                        {signal.title || "제목 없음"}
                      </div>

                      <div
                        style={{
                          color: "#6b7280",
                          fontSize: 13,
                          lineHeight: 1.6,
                          marginBottom: 10,
                        }}
                      >
                        {signal.region_code} ·{" "}
                        {signal.category_name || `카테고리 ${signal.category_id}`} ·{" "}
                        {signal.signal_type || "-"}
                      </div>

                      <div
                        style={{
                          color: "#374151",
                          fontSize: 14,
                          lineHeight: 1.7,
                        }}
                      >
                        {signal.description || "설명 없음"}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Panel({
  title,
  children,
  actionHref,
  actionLabel,
}: {
  title: string;
  children: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 24,
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            color: "#111827",
          }}
        >
          {title}
        </h2>

        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            style={{
              textDecoration: "none",
              color: "#2563eb",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 18,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 8,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: "#111827",
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 12,
        background: "#f9fafb",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#6b7280",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 17,
          fontWeight: 800,
          color: "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function QuickLinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 16,
          background: "#f9fafb",
          minHeight: 110,
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 6,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 14,
            color: "#6b7280",
            lineHeight: 1.6,
          }}
        >
          {description}
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        background: "#f9fafb",
        padding: 18,
        color: "#6b7280",
      }}
    >
      {text}
    </div>
  );
}