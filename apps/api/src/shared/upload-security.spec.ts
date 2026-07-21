import { describe, expect, it } from "vitest";
import { detectSupportedUploadMime, safeUploadOriginalName, validatedCourseResourceFile, validatedUploadFile } from "./upload-security";

const imageMimes = new Set(["image/jpeg", "image/png", "image/webp"]);

describe("public upload security", () => {
  it.each([
    ["image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xe0])],
    ["image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ["image/webp", Buffer.from("RIFF0000WEBP", "ascii")],
    ["image/gif", Buffer.from("GIF89a", "ascii")],
    ["application/pdf", Buffer.from("%PDF-1.7\n", "ascii")]
  ])("detects %s from file content", (mimetype, buffer) => {
    expect(detectSupportedUploadMime(buffer)).toBe(mimetype);
  });

  it("rejects spoofed and mismatched image MIME declarations", () => {
    const base = { originalname: "avatar.png", size: 20, buffer: Buffer.from("<script>alert(1)</script>"), mimetype: "image/png" } as unknown as Express.Multer.File & { buffer: Buffer };
    expect(validatedUploadFile(base, imageMimes)).toBeNull();
    expect(validatedUploadFile({ ...base, buffer: Buffer.from([0xff, 0xd8, 0xff]), mimetype: "image/png" }, imageMimes)).toBeNull();
  });

  it("normalizes control characters, paths and extensions", () => {
    expect(safeUploadOriginalName("../证件\r\n.pdf.exe", "application/pdf")).toBe(".._证件__.pdf.pdf");
  });

  it.each([
    ["video", "video/mp4", Buffer.concat([Buffer.alloc(4), Buffer.from("ftypisom", "ascii")])],
    ["video", "video/webm", Buffer.from([0x1a, 0x45, 0xdf, 0xa3])],
    ["audio", "audio/mpeg", Buffer.from("ID3demo", "ascii")],
    ["audio", "audio/x-wav", Buffer.from("RIFF0000WAVE", "ascii")],
    ["attachment", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", Buffer.from([0x50, 0x4b, 0x03, 0x04])],
    ["attachment", "text/plain", Buffer.from("course notes", "utf8")]
  ])("accepts signed %s course resources", (type, mimetype, buffer) => {
    const file = { originalname: "resource.bin", size: buffer.length, buffer, mimetype } as unknown as Express.Multer.File & { buffer: Buffer };
    expect(validatedCourseResourceFile(file, type)?.mimetype).toBeTruthy();
  });

  it("preserves a safe DOCX extension for ZIP-container office files", () => {
    const buffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const file = { originalname: "../lesson.exe", size: buffer.length, buffer, mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" } as unknown as Express.Multer.File & { buffer: Buffer };
    expect(validatedCourseResourceFile(file, "attachment")?.originalname).toBe(".._lesson.docx");
  });

  it("rejects executable or MIME-spoofed course resources", () => {
    const script = { originalname: "lesson.mp4", size: 20, buffer: Buffer.from("<script>alert(1)</script>"), mimetype: "video/mp4" } as unknown as Express.Multer.File & { buffer: Buffer };
    const executable = { originalname: "notes.exe", size: 4, buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00]), mimetype: "application/octet-stream" } as unknown as Express.Multer.File & { buffer: Buffer };
    expect(validatedCourseResourceFile(script, "video")).toBeNull();
    expect(validatedCourseResourceFile(executable, "attachment")).toBeNull();
  });
});
