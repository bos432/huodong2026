const ASSET_FIELD = /(?:urls?|images?|icon|logo|avatar|src)$/i;

export function normalizeAssetResponse<T>(data: T, apiBase: string): T {
  const origin = apiBase.match(/^https?:\/\/[^/?#]+/i)?.[0];
  if (!origin) return data;

  function visit(value: unknown, field: string): unknown {
    if (typeof value === "string") {
      return ASSET_FIELD.test(field) && value.startsWith("/uploads/") ? `${origin}${value}` : value;
    }
    if (Array.isArray(value)) return value.map(item => visit(item, field));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item, key)]));
    }
    return value;
  }

  return visit(data, "") as T;
}
