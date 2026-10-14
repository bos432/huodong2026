import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "me.vue"), "utf8");

describe("slowpi profile view contract", () => {
  it("keeps guest and authenticated identities explicit instead of displaying a demo person", () => {
    expect(source).toContain('isGuest ? "未登录" : "个人活动记录中心"');
    expect(source).toContain("{{ displayName }}");
    expect(source).toContain('"/public/me/profile"');
    expect(source).not.toContain("演示用户 · 慢π体验者");
  });

  it("defines the profile surfaces instead of falling back to browser defaults", () => {
    expect(source).toContain(".identity-head");
    expect(source).toContain(".todo-grid");
    expect(source).toContain(".setting-list");
    expect(source).toContain("border-radius:var(--mp-radius-lg)");
  });

  it("does not pair a demo identity with a photorealistic mock avatar", () => {
    expect(source).not.toContain('v-if="mockProfile.avatar"');
    expect(source).toContain('class="avatar avatar-fallback"');
    expect(source).toContain('name="user"');
  });

  it("uses real member routes and invalidates asynchronous loads on account or tenant changes", () => {
    expect(source).toContain('"/public/me/registrations", options');
    expect(source).toContain("token === getUserToken()");
    expect(source).toContain("userId === getUserId()");
    expect(source).toContain("tenantCode === getCurrentTenantCode()");
    expect(source).toContain("onHide(invalidateProfileLoad)");
    expect(source).toContain("@click=\"openTodo(item)\"");
    expect(source).toContain("@click=\"openSetting(item)\"");
    expect(source).not.toContain("为本地演示");
    expect(source).toContain("clearUser()");
  });

  it("opens the shared publish entry without dropping the active tenant context", () => {
    expect(source).toContain("function openPublishEntry()");
    expect(source).toContain("mobileShell.value?.openPublish()");
    expect(source).not.toContain('uni.setStorageSync("open_publish_sheet", "1")');
    expect(source).not.toContain("url: '/pages/home/index'");
  });
});
