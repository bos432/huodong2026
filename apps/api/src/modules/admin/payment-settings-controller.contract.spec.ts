import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../../../../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("platform payment settings controller contract", () => {
  it("exposes platform-only read, update, validate, enable and disable routes", () => {
    const controller = read("apps/api/src/modules/admin/admin.controller.ts");
    expect(controller).toContain('@Get("settings/payment")');
    expect(controller).toContain('@Put("settings/payment")');
    expect(controller).toContain('@Post("settings/payment/validate")');
    expect(controller).toContain('@Post("settings/payment/enable")');
    expect(controller).toContain('@Post("settings/payment/disable")');
    expect(controller).toContain("@AdminRoles(...SUPER_ADMIN)");
    expect(controller).toContain("this.paymentSettings.update(admin, body)");
    expect(controller).toContain("this.paymentSettings.enable(admin, body)");
  });

  it("registers the controller service without creating a second storage model", () => {
    const module = read("apps/api/src/modules/admin/admin.module.ts");
    expect(module).toContain('import { PaymentSettingsService } from "./payment-settings.service";');
    expect(module).toContain("PaymentSettingsService,");
    expect(module).toContain("OperationSetting");
  });

  it("binds every payment settings route to the platform system permission", () => {
    const permissions = read("apps/api/src/modules/admin/admin-permissions.ts");
    expect(permissions).toContain('if (path === "settings/payment" || path.startsWith("settings/payment/")) return "system.manage";');
  });
});
