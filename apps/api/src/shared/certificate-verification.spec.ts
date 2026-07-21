import { describe, expect, it } from "vitest";
import { certificateVerificationView, maskCertificateHolderName } from "./certificate-verification";

describe("certificate public verification", () => {
  it("masks holder names and exposes only approved course snapshot fields", () => {
    const result = certificateVerificationView({
      certificateNo: "CRS-100",
      name: "课程结业证书",
      templateKey: "course_completion",
      holderName: null,
      threshold: 90,
      status: "active",
      issuedAt: "2026-07-14T00:00:00.000Z",
      businessSnapshot: {
        courseId: 8,
        courseTitle: "社区运营基础",
        templateId: 3,
        issuerName: "慢π学院",
        completionProgress: 100,
        requireAssessmentPass: true,
        internalRemark: "must-not-leak"
      }
    }, "张小明");

    expect(result).toMatchObject({
      certificateNo: "CRS-100",
      holderName: "张*明",
      course: { title: "社区运营基础", issuerName: "慢π学院", completionProgress: 100, requireAssessmentPass: true },
      verify: { valid: true, revoked: false }
    });
    expect(result).not.toHaveProperty("businessSnapshot");
    expect(result.course).not.toHaveProperty("courseId");
    expect(result.course).not.toHaveProperty("templateId");
    expect(result.course).not.toHaveProperty("internalRemark");
  });

  it("hides the holder and course details after revocation", () => {
    const result = certificateVerificationView({ certificateNo: "CRS-101", templateKey: "course_completion", holderName: "李雷", status: "revoked", businessSnapshot: { courseTitle: "历史课程" } });
    expect(result.holderName).toBeNull();
    expect(result.verify).toEqual({ valid: false, revoked: true });
  });

  it("handles short holder names", () => {
    expect(maskCertificateHolderName("王")).toBe("*");
    expect(maskCertificateHolderName("王明")).toBe("王*");
  });
});
