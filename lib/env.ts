type RequiredKey =
  | "SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "KAKAO_REST_API_KEY"
  | "NTS_SERVICE_KEY";

function getRequiredEnv(name: RequiredKey): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function getOptionalEnv(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function getOptionalNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  SUPABASE_URL: getRequiredEnv("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),

  KAKAO_REST_API_KEY: getRequiredEnv("KAKAO_REST_API_KEY"),
  NTS_SERVICE_KEY: getRequiredEnv("NTS_SERVICE_KEY"),

  REQUEST_DELAY_MS: getOptionalNumber("REQUEST_DELAY_MS", 150),
  ENRICH_BATCH_SIZE: getOptionalNumber("ENRICH_BATCH_SIZE", 100),
  NTS_BATCH_SIZE: getOptionalNumber("NTS_BATCH_SIZE", 100),
  KAKAO_PAGE_SIZE: getOptionalNumber("KAKAO_PAGE_SIZE", 10),

  DEBUG_SAVE_DIR: getOptionalEnv("DEBUG_SAVE_DIR"),
};