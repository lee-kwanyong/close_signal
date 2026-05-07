import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growth Signal 300",
  description: "Growth Signal Intelligence OS"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
