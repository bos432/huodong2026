export function yuanToFen(value: string | number | null | undefined) {
  const text = String(value ?? "0").trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) throw new Error(`Invalid money value: ${text}`);
  const negative = text.startsWith("-");
  const normalized = negative ? text.slice(1) : text;
  const [yuan, fraction = ""] = normalized.split(".");
  const fen = Number(yuan) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(fen)) throw new Error("Money value exceeds safe integer range");
  return negative ? -fen : fen;
}

export function fenToYuan(value: string | number) {
  const text = String(value).trim();
  if (!/^-?\d+$/.test(text)) throw new Error("Money cents must be a safe integer");
  const cents = Number(text);
  if (!Number.isSafeInteger(cents)) throw new Error("Money cents must be a safe integer");
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  return `${negative ? "-" : ""}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

export function sameMoneyAmount(left: string | number | null | undefined, right: string | number | null | undefined) {
  try { return yuanToFen(left) === yuanToFen(right); } catch { return false; }
}
