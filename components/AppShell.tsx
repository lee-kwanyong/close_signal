import Link from "next/link";

import { normalizeCustomerId } from "@/lib/customer-id";

type AppShellActive =
  | "home"
  | "growth-report"
  | "risk-radar"
  | "care-program"
  | "reviewer"
  | "customer-success";

type AppShellProps = {
  children: React.ReactNode;
  customerId?: string;
  active?: AppShellActive;
};

function activeClass(
  current: AppShellActive | undefined,
  target: AppShellActive
): string | undefined {
  return current === target ? "active" : undefined;
}

export function AppShell({
  children,
  customerId,
  active,
}: AppShellProps) {
  const safeCustomerId = normalizeCustomerId(customerId);

  const growthReportPath = safeCustomerId
    ? `/customers/${safeCustomerId}/growth-report`
    : "/";

  const riskRadarPath = safeCustomerId
    ? `/customers/${safeCustomerId}/risk-radar`
    : "/";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          Growth Signal
          <small>위험 신호 · 케어 프로그램</small>
        </div>

        <nav className="nav">
          <Link className={activeClass(active, "home")} href="/">
            1차 위험 체크
          </Link>

          {safeCustomerId ? (
            <>
              <Link
                className={activeClass(active, "growth-report")}
                href={growthReportPath}
              >
                Growth Care Report
              </Link>

              <Link
                className={activeClass(active, "risk-radar")}
                href={riskRadarPath}
              >
                Risk Radar
              </Link>
            </>
          ) : null}

          <Link
            className={activeClass(active, "care-program")}
            href="/care-program"
          >
            2차 케어 프로그램
          </Link>

          <Link
            className={activeClass(active, "reviewer")}
            href="/reviewer"
          >
            Reviewer
          </Link>

          <Link
            className={activeClass(active, "customer-success")}
            href="/admin/customer-success"
          >
            CS 큐
          </Link>
        </nav>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}