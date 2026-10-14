import { afterEach, expect, it, vi } from "vitest";
import { setCurrentTenantCode } from "./api";

afterEach(() => vi.unstubAllGlobals());

it("changes city parameters without losing the router's back/forward state", () => {
  const state = { back: "/pages/home/index", current: "/pages/user/login", forward: null, position: 2 };
  const replaceState = vi.fn();
  vi.stubGlobal("uni", { setStorageSync: vi.fn(), removeStorageSync: vi.fn() });
  vi.stubGlobal("window", { location: { href: "https://example.test/?tenantCode=old#/pages/user/login?redirect=record&tenantCode=old" }, history: { state, replaceState } });
  setCurrentTenantCode("new");
  expect(replaceState).toHaveBeenCalledWith(state, "", "/?tenantCode=new#/pages/user/login?redirect=record&tenantCode=new");
  setCurrentTenantCode("");
  expect(replaceState).toHaveBeenLastCalledWith(state, "", "/#/pages/user/login?redirect=record");
});
