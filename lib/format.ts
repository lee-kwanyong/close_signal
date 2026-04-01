export function toText(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function toNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function toNullableNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function formatSigned(value: number, digits = 1) {
  if (value > 0) return `+${value.toFixed(digits)}`;
  if (value < 0) return value.toFixed(digits);
  return (0).toFixed(digits);
}

export function formatFixed(value: number, digits = 1) {
  return value.toFixed(digits);
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}