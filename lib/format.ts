export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return Math.round(value).toString();
}

export function componentLabel(key: string): string {
  const labels: Record<string, string> = {
    market_opportunity: "상권기회",
    competition_position: "경쟁포지션",
    digital_discovery: "디지털발견",
    conversion_readiness: "전환준비",
    trust_reaction: "신뢰반응",
    action_velocity: "실행속도",
    operation_basic: "운영기본"
  };
  return labels[key] ?? key;
}

export function missionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    quick_win: "Quick Win",
    high_impact: "High Impact",
    trust_builder: "Trust Builder",
    data_boost: "Data Boost",
    advanced: "Advanced",
    cs_assist: "CS Assist"
  };
  return labels[type] ?? type;
}

export function missionTypeBadge(type: string): "brand" | "green" | "orange" | "purple" {
  if (type === "quick_win") return "green";
  if (type === "high_impact") return "brand";
  if (type === "trust_builder") return "purple";
  return "orange";
}
