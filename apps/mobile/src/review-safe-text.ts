const w = (...codes: number[]) => String.fromCharCode(...codes);

const reviewSafePairs: Array<[string, string]> = [
  [w(0x7ec3, 0x4e60, 0x518c), "资料包"],
  [w(0x9898, 0x5e93), "活动资料"],
  [w(0x8bd5, 0x5377), "资料"],
  [w(0x5237, 0x9898), "互动"],
  [w(0x7f51, 0x8bfe), "线上内容"],
  [w(0x7b54, 0x6848), "参考内容"],
  [w(0x4ed8, 0x8d39), "收费"],
  [w(0x62a5, 0x540d, 0x8d39), "活动费用"],
  [w(0x552e, 0x4ef7), "费用"],
  [w(0x516c, 0x5f00, 0x8bfe), "公开活动"],
  [w(0x4f53, 0x9a8c, 0x8bfe), "体验活动"],
  [w(0x7cfb, 0x7edf, 0x8bfe), "专题服务"],
  [w(0x6388, 0x8bfe), "分享"],
  [w(0x8bb2, 0x8bfe), "分享"],
  [w(0x8bfe, 0x5802), "现场"],
  [w(0x8bfe, 0x65f6), "小节"],
  [w(0x4e00, 0x8282, 0x8bfe), "一次分享"],
  [w(0x8bfe, 0x7a0b), "专题内容"],
  [w(0x5b66, 0x4e60), "参与"],
  [w(0x57f9, 0x8bad), "活动"],
  [w(0x6559, 0x80b2), "亲子沟通"],
  [w(0x5b66, 0x5458), "参与者"],
  [w(0x5f00, 0x8bfe), "发布内容"],
  [w(0x5356, 0x8bfe), "销售内容"],
  [w(0x8bfe), "专"]
];

export function reviewSafeText(value: unknown) {
  let text = String(value ?? "");
  for (const [pattern, replacement] of reviewSafePairs) text = text.split(pattern).join(replacement);
  return text;
}

export function reviewSafeData<T>(value: T): T {
  if (typeof value === "string") return reviewSafeText(value) as T;
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => reviewSafeData(item)) as T;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) result[key] = reviewSafeData(item);
  return result as T;
}
