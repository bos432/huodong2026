import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "register.vue"), "utf8");

describe("activity registration shared state contract", () => {
  it("uses shared states for registration loading and failure", () => {
    expect(source).toContain('<LoadingState v-if="loading"');
    expect(source).toContain('variant="error" :description="loadError"');
    expect(source).toContain('action-text="重新加载"');
  });

  it("keeps login recovery and registration action errors available", () => {
    expect(source).toContain('aria-label="去登录"');
    expect(source).toContain('uni.showModal({ title: "提交失败"');
    expect(source).toContain('v-if="quoteError"');
  });

  it("uses an explicit cross-platform confirmation layer for registration submit", () => {
    expect(source).toContain('class="submit-confirm-layer"');
    expect(source).toContain('class="submit-confirm-primary"');
    expect(source).toContain("function confirmSubmit()");
    expect(source).not.toContain("confirming.value = true;\n  uni.showModal(");
  });

  it("leaves validation before invoking the submit state machine", () => {
    expect(source).toContain('confirming.value = false;\n  resetRegistrationEditing();\n  void doSubmit();');
  });
});
