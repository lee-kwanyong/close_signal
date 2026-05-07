import crypto from "node:crypto";

export function hashSensitive(value?: string | null) {
  if (!value) return null;
  const secret = process.env.SENSITIVE_HASH_SECRET ?? "dev-secret-change-me";
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function stableNumberFromText(text: string, min: number, max: number) {
  const hash = crypto.createHash("sha256").update(text).digest("hex");
  const raw = Number.parseInt(hash.slice(0, 8), 16);
  return min + (raw % Math.floor(max - min + 1));
}

export function rowHash(row: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex");
}
