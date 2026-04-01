type Primitive = string | number | boolean | null | undefined;

export function buildQueryString(params: Record<string, Primitive>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function buildPathWithQuery(
  pathname: string,
  params: Record<string, Primitive>
) {
  return `${pathname}${buildQueryString(params)}`;
}