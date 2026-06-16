import { NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { assertTenantOwnedResourceAccess, normalizeTenantCode, normalizeTenantHost } from "../../shared/tenant-scope";

describe("public tenant scope", () => {
  it("normalizes tenantCode before lookup", () => {
    expect(normalizeTenantCode(" east ")).toBe("east");
    expect(normalizeTenantCode(" ")).toBeNull();
  });

  it("normalizes configured domain host before lookup", () => {
    expect(normalizeTenantHost("H5.EAST.EXAMPLE.COM:443")).toBe("h5.east.example.com");
    expect(normalizeTenantHost(" ")).toBeNull();
  });

  it("blocks cross-tenant activity access", () => {
    expect(() => assertTenantOwnedResourceAccess({ tenant: { id: 20 } }, { id: 10, code: "east" }, "Activity not found or not open")).toThrow(NotFoundException);
  });

  it("blocks cross-tenant order access", () => {
    expect(() => assertTenantOwnedResourceAccess({ tenant: { id: 20 } }, { id: 10, code: "east" }, "Order not found")).toThrow(NotFoundException);
  });

  it("allows unscoped public access for global entry points", () => {
    expect(() => assertTenantOwnedResourceAccess({ tenant: { id: 20 } }, null, "Activity not found or not open")).not.toThrow();
  });
});
