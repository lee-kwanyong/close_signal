import { toText, toNullableNumber } from "@/lib/format";

export type SignalRow = Record<string, unknown>;

export function getSignalId(row: SignalRow) {
  return (
    toText(row.signal_id, "") ||
    toText(row.id, "") ||
    `${getSignalRegionCode(row)}-${getSignalCategoryId(row)}-${getSignalTitle(row)}`
  );
}

export function getSignalRegionCode(row: SignalRow) {
  return toText(row.region_code, "");
}

export function getSignalRegionName(row: SignalRow) {
  return toText(row.region_name, "-");
}

export function getSignalCategoryId(row: SignalRow) {
  return toNullableNumber(row.category_id);
}

export function getSignalCategoryName(row: SignalRow) {
  return toText(row.category_name, "-");
}

export function getSignalTitle(row: SignalRow) {
  return (
    toText(row.signal_title, "") ||
    toText(row.title, "") ||
    toText(row.signal_type, "") ||
    "시그널"
  );
}

export function getSignalBody(row: SignalRow) {
  return (
    toText(row.signal_body, "") ||
    toText(row.description, "") ||
    toText(row.body, "") ||
    "-"
  );
}

export function getSignalSeverity(row: SignalRow) {
  return (
    toText(row.severity, "") ||
    toText(row.risk_level, "") ||
    toText(row.level, "") ||
    "medium"
  ).toLowerCase();
}

export function getSignalCreatedAt(row: SignalRow) {
  return (
    toText(row.created_at, "") ||
    toText(row.detected_at, "") ||
    toText(row.signal_date, "") ||
    "-"
  );
}

export function mapSignalRow(row: SignalRow) {
  return {
    id: getSignalId(row),
    regionCode: getSignalRegionCode(row),
    regionName: getSignalRegionName(row),
    categoryId: getSignalCategoryId(row),
    categoryName: getSignalCategoryName(row),
    title: getSignalTitle(row),
    body: getSignalBody(row),
    severity: getSignalSeverity(row),
    createdAt: getSignalCreatedAt(row),
  };
}