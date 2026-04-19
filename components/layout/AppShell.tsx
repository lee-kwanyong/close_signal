import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

export default function AppShell({
  children,
  className = "",
}: AppShellProps) {
  return (
    <main className={`min-h-screen bg-[#fcfefd] ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}