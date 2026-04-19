import type { Metadata } from "next";
import "./globals.css";
import AppHeader from "@/components/layout/AppHeader";
import AppFooter from "@/components/layout/AppFooter";

export const metadata: Metadata = {
  title: "클로징시그날",
  description: "위험 신호를 먼저 감지하고 현장 정보로 확인하는 클로징시그날",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-white text-slate-900 antialiased">
        <div className="app-shell">
          <AppHeader />
          <main id="main-content" className="app-main">
            {children}
          </main>
          <AppFooter />
        </div>
      </body>
    </html>
  );
}