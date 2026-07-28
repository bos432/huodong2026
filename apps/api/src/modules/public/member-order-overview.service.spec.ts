import { describe, expect, it, vi } from "vitest";
import { buildMemberOrderOverview } from "./member-order-overview";

describe("member order overview service", () => {
  function loadersWithRows() {
    const tenant = { id: 3, code: "qiwai-showcase" };
    const loaders = {
      registrations: vi.fn().mockResolvedValue([{ id: 155 }]),
      courses: vi.fn().mockResolvedValue([{ id: 20 }]),
      courseOrders: vi.fn().mockResolvedValue([{ id: 31 }])
    };
    return { loaders, tenant };
  }

  it("returns every order source for one resolved user and tenant", async () => {
    const { loaders, tenant } = loadersWithRows();
    const user = { id: 42 };
    const result = await buildMemberOrderOverview(user, tenant, loaders);

    expect(loaders.registrations).toHaveBeenCalledWith(42, tenant);
    expect(loaders.courses).toHaveBeenCalledWith(user, tenant);
    expect(loaders.courseOrders).toHaveBeenCalledWith(user, tenant);
    expect(result).toEqual({
      context: { userId: 42, tenantId: 3, tenantCode: "qiwai-showcase" },
      registrations: [{ id: 155 }],
      courses: [{ id: 20 }],
      courseOrders: [{ id: 31 }],
      failedSources: []
    });
  });

  it("preserves available order sources when one source fails", async () => {
    const { loaders, tenant } = loadersWithRows();
    loaders.registrations.mockRejectedValue(new Error("registration query failed"));

    await expect(buildMemberOrderOverview({ id: 42 }, tenant, loaders)).resolves.toEqual({
      context: { userId: 42, tenantId: 3, tenantCode: "qiwai-showcase" },
      registrations: [],
      courses: [{ id: 20 }],
      courseOrders: [{ id: 31 }],
      failedSources: ["registrations"]
    });
  });

  it("fails visibly when every order source fails", async () => {
    const { loaders, tenant } = loadersWithRows();
    loaders.registrations.mockRejectedValue(new Error("registration query failed"));
    loaders.courses.mockRejectedValue(new Error("course query failed"));
    loaders.courseOrders.mockRejectedValue(new Error("course order query failed"));

    await expect(buildMemberOrderOverview({ id: 42 }, tenant, loaders)).rejects.toThrow("registration query failed");
  });
});
