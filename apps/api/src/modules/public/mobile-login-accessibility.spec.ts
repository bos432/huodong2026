import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");
const login = fs.readFileSync(path.join(repoRoot, "apps/mobile/src/pages/user/login.vue"), "utf8");
const html = fs.readFileSync(path.join(repoRoot, "apps/mobile/index.html"), "utf8");

describe("mobile login accessibility contract", () => {
  it("offers verified registration as the default login path", () => {
    expect(login).toContain('const loginMode = ref<"password" | "code">("code")');
    expect(login).toContain("验证码登录 / 注册");
    expect(login).toContain("请先获取验证码");
  });

  it("supports both keyboard activation keys on every login action", () => {
    for (const action of ["setLoginMode('code')", "setLoginMode('password')", "sendCode", "submit", "goAdminLogin", "goHome"]) {
      expect(login).toContain(`@keyup.enter="${action}"`);
      expect(login).toContain(`@keyup.space.prevent="${action}"`);
    }
    expect(login).toContain('[role="button"]:focus-visible');
  });

  it("preserves visible errors and user zoom", () => {
    expect(login).toContain('v-if="actionError" class="login-error" role="alert"');
    expect(login).toContain('actionError.value = !/^1\\d{10}$/.test(phone.value.trim())');
    expect(html).not.toContain("user-scalable=no");
    expect(html).not.toContain("maximum-scale=1");
  });

  it("keeps H5 phone and verification inputs named and autofillable", () => {
    expect(login).toContain('<!-- #ifdef H5 -->\n      <view class="phone-login-section">');
    expect(login).toContain('</view>\n      <!-- #endif -->\n      <view class="admin-login-entry"');
    expect(login).toContain('type="tel" inputmode="numeric" name="phone" autocomplete="username"');
    expect(login).toContain('name="code" autocomplete="one-time-code"');
    expect(login).toContain('name="password" autocomplete="current-password"');
    for (const label of ["手机号", "验证码", "密码"]) expect(login).toContain(`aria-label="${label}"`);
  });
});
