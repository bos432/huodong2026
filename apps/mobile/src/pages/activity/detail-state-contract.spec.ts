import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "detail.vue"), "utf8");

describe("activity detail shared state contract", () => {
  it("uses shared states for detail loading and failure", () => {
    expect(source).toContain('<LoadingState v-if="loading"');
    expect(source).toContain('<view v-else-if="error" class="card detail-error-state">');
    expect(source).toContain('<EmptyState variant="error" :description="error"');
    expect(source).toContain('action-text="重新加载"');
    expect(source).toContain('aria-label="返回当前商家首页"');
  });

  it("keeps the decision order, organizer proof, refund rule, and fixed CTA visible", () => {
    expect(source.indexOf("detail-hero")).toBeLessThan(source.indexOf("detail-decision-panel"));
    expect(source).toContain("活动时间（北京时间）");
    expect(source).toContain("集合地点");
    expect(source).toContain("activity.organizerTrust");
    expect(source).toContain("客服与退款规则");
    expect(source).toContain("class=\"bottom-bar app-enter\"");
    expect(source).toContain(":aria-label=\"registerButtonText()\"");
  });

  it("keeps activity actions independent from detail loading state", () => {
    expect(source).toContain('uni.showToast({ title: reviewSafeText(error.message || "举报失败")');
    expect(source).toContain('const activeAction = ref("");');
  });

  it("keeps secondary activity actions keyboard reachable", () => {
    expect(source).toContain('@keyup.space.prevent="openLocation"');
    expect(source).toContain('@keyup.space.prevent="closeMoreActions"');
    expect(source).toContain('@keyup.space.prevent="closeMoreActions(); goActivitySpace()"');
    expect(source).toContain('@keyup.space.prevent="closeMoreActions(); goPublish()"');
    expect(source).toContain('@keyup.space.prevent="closeMoreActions(); goCommunity()"');
    expect(source).toContain('@keyup.space.prevent="goRelatedActivity(item)"');
    expect(source).toContain('@keyup.space.prevent="posterUrl = \'\'"');
  });
});
