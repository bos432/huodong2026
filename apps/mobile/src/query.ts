function safeDecode(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function safeEncode(value: string) {
  return encodeURIComponent(value);
}

export function queryFromUrl(url: string) {
  const text = String(url || "");
  const queryStart = text.indexOf("?");
  if (queryStart < 0) return "";
  const hashStart = text.indexOf("#", queryStart);
  return text.slice(queryStart + 1, hashStart >= 0 ? hashStart : undefined);
}

export function queryParam(search: string | undefined, name: string) {
  const text = String(search || "").replace(/^\?/, "").split("#")[0];
  if (!text) return "";
  for (const pair of text.split("&")) {
    if (!pair) continue;
    const equalIndex = pair.indexOf("=");
    const rawKey = equalIndex >= 0 ? pair.slice(0, equalIndex) : pair;
    if (safeDecode(rawKey) !== name) continue;
    const rawValue = equalIndex >= 0 ? pair.slice(equalIndex + 1) : "";
    return safeDecode(rawValue);
  }
  return "";
}

export function queryEntries(search: string | undefined) {
  const text = String(search || "").replace(/^\?/, "").split("#")[0];
  if (!text) return [] as Array<[string, string]>;
  return text.split("&").filter(Boolean).map((pair) => {
    const equalIndex = pair.indexOf("=");
    const rawKey = equalIndex >= 0 ? pair.slice(0, equalIndex) : pair;
    const rawValue = equalIndex >= 0 ? pair.slice(equalIndex + 1) : "";
    return [safeDecode(rawKey), safeDecode(rawValue)] as [string, string];
  });
}

export function stringifyQuery(params: Record<string, unknown>) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${safeEncode(key)}=${safeEncode(String(value))}`)
    .join("&");
}
