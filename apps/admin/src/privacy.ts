export function maskPhone(value?: unknown) {
  const phone = String(value || "");
  return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone || "-";
}
