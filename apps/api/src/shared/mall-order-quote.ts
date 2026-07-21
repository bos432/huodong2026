import { createHmac, timingSafeEqual } from "crypto";

export type MallOrderQuoteTokenPayload = {
  version: 1;
  tenantId: number;
  userId: number;
  issuedAt: number;
  expiresAt: number;
  items: Array<{ skuId: number; quantity: number; unitPrice: string; productVersion: number; flashSaleId: number | null; groupBuyId: number | null }>;
  couponCode: string | null;
  promotionCode: string | null;
  pointsUsed: number;
  goodsAmount: string;
  discountAmount: string;
  freightAmount: string;
  payableAmount: string;
  allocations: Array<{ merchantId: number; goodsFen: number; freightFen: number; discountFen: number; payableFen: number }>;
};

function encoded(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export function signMallOrderQuote(payload: MallOrderQuoteTokenPayload, secret: string) {
  const body = encoded(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyMallOrderQuote(token: string, secret: string, now = Date.now()) {
  const [body, signature, extra] = String(token || "").split(".");
  if (!body || !signature || extra) throw new Error("invalid_quote_token");
  const expected = createHmac("sha256", secret).update(body).digest();
  let actual: Buffer;
  try { actual = Buffer.from(signature, "base64url"); } catch { throw new Error("invalid_quote_token"); }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("invalid_quote_token");
  let payload: MallOrderQuoteTokenPayload;
  try { payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch { throw new Error("invalid_quote_token"); }
  if (payload.version !== 1 || !Number.isFinite(payload.expiresAt) || payload.expiresAt <= now) throw new Error("expired_quote_token");
  return payload;
}

export function comparableMallOrderQuote(payload: MallOrderQuoteTokenPayload) {
  const { issuedAt: _issuedAt, expiresAt: _expiresAt, ...comparable } = payload;
  return comparable;
}
