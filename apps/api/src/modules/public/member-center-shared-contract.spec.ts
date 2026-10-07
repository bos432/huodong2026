import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("member center shared contract", () => {
  it("keeps member center identity and asset reads explicitly typed", () => {
    const shared = readFileSync(resolve(process.cwd(), "../../packages/shared/src/index.ts"), "utf8");
    const page = readFileSync(resolve(process.cwd(), "../mobile/src/pages/user/my.vue"), "utf8");
    for (const name of ["PublicMemberProfile", "PublicWalletSummary", "PublicAdminAccess", "PublicCharitySummary", "PublicMallMembershipResponse"]) {
      expect(shared).toContain(`export interface ${name}`);
    }
    expect(page).not.toContain('request<any>("/public/me/profile")');
    expect(page).not.toContain('request<any>("/public/me/wallet")');
    expect(page).not.toContain('request<any>("/public/me/admin-access")');
    expect(page).not.toContain('request<any>("/public/me/charity")');
    expect(page).not.toContain('request<any>("/public/me/mall/membership")');
  });
});
