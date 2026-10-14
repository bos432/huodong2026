import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";

function createPage() {
  const source = readFileSync(new URL("./pending-reviews.vue", import.meta.url), "utf8")
    .split('<script setup lang="ts">')[1].split("</script>")[0];
  const code = ts.transpileModule(source + "\nexport { load, registrations, loading, error, guest };", {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const account = { userToken: "member-a", tenantCode: "city-a" };
  const requests: Array<{ resolve: (value: any) => void; reject: (cause: Error) => void }> = [];
  let onHide: (() => void) | undefined;
  const modules: Record<string, any> = {
    vue: {
      ref: (value: any) => ({ value }),
      computed: (get: () => unknown) => ({ get value() { return get(); } })
    },
    "@dcloudio/uni-app": { onHide: (fn: () => void) => { onHide = fn; }, onShow: () => {}, onUnload: () => {} },
    "../../api": {
      getCurrentTenantCode: () => account.tenantCode,
      getUserToken: () => account.userToken,
      request: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
      withTenantCode: (path: string) => path
    },
    "../../tenant-load-guard": {
      createTenantLoadGuard: () => {
        let revision = 0;
        return { begin: () => ++revision, isCurrent: (token: number) => token === revision, invalidate: () => { revision += 1; } };
      },
      formatShanghaiDateTime: () => ""
    },
    "./pending-review-state": { pendingReviewState: () => ({ rows: [], unknown: false }) },
    "../../components/ui/IconGlyph.vue": {}, "../../components/AppBottomNav.vue": {},
    "../../components/PageDecorationBlocks.vue": {},
    "../../decoration": {
      filterIntrinsicHeaderDecorationSections: (value: unknown) => value,
      usePageDecoration: () => ({ tenant: {}, bottomNavSection: {}, contentSections: { value: [] }, showBottomNav: true, loadDecoration: async () => {} })
    },
    "../../mobile-tab-routes": { mobileTabRoute: () => "/pages/prototype/me" }
  };
  const exports: Record<string, any> = {};
  const uni = { reLaunch: () => {}, navigateTo: () => {}, navigateBack: () => {} };
  new Function("require", "exports", "uni", "getCurrentPages", code)(
    (name: string) => modules[name] || {}, exports, uni, () => []
  );
  return { ...exports, account, requests, hide: () => onHide?.() };
}

describe("pending review request lifecycle", () => {
  it("ignores late success after the account changes", async () => {
    const page = createPage();
    const pending = page.load();
    page.account.userToken = "member-b";
    page.requests[0].resolve([{ id: 1 }]);
    await pending;
    expect(page.registrations.value).toEqual([]);
    expect(page.loading.value).toBe(true);
  });

  it("does not leak an old-account error or clear the new load state", async () => {
    const page = createPage();
    const old = page.load();
    page.account.userToken = "member-b";
    const current = page.load();
    page.requests[0].reject(new Error("old account error"));
    await old;
    expect(page.error.value).toBe("");
    expect(page.loading.value).toBe(true);
    page.requests[1].resolve([]);
    await current;
    expect(page.loading.value).toBe(false);
    expect(page.error.value).toBe("");
  });

  it("ignores an account-switch error even before another load starts", async () => {
    const page = createPage();
    const pending = page.load();
    page.account.userToken = "member-b";
    page.requests[0].reject(new Error("previous owner error"));
    await pending;
    expect(page.error.value).toBe("");
    expect(page.loading.value).toBe(true);
  });

  it("invalidates a pending response when leaving the page", async () => {
    const page = createPage();
    const pending = page.load();
    page.hide();
    page.requests[0].resolve([{ id: 1 }]);
    await pending;
    expect(page.registrations.value).toEqual([]);
    expect(page.loading.value).toBe(false);
  });
});
