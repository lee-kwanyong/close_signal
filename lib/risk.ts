export type RiskTone = "high" | "medium" | "low" | "neutral";
export type ChangeTone = "danger" | "success" | "neutral";

export function getRiskTone(score: number): RiskTone {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  if (score >= 0) return "low";
  return "neutral";
}

export function getChangeTone(value: number): ChangeTone {
  if (value > 0) return "danger";
  if (value < 0) return "success";
  return "neutral";
}

export function getSeverityTone(severity: string): Extract<RiskTone, "high" | "medium" | "neutral"> {
  const normalized = severity.toLowerCase();

  if (normalized.includes("high") || normalized.includes("critical")) {
    return "high";
  }

  if (normalized.includes("medium") || normalized.includes("warn")) {
    return "medium";
  }

  return "neutral";
}

export function getSeverityLabel(severity: string) {
  const normalized = severity.toLowerCase();

  if (normalized.includes("high") || normalized.includes("critical")) return "높음";
  if (normalized.includes("medium") || normalized.includes("warn")) return "중간";
  return "일반";
}