export function clamp(value: number | null | undefined, min = 0, max = 100): number | null {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return Math.max(min, Math.min(max, Number(value)));
}

export function avg(values: Array<number | null | undefined>): number | null {
  const valid = values.map((v) => clamp(v)).filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((acc, v) => acc + v, 0) / valid.length;
}

export function weightedAverage(scores: Record<string, number | null | undefined>, weights: Record<string, number>): number | null {
  let total = 0;
  let weightTotal = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const value = clamp(scores[key]);
    if (value === null) continue;
    total += value * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) return null;
  return Number((total / weightTotal).toFixed(2));
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
