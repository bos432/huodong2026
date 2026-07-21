import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  charityContributionCertificateNo,
  charityContributionCertificateStatus,
  isCharityContributionCertificateEligible,
  maskCharityContributionHolder
} from "../shared/charity-contribution-certificate";

const repoRoot = resolve(__dirname, "../../../..");

function read(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

const accrual = {
  id: 42,
  idempotencyKey: "charity_accrual:order-42",
  entryHash: "ledger-entry-42",
  createdAt: new Date("2026-07-21T03:20:00.000Z"),
  certificateEligible: true,
  direction: "credit",
  type: "charity_accrual",
  amountFen: 1234
};

describe("charity contribution certificate contract", () => {
  it("only allows positive charity accrual credits", () => {
    expect(isCharityContributionCertificateEligible(accrual)).toBe(true);
    expect(isCharityContributionCertificateEligible({ ...accrual, certificateEligible: false })).toBe(false);
    expect(isCharityContributionCertificateEligible({ ...accrual, direction: "debit" })).toBe(false);
    expect(isCharityContributionCertificateEligible({ ...accrual, type: "manual_adjust" })).toBe(false);
    expect(isCharityContributionCertificateEligible({ ...accrual, amountFen: 0 })).toBe(false);
  });

  it("keeps certificate numbers deterministic", () => {
    const first = charityContributionCertificateNo(accrual);
    expect(first).toMatch(/^MPCG20260721-000042-[A-F0-9]{8}$/);
    expect(charityContributionCertificateNo(accrual)).toBe(first);
    expect(charityContributionCertificateNo({ ...accrual, entryHash: "tampered" })).not.toBe(first);
  });

  it("masks public holders and maps refund-adjusted balances", () => {
    expect(maskCharityContributionHolder("张小明")).toBe("张*明");
    expect(maskCharityContributionHolder("用户178459944115520544")).toBe("用户***");
    expect(maskCharityContributionHolder("慢π公益参与者")).toBe("慢**者");
    expect(maskCharityContributionHolder("13800138000")).toBe("138****8000");
    expect(charityContributionCertificateStatus(1234, 1234)).toBe("active");
    expect(charityContributionCertificateStatus(1234, 734)).toBe("adjusted");
    expect(charityContributionCertificateStatus(1234, 0)).toBe("reversed");
  });

  it("keeps ownership, eligibility and anti-tampering checks in the service", () => {
    const service = read("apps/api/src/modules/charity-fund.service.ts");
    expect(service).toContain("tx.user?.id !== userId");
    expect(service).toContain("isCharityContributionCertificateEligible(tx)");
    expect(service).toContain("this.contributionCertificateNo(tx) !== normalized");
    expect(service).toContain('types: ["charity_accrual", "charity_reversal"]');
    expect(service).toContain('.leftJoinAndSelect("certificateTx.user", "certificateUser")');
    expect(service).toContain('.leftJoinAndSelect("certificateTx.order", "certificateOrder")');
    expect(service).not.toContain("loadEagerRelations: true");
  });

  it("keeps all API routes and the three-mode H5 verification flow", () => {
    const controller = read("apps/api/src/modules/public/public.controller.ts");
    const adminController = read("apps/api/src/modules/admin/admin.controller.ts");
    const publicService = read("apps/api/src/modules/public/public.service.ts");
    const verifyPage = read("apps/mobile/src/pages/credential/verify.vue");
    const charityPage = read("apps/mobile/src/pages/charity/index.vue");

    expect(controller).toContain('@Get("me/charity/transactions/:id/certificate/download")');
    expect(controller).toContain('@Get("charity-certificates/:certificateNo/verify")');
    expect(controller).toContain('@Get("charity-certificates/:certificateNo/image")');
    expect(adminController).toContain('@Get("charity/transactions/:id/certificate/image")');
    expect(publicService).toContain("this.charityFund.userContributionCertificate(user, transactionId)");
    expect(publicService).toContain("this.charityFund.verifyContributionCertificate(certificateNo)");
    expect(publicService).toContain("this.charityFund.contributionCertificateImage(certificateNo)");
    expect(verifyPage).toContain('type VerifyMode = "certificate" | "proof" | "charity"');
    expect(verifyPage).toContain("/public/charity-certificates/${encodeURIComponent(value)}/verify");
    expect(charityPage).toContain("/public/me/charity/transactions/${item.id}/certificate/download");
    expect(charityPage).toContain("type=charity&code=${encodeURIComponent(item.certificateNo)}");
    expect(read("apps/admin/src/views/Charity.vue")).toContain("fetch(row.certificatePreviewUrl");
  });

  it("keeps the admin charity workspace categorized and paginated", () => {
    const controller = read("apps/api/src/modules/admin/admin.controller.ts");
    const service = read("apps/api/src/modules/charity-fund.service.ts");
    const adminPage = read("apps/admin/src/views/Charity.vue");

    for (const section of ['name="overview"', 'name="settings"', 'name="projects"', 'name="transactions"']) expect(adminPage).toContain(section);
    expect(adminPage.match(/<el-pagination/g)?.length).toBe(2);
    expect(adminPage).toContain('params: {\n        page: txPagination.page');
    expect(controller).toContain("this.service.charityTransactionsPage(admin");
    expect(service).toContain("getManyAndCount()");
    expect(service).toContain("builder.skip((page - 1) * pageSize).take(pageSize)");
  });

  it("keeps other audited long admin workspaces categorized and paginated", () => {
    const volunteers = read("apps/admin/src/views/Volunteers.vue");
    const settings = read("apps/admin/src/views/SystemSettings.vue");

    expect(volunteers.match(/<el-pagination/g)?.length).toBe(3);
    expect(volunteers).toContain(':data="pagedProfiles"');
    expect(volunteers).toContain(':data="pagedRecords"');
    expect(volunteers).toContain(':data="pagedTaskApplications"');
    expect(settings).toContain('v-model="operationSection"');
    for (const section of ["registration", "payment", "sms", "theme", "agreements"]) expect(settings).toContain(`operationSection === '${section}'`);
  });
});
