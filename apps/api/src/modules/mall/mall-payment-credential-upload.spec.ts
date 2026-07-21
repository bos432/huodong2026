import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mall payment credential upload security", () => {
  const service = readFileSync("src/modules/mall/mall.service.ts", "utf8");
  const controller = readFileSync("src/modules/mall/mall-admin.controller.ts", "utf8");

  it("scans credentials before encrypted storage", () => {
    const block = service.slice(service.indexOf("async uploadedMerchantPaymentCredential"), service.indexOf("async publicMerchants"));
    expect(block).toContain("await assertUploadMalwareSafe(buffered.buffer, uploadMalwareScanConfig(this.config))");
    expect(block.indexOf("assertUploadMalwareSafe")).toBeLessThan(block.indexOf("storePrivateCredential"));
  });

  it("awaits the asynchronous security scan in the controller", () => {
    expect(controller).toContain("async uploadMerchantPaymentCredential");
    expect(controller).toContain("return this.service.uploadedMerchantPaymentCredential(file)");
  });
});
