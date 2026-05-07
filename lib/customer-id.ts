const INVALID_CUSTOMER_ID_VALUES = new Set([
  "",
  "undefined",
  "null",
  "nan",
  "none",
  "false",
]);

export type CustomerIdInput = string | null | undefined;

export function normalizeCustomerId(value: CustomerIdInput): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  if (INVALID_CUSTOMER_ID_VALUES.has(normalized.toLowerCase())) {
    return null;
  }

  return normalized;
}

export function normalizeCustomerIdFromRouteParam(
  value: string | string[] | null | undefined
): string | null {
  if (Array.isArray(value)) {
    return normalizeCustomerId(value[0]);
  }

  return normalizeCustomerId(value);
}

export function isValidCustomerId(value: CustomerIdInput): boolean {
  return normalizeCustomerId(value) !== null;
}

export function assertCustomerId(value: CustomerIdInput): string {
  const normalized = normalizeCustomerId(value);

  if (!normalized) {
    throw new Error("customerId가 비어 있거나 undefined입니다.");
  }

  return normalized;
}

export function getCustomerGrowthReportPath(
  value: CustomerIdInput
): string | null {
  const customerId = normalizeCustomerId(value);

  if (!customerId) {
    return null;
  }

  return `/customers/${customerId}/growth-report`;
}

export function getCustomerRiskRadarPath(
  value: CustomerIdInput
): string | null {
  const customerId = normalizeCustomerId(value);

  if (!customerId) {
    return null;
  }

  return `/customers/${customerId}/risk-radar`;
}

export function getSafeCustomerGrowthReportPath(
  value: CustomerIdInput,
  fallback = "/"
): string {
  return getCustomerGrowthReportPath(value) ?? fallback;
}

export function getSafeCustomerRiskRadarPath(
  value: CustomerIdInput,
  fallback = "/"
): string {
  return getCustomerRiskRadarPath(value) ?? fallback;
}