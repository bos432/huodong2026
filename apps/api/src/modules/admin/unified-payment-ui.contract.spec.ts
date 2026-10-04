import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("unified payment settings UI contract", () => {
  it("uses the guarded platform payment endpoints", () => {
    const component = read("apps/admin/src/components/UnifiedPaymentSettings.vue");
    expect(component).toContain('"/admin/settings/payment"');
    expect(component).toContain('"/admin/settings/payment/validate"');
    expect(component).toContain('"/admin/settings/payment/enable"');
    expect(component).toContain('confirmation: "ENABLE_REAL_PAYMENT"');
    expect(component).toContain('"/admin/settings/payment/disable"');
    expect(component).toContain("保存配置不会自动开启真实支付");
  });

  it("mounts only for platform admins and strips payment fields from generic saves", () => {
    const page = read("apps/admin/src/views/SystemSettings.vue");
    expect(page).toContain("UnifiedPaymentSettings");
    expect(page).toContain('v-if="canManagePlatformSettings"');
    expect(page).toContain("for (const key of unifiedPaymentConfigKeys) delete payload[key]");
    expect(page).toContain("delete payload.realPaymentEnabled");
  });
});
