import { describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { AdminService } from "./admin.service";

vi.mock("typeorm", async () => ({
  ...await vi.importActual<typeof import("typeorm")>("typeorm"),
  Column: () => () => undefined
}));

function harness() {
  const row = { id: 1, launchConfig: { realPaymentEnabled: true, wechatPayMchId: "1234567890", storageProvider: "oss" } };
  const service = Object.create(AdminService.prototype) as any;
  service.operationSettingTarget = vi.fn().mockResolvedValue({ tenant: null, id: 1 });
  service.ensureOperationSettingForTarget = vi.fn().mockResolvedValue(row);
  service.operationSettingAuditSnapshot = vi.fn().mockReturnValue({});
  service.assertOperationPaymentSettingPayload = vi.fn();
  service.logOperation = vi.fn();
  service.operationActorForTenant = vi.fn().mockReturnValue({ id: 1 });
  service.publicOperationSettingForAdmin = vi.fn((saved) => saved);
  service.operationSettings = { save: vi.fn(async (saved) => saved) };
  return { service, row };
}

const admin = { id: 1, role: "super_admin", tenantId: null };
const dto = { offlinePaymentInstructions: "offline", refundInstructions: "refund", paymentMethods: ["offline"] };

describe("ordinary operation settings payment gate", () => {
  it.each([true, "true", " true "])("rejects activation value %s for either payment switch", async (value) => {
    for (const key of ["realPaymentEnabled", "wechatPayEnabled"]) {
      const { service } = harness();
      await expect(service.saveOperationSetting({ ...dto, launchConfig: { [key]: value } }, admin)).rejects.toBeInstanceOf(BadRequestException);
      expect(service.operationSettings.save).not.toHaveBeenCalled();
    }
  });

  it("preserves independent payment and storage settings when saving other fields", async () => {
    const { service, row } = harness();
    await service.saveOperationSetting({ ...dto, launchConfig: { h5Origin: "https://app.example.test" } }, admin);
    expect(row.launchConfig).toMatchObject({ realPaymentEnabled: true, wechatPayMchId: "1234567890", storageProvider: "oss", h5Origin: "https://app.example.test" });
  });
});
