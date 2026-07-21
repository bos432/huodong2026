export const AID_APPLICATION_DAILY_LIMIT = 3;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf"
};

export function detectAidMaterialMime(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  return null;
}

export function aidMaterialFileName(value: string, mimetype: string) {
  const extension = MIME_EXTENSIONS[mimetype];
  if (!extension) throw new Error("Unsupported aid material MIME type");
  const cleaned = String(value || "申请材料").replace(/[\\/:*?"<>|]/g, "_").slice(0, 180) || "申请材料";
  const currentExtension = cleaned.match(/\.[A-Za-z0-9]{1,10}$/)?.[0] || "";
  const base = (currentExtension ? cleaned.slice(0, -currentExtension.length) : cleaned).slice(0, 180 - extension.length) || "申请材料";
  return `${base}${extension}`;
}

export function aidUtcDayRange(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
