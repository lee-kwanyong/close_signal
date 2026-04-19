import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

type ParamsInput =
  | Promise<{ regionCode: string; categoryId: string }>
  | { regionCode: string; categoryId: string };

type DetailRow = {
  score_date: string;
  region_code: string;
  region_name: string;
  category_code: string;
  category_name: string;
  category_l1: string | null;
  category_l2: string | null;
  category_l3: string | null;
  business_count: number;
  previous_business_count_30d: number;
  observed_business_count_30d: number;
  reobserved_count_30d: number;
  new_count_30d: number;
  missing_count_30d: number;
  missing_rate_30d: number;
  close_risk_count_30d: number;
  close_risk_rate_30d: number;
  net_change_30d: number;
  shrink_rate_30d: number;
  risk_score: number;
  risk_grade: string;
  signal_type: string | null;
  signal_title: string | null;
  signal_summary: string | null;
  signal_metadata: Record<string, unknown> | null;
};

function formatNumber(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatScore(value: number | null | undefined) {
  if (value == null) return "-";
  return Number(value).toFixed(2);
}

function riskBadgeStyle(grade: string | null | undefined): CSSProperties {
  const normalized = (grade ?? "").toLowerCase();

  if (normalized === "critical") {
    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: "#fee2e2",
      color: "#b91c1c",
      border: "1px solid #fecaca",
    };
  }

  if (normalized === "high") {
    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: "#fef3c7",
      color: "#b45309",
      border: "1px solid #fde68a",
    };
  }

  if (normalized === "medium") {
    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: "#ecfccb",
      color: "#4d7c0f",
      border: "1px solid #d9f99d",
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: "#e5e7eb",
    color: "#374151",
    border: "1px solid #d1d5db",
  };
}

function cardStyle(): CSSProperties {
  return {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
  };
}

export default async function RegionCategoryDetailPage({
  params,
}: {
  params: ParamsInput;
}) {
  const resolvedParams = await Promise.resolve(params);
  const regionCode = decodeURIComponent(resolvedParams.regionCode);
  const categoryCode = decodeURIComponent(resolvedParams.categoryId);

  const supabase = await supabaseServer();

  const { data, error } = await supabase.rpc("get_region_category_detail", {
    p_region_code: regionCode,
    p_category_code: categoryCode,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = ((data ?? []) as DetailRow[])[0];

  if (!row) {
    notFound();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "32px 20px 80px",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gap: 24 }}>
        <section style={cardStyle()}>
          <div style={{ display: "grid", gap: 12 }}>
            <Link
              href="/rankings"
              style={{
                width: "fit-content",
                color: "#0f766e",
                fontWeight: 700,
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              ← 랭킹으로 돌아가기
            </Link>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span style={riskBadgeStyle(row.risk_grade)}>{row.risk_grade}</span>
              {row.signal_type ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  {row.signal_type}
                </span>
              ) : null}
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 32,
                lineHeight: 1.1,
                fontWeight: 900,
                color: "#111827",
                letterSpacing: "-0.03em",
              }}
            >
              {row.region_name} · {row.category_name}
            </h1>

            <p
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.7,
                color: "#475569",
              }}
            >
              최신 점수일 {row.score_date} 기준 상세 리포트입니다.
            </p>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div style={cardStyle()}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>위험 점수</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#111827" }}>
              {formatScore(row.risk_score)}
            </div>
          </div>

          <div style={cardStyle()}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>현재 사업장 수</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#111827" }}>
              {formatNumber(row.business_count)}
            </div>
          </div>

          <div style={cardStyle()}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>이전 사업장 수</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#111827" }}>
              {formatNumber(row.previous_business_count_30d)}
            </div>
          </div>

          <div style={cardStyle()}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>순변화</div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 900,
                color: row.net_change_30d < 0 ? "#b91c1c" : "#111827",
              }}
            >
              {row.net_change_30d > 0 ? "+" : ""}
              {formatNumber(row.net_change_30d)}
            </div>
          </div>
        </section>

        <section style={{ ...cardStyle(), display: "grid", gap: 16 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: "#111827",
              letterSpacing: "-0.02em",
            }}
          >
            핵심 변화 지표
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <div
              style={{
                padding: 18,
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#fff",
              }}
            >
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>신규 관측</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#111827" }}>
                {formatNumber(row.new_count_30d)}
              </div>
            </div>

            <div
              style={{
                padding: 18,
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#fff",
              }}
            >
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>미관측 수</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#111827" }}>
                {formatNumber(row.missing_count_30d)}
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                비율 {formatScore(row.missing_rate_30d)}%
              </div>
            </div>

            <div
              style={{
                padding: 18,
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#fff",
              }}
            >
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>폐업 위험 수</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#111827" }}>
                {formatNumber(row.close_risk_count_30d)}
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                비율 {formatScore(row.close_risk_rate_30d)}%
              </div>
            </div>

            <div
              style={{
                padding: 18,
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#fff",
              }}
            >
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>축소율</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#111827" }}>
                {formatScore(row.shrink_rate_30d)}%
              </div>
            </div>
          </div>
        </section>

        <section style={{ ...cardStyle(), display: "grid", gap: 14 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: "#111827",
              letterSpacing: "-0.02em",
            }}
          >
            시그널 요약
          </h2>

          {row.signal_title ? (
            <div
              style={{
                display: "grid",
                gap: 10,
                padding: 18,
                borderRadius: 16,
                border: "1px solid #dbeafe",
                background: "#eff6ff",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
                {row.signal_title}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: "#334155" }}>
                {row.signal_summary}
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: 18,
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#fff",
                color: "#6b7280",
                fontSize: 14,
              }}
            >
              연결된 시그널이 없습니다.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}