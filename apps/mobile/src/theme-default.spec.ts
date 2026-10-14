import { describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({ getCurrentTenantCode: () => "test", request: vi.fn() }));

import { applyPageTheme } from "./theme";

describe("Manpi runtime theme", () => {
  it("uses the approved brand when no tenant theme is available and preserves overrides", () => {
    const properties = new Map<string, string>();
    vi.stubGlobal("document", {
      documentElement: { style: { setProperty: (name: string, value: string) => properties.set(name, value) } },
      querySelectorAll: () => []
    });
    vi.stubGlobal("uni", { setNavigationBarTitle: vi.fn() });
    try {
      applyPageTheme(null);
      expect(properties.get("--primary-color")).toBe("#B9533F");
      expect(properties.get("--page-bg")).toBe("#F7F5F0");
      expect(properties.get("--text-color")).toBe("#1D2430");
      applyPageTheme({ primaryColor: "#123456", backgroundColor: "#EEEEEE" });
      expect(properties.get("--primary-color")).toBe("#123456");
      expect(properties.get("--page-bg")).toBe("#EEEEEE");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
