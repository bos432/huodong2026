export type MallTrackingEventInput = { eventKey: string; status: string; description: string; location: string | null; eventAt: Date; rawPayload: Record<string, unknown> };

function text(value: unknown) { return String(value || "").trim(); }

export function normalizeMallTrackingStatus(value: unknown, description?: unknown) {
  const source = `${text(value)} ${text(description)}`.toLowerCase();
  if (/delivered|signed|received|签收|已收货|妥投/.test(source)) return "delivered";
  if (/exception|failed|异常|拒收|退回/.test(source)) return "exception";
  if (/out_for_delivery|派送|派件/.test(source)) return "out_for_delivery";
  if (/transit|运输|转运|到达|离开|揽收|已发货/.test(source)) return "in_transit";
  return "info";
}

export function parseMallTrackingPayload(payload: Record<string, any>): MallTrackingEventInput[] {
  const candidates = payload.events || payload.traces || payload.data?.events || payload.data?.traces || payload.data || [];
  const rows = Array.isArray(candidates) ? candidates : [];
  return rows.map((row: Record<string, unknown>, index: number) => {
    const description = text(row.description || row.context || row.desc || row.message || row.AcceptStation || row.statusText) || "物流状态更新";
    const timeText = text(row.eventAt || row.time || row.datetime || row.ftime || row.AcceptTime || row.timestamp);
    const parsedTime = timeText ? new Date(timeText) : new Date();
    const eventAt = Number.isNaN(parsedTime.getTime()) ? new Date() : parsedTime;
    const location = text(row.location || row.area || row.city || row.currentLocation) || null;
    const status = normalizeMallTrackingStatus(row.status || row.state || row.code, description);
    const eventKey = text(row.eventKey || row.id) || `${eventAt.toISOString()}:${status}:${index}`;
    return { eventKey: eventKey.slice(0, 80), status, description: description.slice(0, 255), location: location?.slice(0, 120) || null, eventAt, rawPayload: row };
  }).sort((a, b) => a.eventAt.getTime() - b.eventAt.getTime());
}
