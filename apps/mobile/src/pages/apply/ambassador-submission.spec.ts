import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

function applicationPage() {
  const source = readFileSync(new URL("./ambassador.vue", import.meta.url), "utf8");
  const script = source.split('<script setup lang="ts">')[1].split("</script>")[0];
  const code = ts.transpileModule(script + '\nexport { submit, loadHostStatus, form, organizerMode };', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const state = { token: "account-a", tenant: "city-a", application: null as any, failPost: false, postWait: null as Promise<void> | null };
  const keys: string[] = [];
  const uni = { showModal: vi.fn(), showToast: vi.fn(), redirectTo: vi.fn() };
  let hide = () => {};
  const request = async (url: string, options?: any) => {
    if (options?.method === "POST") {
      keys.push(options.data.businessKey);
      if (state.failPost) throw new Error("Network unavailable");
      if (state.postWait) await state.postWait;
      state.application = { id: keys.length, status: "pending" };
      return state.application;
    }
    return { application: state.application, canAccessWorkspace: false };
  };
  const modules: Record<string, any> = {
    vue: { ref: (value: any) => ({ value }), reactive: (value: any) => value, computed: (get: any) => ({ get value() { return get(); } }) },
    "@dcloudio/uni-app": { onHide: (fn: () => void) => { hide = fn; }, onLoad: () => {}, onShow: () => {}, onUnload: () => {} },
    "../../api": { getUserToken: () => state.token, getCurrentTenantCode: () => state.tenant, request, withTenantCode: (url: string) => url },
    "../../entry-pages": { useEntryPageConfig: () => ({ config: {}, load: async () => {} }) },
    "../../feature-gates": { guardCurrentPageFeature: () => true, loadFeatureGates: async () => {} }
  };
  const exports: any = {};
  new Function("require", "exports", "uni", code)((name: string) => modules[name], exports, uni);
  exports.organizerMode.value = true;
  const fill = () => Object.assign(exports.form, { name: "Applicant", phone: "13900000001", city: "City", wechat: "test", expertise: "Walks", experience: "Organizes walks" });
  return { ...exports, state, keys, uni, fill, hide: () => hide() };
}

describe("host application submission lifecycle", () => {
  it("ends a successful attempt received while hidden without showing a modal", async () => {
    const page = applicationPage();
    await page.loadHostStatus();
    page.fill();
    let finish!: () => void;
    page.state.postWait = new Promise<void>(resolve => { finish = resolve; });
    const pending = page.submit();
    page.hide();
    finish();
    await pending;
    expect(page.uni.showModal).not.toHaveBeenCalled();
    page.state.application.status = "rejected";
    page.state.postWait = null;
    await page.loadHostStatus();
    await page.submit();
    expect(page.keys[1]).not.toBe(page.keys[0]);
  });
  it("does not show another account's late submission success", async () => {
    const page = applicationPage();
    await page.loadHostStatus();
    page.fill();
    let finish!: () => void;
    page.state.postWait = new Promise<void>(resolve => { finish = resolve; });
    const pending = page.submit();
    page.state.token = "account-b";
    await page.loadHostStatus();
    finish();
    await pending;
    expect(page.uni.showModal).not.toHaveBeenCalled();
  });
  it("uses a new submission key after an accepted submission is rejected", async () => {
    const page = applicationPage();
    await page.loadHostStatus();
    page.fill();
    await page.submit();
    page.state.application.status = "rejected";
    await page.loadHostStatus();
    await page.submit();
    expect(page.keys).toHaveLength(2);
    expect(page.keys[1]).not.toBe(page.keys[0]);
  });

  it.each(["token", "tenant"] as const)("clears applicant details and retry identity when %s changes", async (field) => {
    const page = applicationPage();
    await page.loadHostStatus();
    page.fill();
    page.state.failPost = true;
    await page.submit();
    page.state[field] = "other";
    await page.loadHostStatus();
    expect(Object.values(page.form).every(value => value === "")).toBe(true);
    page.fill();
    await page.submit();
    expect(page.keys[1]).not.toBe(page.keys[0]);
  });

  it("retains the same submission key for network retries in the same account and city", async () => {
    const page = applicationPage();
    await page.loadHostStatus();
    page.fill();
    page.state.failPost = true;
    await page.submit();
    await page.loadHostStatus();
    await page.submit();
    expect(page.keys).toHaveLength(2);
    expect(page.keys[1]).toBe(page.keys[0]);
  });
});
