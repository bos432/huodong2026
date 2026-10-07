import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("admin unified payment settings contract", () => {
  it("uses the platform payment controller instead of the generic operation save", () => {
    const page = read("apps/admin/src/views/SystemSettings.vue");

    expect(page).toContain('"/admin/settings/payment"');
    expect(page).toContain('"/admin/settings/payment/validate"');
    expect(page).toContain('"/admin/settings/payment/enable"');
    expect(page).toContain('confirmation: "ENABLE_REAL_PAYMENT"');
    expect(page).toContain('"/admin/settings/payment/disable"');
  });

  it("does not expose a writable deployment-level real payment switch", () => {
    const page = read("apps/admin/src/views/SystemSettings.vue");

    expect(page).toContain("保存配置不会自动开启真实支付");
    expect(page).toContain("realPaymentEnabledReadonly");
    expect(page).toContain("paymentConfigStatus");
    expect(page).toContain("for (const key of paymentConfigKeys) delete payload[key]");
    expect(page).toContain("delete payload.realPaymentEnabled");
  });
});
