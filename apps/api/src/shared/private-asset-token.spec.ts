import { describe, expect, it } from "vitest";
import { createPrivateAssetToken, verifyPrivateAssetToken } from "./private-asset-token";

const payload = { v: 1 as const, purpose: "registration_attachment" as const, reference: "secure-private-document://registration-attachments/file.pdf.enc", tenantId: 42, ownerUserId: 7, originalName: "证明.pdf", mimetype: "application/pdf", size: 123 };

describe("private asset token", () => {
  it("round trips an authenticated private reference", () => expect(verifyPrivateAssetToken(createPrivateAssetToken(payload, "secret"), "secret")).toEqual(payload));
  it("rejects tampering and another signing secret", () => {
    const token = createPrivateAssetToken(payload, "secret");
    expect(verifyPrivateAssetToken(`${token}x`, "secret")).toBeNull();
    expect(verifyPrivateAssetToken(token, "other-secret")).toBeNull();
  });
  it("keeps settlement proof purpose and administrator scope", () => {
    const settlement = { ...payload, purpose: "settlement_proof" as const, ownerUserId: null, ownerAdminId: 9 };
    expect(verifyPrivateAssetToken(createPrivateAssetToken(settlement, "secret"), "secret")).toEqual(settlement);
  });
  it("keeps course context and short-lived grant metadata", () => {
    const course = { ...payload, purpose: "course_resource" as const, contextId: 31, ownerUserId: 88, expiresAt: Date.now() + 60_000 };
    expect(verifyPrivateAssetToken(createPrivateAssetToken(course, "secret"), "secret")).toEqual(course);
  });
});
