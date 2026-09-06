const attributionKeys = ['channelCode', 'source', 'inviteCode'] as const;

export function normalizeActivityAttributionUrl(input: string) {
  const empty = { url: input, channelCode: '', source: '', inviteCode: '' };
  try {
    const url = new URL(input);
    if (!url.hash.startsWith('#/pages/activity/')) return empty;
    const route = new URL(url.hash.slice(1), url.origin);
    if (!['/pages/activity/detail', '/pages/activity/register'].includes(route.pathname)) return empty;
    for (const key of attributionKeys) {
      if (!route.searchParams.has(key) && url.searchParams.has(key)) route.searchParams.set(key, url.searchParams.get(key)!);
      url.searchParams.delete(key);
    }
    url.hash = `${route.pathname}${route.search}`;
    return { url: url.toString(), channelCode: route.searchParams.get('channelCode') || '', source: route.searchParams.get('source') || '', inviteCode: route.searchParams.get('inviteCode') || '' };
  } catch {
    return empty;
  }
}

export function activityPageAttribution(options: Record<string, unknown>) {
  const attribution = { channelCode: String(options.channelCode || ''), source: String(options.source || ''), inviteCode: String(options.inviteCode || '') };
  // #ifdef H5
  if (typeof window !== 'undefined') {
    const normalized = normalizeActivityAttributionUrl(window.location.href);
    for (const key of attributionKeys) if (!attribution[key]) attribution[key] = normalized[key];
    if (normalized.url !== window.location.href) window.history.replaceState(window.history.state, '', normalized.url);
  }
  // #endif
  return attribution;
}
