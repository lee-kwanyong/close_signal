export type ExternalProviderCategory = {
  primary: string | null;
  secondary: string | null;
  tertiary: string | null;
};

function splitCategory(input?: string | null): ExternalProviderCategory {
  if (!input) {
    return { primary: null, secondary: null, tertiary: null };
  }

  const parts = input
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    primary: parts[0] ?? null,
    secondary: parts[1] ?? null,
    tertiary: parts[2] ?? null,
  };
}

export function normalizeKakaoCategory(input?: string | null) {
  return splitCategory(input);
}

export function normalizeNaverCategory(input?: string | null) {
  return splitCategory(input);
}

export function normalizeNaverTitle(input?: string | null) {
  return (input ?? "").replace(/\s+/g, " ").trim();
}