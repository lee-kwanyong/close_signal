export function StatusBadge({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "green" | "orange" | "red" | "purple" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
