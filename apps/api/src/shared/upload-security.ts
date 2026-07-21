const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "application/zip": ".zip",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt"
};

export function detectSupportedUploadMime(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"))) return "image/gif";
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") return "video/mp4";
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return "video/webm";
  if (buffer.length >= 3 && buffer.subarray(0, 3).toString("ascii") === "ID3") return "audio/mpeg";
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return "audio/mpeg";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WAVE") return "audio/wav";
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS") return "audio/ogg";
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && [[0x03, 0x04], [0x05, 0x06], [0x07, 0x08]].some(([a, b]) => buffer[2] === a && buffer[3] === b)) return "application/zip";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return "application/msword";
  return null;
}

export function validatedUploadFile(file: (Express.Multer.File & { buffer?: Buffer }) | undefined, allowedMimes: ReadonlySet<string>) {
  if (!file?.buffer?.length) return null;
  const declaredMime = String(file.mimetype || "").trim().toLowerCase();
  const detectedMime = detectSupportedUploadMime(file.buffer);
  if (!detectedMime || detectedMime !== declaredMime || !allowedMimes.has(detectedMime)) return null;
  return { ...file, buffer: file.buffer, mimetype: detectedMime, originalname: safeUploadOriginalName(file.originalname, detectedMime) } as Express.Multer.File & { buffer: Buffer };
}

export function safeUploadOriginalName(value: string, mimetype: string) {
  const extension = MIME_EXTENSIONS[mimetype] || ".bin";
  const cleaned = String(value || "file").replace(/[\u0000-\u001f\u007f\\/:*?"<>|]/g, "_").trim().slice(0, 180) || "file";
  const currentExtension = cleaned.match(/\.[A-Za-z0-9]{1,10}$/)?.[0] || "";
  const base = (currentExtension ? cleaned.slice(0, -currentExtension.length) : cleaned).slice(0, 180 - extension.length) || "file";
  return `${base}${extension}`;
}

const COURSE_RESOURCE_DECLARED_MIMES: Record<string, ReadonlySet<string>> = {
  image: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  video: new Set(["video/mp4", "video/webm"]),
  audio: new Set(["audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg"]),
  attachment: new Set([
    "application/pdf", "application/zip", "application/x-zip-compressed", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"
  ])
};

export function validatedCourseResourceFile(file: (Express.Multer.File & { buffer?: Buffer }) | undefined, resourceType: string) {
  if (!file?.buffer?.length) return null;
  const type = COURSE_RESOURCE_DECLARED_MIMES[resourceType] ? resourceType : "attachment";
  const declaredMime = String(file.mimetype || "").trim().toLowerCase();
  if (!COURSE_RESOURCE_DECLARED_MIMES[type].has(declaredMime)) return null;
  let detectedMime = detectSupportedUploadMime(file.buffer);
  if (type === "attachment" && declaredMime === "text/plain" && !file.buffer.includes(0)) detectedMime = "text/plain";
  const compatible = detectedMime === declaredMime
    || (detectedMime === "audio/wav" && declaredMime === "audio/x-wav")
    || (detectedMime === "application/zip" && ["application/x-zip-compressed", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(declaredMime));
  if (!compatible) return null;
  const normalizedMime = declaredMime === "audio/x-wav" ? "audio/wav"
    : declaredMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? declaredMime
      : detectedMime!;
  return { ...file, buffer: file.buffer, mimetype: normalizedMime, originalname: safeUploadOriginalName(file.originalname, normalizedMime) } as Express.Multer.File & { buffer: Buffer };
}
