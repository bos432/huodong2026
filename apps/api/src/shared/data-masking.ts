export function maskPhone(value?: string | null) {
  const phone = String(value || "").trim();
  if (!phone) return "";
  if (phone.length <= 7) return `${phone.slice(0, 2)}***${phone.slice(-2)}`;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function maskContactHandle(value?: string | null) {
  const handle = String(value || "").trim();
  if (!handle) return "";
  if (handle.length <= 2) return `${handle.slice(0, 1)}*`;
  if (handle.length <= 6) return `${handle.slice(0, 1)}***${handle.slice(-1)}`;
  return `${handle.slice(0, 2)}****${handle.slice(-2)}`;
}
