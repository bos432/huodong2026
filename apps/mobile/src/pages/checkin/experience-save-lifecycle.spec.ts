import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { experienceDraftError } from "../../experience-records";

function composer() {
  const script = readFileSync(new URL("./detail.vue", import.meta.url), "utf8").split('<script setup lang="ts">')[1].split("</script>")[0];
  const code = ts.transpileModule(script + '\nexport { saveExperience, loadProgress, loadForEdit, loginForEdit, updateDraft, editRecordId, editRevision, editError, editLoginRequired, discovery, lightNote, feeling, photoPath, submitting, experienceSaved, formError };', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const state = { token: "a", tenant: "city-a", fail: false, wait: null as Promise<void> | null };
  const calls: any[] = [];
  const uni = { showToast: vi.fn(), navigateTo: vi.fn() };
  let hide = () => {};
  const modules: Record<string, any> = {
    vue: { ref: (value: any) => ({ value }), computed: (get: any) => ({ get value() { return get(); } }) },
    "@dcloudio/uni-app": { onLoad: () => {}, onShow: () => {}, onHide: (fn: any) => { hide = fn; }, onUnload: () => {} },
    "../../api": { withTenantCode: (path: string) => path },
    "../../mock/challenge": { mockChallenges: [] },
    "../../mock/challenge-flow": { getChallengeProgress: () => ({}) },
    "../../experience-records": { experienceDraftError },
    "../../slow-experience-client": {
      captureExperienceAccount: () => state.token ? { userToken: state.token, tenantCode: state.tenant } : null,
      experienceAccountIsCurrent: (account: any) => account.userToken === state.token && account.tenantCode === state.tenant,
      loadOwnedExperience: async () => {
        if (state.wait) await state.wait;
        return { discovery: "Stored discovery", lightNote: "Stored light", feeling: "Stored feeling", photoUrl: "https://example.test/private-photo", visibility: "public_review", revision: 7 };
      },
      updateCloudExperience: async (account: any, id: number, draft: any, revision: number, photo: string, removePhoto: boolean) => {
        calls.push({ account, id, draft, revision, photo, removePhoto });
        if (state.fail) throw new Error("Record changed; reload before saving");
        return { ...draft, discovery: draft.discovery.replace("corner", "place"), id, revision: revision + 1, photoUrl: removePhoto ? "" : "https://example.test/private-photo" };
      },
      createCloudExperience: async (account: any, draft: any, key: string, photo: string) => {
        calls.push({ account, draft, key, photo });
        if (state.wait) await state.wait;
        if (state.fail) throw new Error("Network unavailable");
        return { ...draft, id: 1 };
      }
    }
  };
  const exports: any = {};
  new Function("require", "exports", "uni", code)((name: string) => modules[name] || {}, exports, uni);
  const fill = () => { exports.discovery.value = "A street detail"; exports.lightNote.value = "Afternoon light"; exports.feeling.value = "Feeling calm today"; };
  exports.loadProgress(); fill();
  return { ...exports, state, calls, fill, uni, hide: () => hide() };
}
describe("cloud note composer lifecycle", () => {
  it("uses the same retry key after a network failure and blocks double-saving success", async () => {
    const page = composer(); page.state.fail = true;
    await page.saveExperience(); page.state.fail = false;
    await page.saveExperience(); await page.saveExperience();
    expect(page.calls).toHaveLength(2);
    expect(page.calls[1].key).toBe(page.calls[0].key);
    expect(page.experienceSaved.value).toBe(true);
  });
  it.each(["token", "tenant"] as const)("clears sensitive drafts on %s change and suppresses the previous response", async field => {
    const page = composer(); let finish!: () => void;
    page.state.wait = new Promise<void>(resolve => { finish = resolve; });
    const pending = page.saveExperience(); page.state[field] = "other";
    page.loadProgress(); finish(); await pending;
    expect(page.discovery.value).toBe(""); expect(page.photoPath.value).toBe("");
    expect(page.experienceSaved.value).toBe(false); expect(page.uni.showToast).not.toHaveBeenCalled();
  });
  it("ends a hidden successful attempt without showing a toast", async () => {
    const page = composer(); let finish!: () => void;
    page.state.wait = new Promise<void>(resolve => { finish = resolve; });
    const pending = page.saveExperience(); page.hide(); finish(); await pending;
    expect(page.experienceSaved.value).toBe(true); expect(page.submitting.value).toBe(false);
    expect(page.uni.showToast).not.toHaveBeenCalled();
  });
  it("routes guests to login without creating local or cloud records", async () => {
    const page = composer(); page.state.token = ""; await page.saveExperience();
    expect(page.calls).toHaveLength(0); expect(page.uni.navigateTo).toHaveBeenCalled();
  });
  it("preserves a stored photo and sends the loaded revision when editing", async () => {
    const page = composer(); page.editRecordId.value = 3;
    await page.loadForEdit(); page.discovery.value = "A revised discovery";
    await page.saveExperience();
    expect(page.calls).toHaveLength(1);
    expect(page.calls[0]).toMatchObject({ id: 3, revision: 7, photo: "", removePhoto: false });
    expect(page.editRevision.value).toBe(8);
    expect(page.photoPath.value).toBe("https://example.test/private-photo");
  });
  it("keeps the author's draft after an edit conflict without claiming success", async () => {
    const page = composer(); page.editRecordId.value = 3;
    await page.loadForEdit(); page.discovery.value = "Unsaved author changes"; page.state.fail = true;
    await page.saveExperience();
    expect(page.discovery.value).toBe("Unsaved author changes");
    expect(page.editRevision.value).toBe(7);
    expect(page.experienceSaved.value).toBe(false);
    expect(page.formError.value).toContain("reload");
  });
  it("shows the server's final text after public-content masking", async () => {
    const page = composer(); page.editRecordId.value = 3;
    await page.loadForEdit(); page.discovery.value = "A quiet corner";
    await page.saveExperience();
    expect(page.discovery.value).toBe("A quiet place");
    expect(page.experienceSaved.value).toBe(true);
  });
  it("offers a login redirect for guest editing instead of retrying an unauthenticated request", async () => {
    const page = composer(); page.editRecordId.value = 3; page.state.token = "";
    await page.loadForEdit();
    expect(page.editLoginRequired.value).toBe(true);
    page.loginForEdit();
    expect(page.uni.navigateTo.mock.calls[0][0].url).toContain("recordId%3D3");
    expect(page.calls).toHaveLength(0);
  });
  it("does not apply a previous account's delayed edit load", async () => {
    const page = composer(); page.editRecordId.value = 3; let finish!: () => void;
    page.state.wait = new Promise<void>(resolve => { finish = resolve; });
    const pending = page.loadForEdit(); page.state.token = "other"; page.loadProgress();
    finish(); await pending;
    expect(page.discovery.value).toBe("");
    expect(page.photoPath.value).toBe("");
    expect(page.editRevision.value).toBe(0);
  });
});
