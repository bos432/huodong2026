import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function resolveBase(shared: string, dedicated = "") {
  vi.stubEnv("VITE_API_BASE", shared);
  vi.stubEnv("VITE_MP_API_BASE", dedicated);
  return (await import("../apps/mobile/src/api-base")).API_BASE;
}

it("does not ship the H5 relative base to Weixin", async () => {
  expect(await resolveBase("/api")).toBe("https://rd.chaimen666.com/api");
});
it("keeps an existing HTTPS deployment", async () => {
  expect(await resolveBase("https://api.example.org/api/")).toBe("https://api.example.org/api");
});
it("prefers the dedicated Weixin base over shared H5 configuration", async () => {
  expect(await resolveBase("/api", "https://mp.example.org/api")).toBe("https://mp.example.org/api");
});
it.each(["http://localhost:3010/api", "//example.org/api", "/other"])("rejects invalid base %s", async (base) => {
  await expect(resolveBase(base)).rejects.toThrow("absolute HTTPS");
});
