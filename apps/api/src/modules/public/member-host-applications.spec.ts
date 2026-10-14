import { describe, expect, it, vi } from "vitest";
import { MemberHostApplications } from "./member-host-applications";

describe("member host applications", () => {
  it("reads the latest application for the authenticated owner and exact tenant scope", async () => {
    const repository = { findOne: vi.fn().mockResolvedValue({ id: 4, status: "pending", name: "Test", city: "City", phone: "secret", remark: "internal", createdAt: new Date(), updatedAt: new Date() }) };
    const result = await new MemberHostApplications(repository as any).latest(9, 3);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { applicantUserId: 9, applicantTenantScopeKey: "tenant:3", source: "host_apply" }, order: { id: "DESC" } });
    expect(result).toMatchObject({ id: 4, status: "pending", name: "Test", city: "City" });
    expect(result).not.toHaveProperty("phone");
    expect(result).not.toHaveProperty("remark");
  });
  it("does not match historical unbound applications by phone", async () => {
    const repository = { findOne: vi.fn().mockResolvedValue(null) };
    expect(await new MemberHostApplications(repository as any).latest(9, null)).toBeNull();
    expect(repository.findOne.mock.calls[0][0].where.applicantTenantScopeKey).toBe("platform");
  });
  it("rejects a replay business key owned by another user or tenant", async () => {
    const repository = { findOne: vi.fn().mockResolvedValue({ applicantUserId: 9, applicantTenantScopeKey: "tenant:3", source: "host_apply" }) };
    const service = new MemberHostApplications(repository as any);
    await expect(service.replay("key", 8, 3)).rejects.toThrow("申请编号不可用");
    await expect(service.replay("key", 9, 4)).rejects.toThrow("申请编号不可用");
    await expect(service.replay("key", 9, 3)).resolves.toBeTruthy();
  });
});
