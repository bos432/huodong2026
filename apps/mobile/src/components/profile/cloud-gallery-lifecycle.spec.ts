import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

function gallery() {
  const script = readFileSync(new URL("./CloudExperienceGallery.vue", import.meta.url), "utf8").split('<script setup lang="ts">')[1].split("</script>")[0];
  const code = ts.transpileModule(script + '\nexport { load, invalidate, act, records, loading, guest };', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const state = { token: "a", tenant: "city-a", queue: [] as Promise<any>[] };
  const mutations: any[] = [];
  let confirm: any;
  const modules: Record<string, any> = {
    vue: { ref: (value: any) => ({ value }), onMounted: () => {}, onBeforeUnmount: () => {} },
    "../../api": { withTenantCode: (url: string) => url },
    "../../slow-experience-client": {
      captureExperienceAccount: () => state.token ? { userToken: state.token, tenantCode: state.tenant } : null,
      experienceAccountIsCurrent: (account: any) => account.userToken === state.token && account.tenantCode === state.tenant,
      loadCloudExperiences: () => state.queue.shift() || Promise.resolve([]),
      deleteCloudExperience: async (...args: any[]) => { mutations.push(args); }
    }
  };
  const uni = { showModal: (options: any) => { confirm = options.success; }, showToast: vi.fn() };
  const exports: any = {};
  new Function("require", "exports", "uni", "defineExpose", code)((name: string) => modules[name] || {}, exports, uni, () => {});
  return { ...exports, state, mutations, confirm: () => confirm({ confirm: true }) };
}
describe("cloud gallery ownership boundaries", () => {
  it("ignores a previous account's late list response", async () => {
    const page = gallery(); let finish!: (rows: any[]) => void;
    page.state.queue.push(new Promise(resolve => { finish = resolve; }));
    const oldLoad = page.load(); page.state.token = "b"; await page.load();
    finish([{ id: 1, discovery: "Previous owner" }]); await oldLoad;
    expect(page.records.value).toEqual([]);
  });
  it("does not restore sensitive data after leaving the page", async () => {
    const page = gallery(); let finish!: (rows: any[]) => void;
    page.state.queue.push(new Promise(resolve => { finish = resolve; }));
    const pending = page.load(); page.invalidate(); finish([{ id: 1 }]); await pending;
    expect(page.records.value).toEqual([]); expect(page.loading.value).toBe(false);
  });
  it("does not execute a confirmed deletion after the account changes", async () => {
    const page = gallery(); page.act({ id: 1 }, "delete"); page.state.token = "b";
    await page.confirm(); expect(page.mutations).toEqual([]);
  });
  it("clears records and provides a guest state when authentication ends", async () => {
    const page = gallery(); page.records.value = [{ id: 1 }]; page.state.token = "";
    await page.load(); expect(page.records.value).toEqual([]); expect(page.guest.value).toBe(true);
  });
});
