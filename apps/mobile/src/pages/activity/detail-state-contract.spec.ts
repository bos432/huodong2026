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

  it("presents the approved activity decision order below the cover image", () => {
    const template = source.slice(source.indexOf("<template>"), source.lastIndexOf("</template>"));
    expect(template).toContain('class="detail-intro app-enter"');
    expect(template).toContain('class="detail-intro-status"');
    expect(template).toContain('class="detail-intro-title"');
    expect(template.indexOf('class="hero-image app-media-motion"')).toBeLessThan(template.indexOf('class="detail-intro app-enter"'));
    expect(template.indexOf('class="detail-intro-status"')).toBeLessThan(template.indexOf('class="detail-intro-title"'));
    expect(template.indexOf('class="detail-intro-title"')).toBeLessThan(template.indexOf('class="detail-decision-panel app-enter"'));
    expect(template.indexOf('class="detail-decision-panel app-enter"')).toBeLessThan(template.indexOf('class="detail-section organizer-card app-enter"'));
    expect(template.indexOf('class="detail-section organizer-card app-enter"')).toBeLessThan(template.indexOf('class="bottom-bar app-enter"'));
  });

  it("uses the Manpi visual order and brand palette without removing the booking contract", () => {
    expect(source.indexOf('class="detail-decision-panel')).toBeLessThan(source.indexOf('class="detail-section organizer-card app-enter"'));
    expect(source).toContain("Manpi activity detail tokens");
    expect(source).toContain(".detail-page .action-button{background:var(--manpi-clay)!important;color:#fff!important}");
    expect(source).toContain(".detail-page .action-button.secondary{border:1rpx solid var(--manpi-line)!important;background:#EEECE6!important;color:#626B73!important;opacity:1}");
    expect(source).toContain("#B9533F");
    expect(source).toContain("#F7F5F0");
    expect(source).toContain("暂不可报名");
    expect(source).toContain("class=\"bottom-bar app-enter\"");
  });

  it("keeps the activity decision area visually aligned to the approved Manpi style", () => {
    expect(source).toMatch(/\.detail-page \.detail-hero\{[^}]*background:var\(--manpi-paper\)/);
    expect(source).toMatch(/\.detail-page \.hero-swiper[^}]*aspect-ratio:16\/9/);
    expect(source).toMatch(/\.detail-page \.hero-image\{[^}]*aspect-ratio:16\/9/);
    expect(source).toMatch(/\.detail-page \.detail-intro\{[^}]*display:grid;[^}]*padding:22rpx 24rpx 18rpx/);
    expect(source).toMatch(/\.detail-page \.detail-intro-status\{[^}]*display:flex/);
    expect(source).toMatch(/\.detail-page \.decision-price-panel\{[^}]*background:var\(--manpi-mist\)/);
    expect(source).toContain("报名数据未接入 · 名额以正式发布为准");
    expect(source).toMatch(/\.detail-page \.booking-notice\{[^}]*border-left:4rpx solid var\(--manpi-clay\)/);
  });

  it("stacks decision facts in the approved order on mobile and labels illustrative map artwork", () => {
    expect(source).toMatch(/\.detail-page \.detail-decision-panel\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
    expect(source).toContain(".detail-page .decision-time,.detail-page .decision-place,.detail-page .decision-price-panel,.detail-page .decision-deadline{grid-column:1;grid-row:auto");
    expect(source).toContain(".detail-page .decision-price-panel{display:grid;grid-template-columns:1fr");
    expect(source).toContain("位置示意，非精确导航");
  });

  it("keeps local demo photography and a swipeable gallery while labeling it as illustrative", () => {
    expect(source).toContain("coverUrl: fallback.cover");
    expect(source).toContain("gallery: [fallback.cover, ...mockActivities.filter((item) => item.id !== fallback.id).slice(0, 1).map((item) => item.cover)].filter(Boolean)");
    expect(source).toContain('<swiper v-if="galleryImages.length" class="hero-swiper"');
    expect(source).toContain("@change=\"onGalleryChange\"");
    expect(source).toContain("galleryImageFailed(image)");
    expect(source).toContain("演示照片暂不可用");
    expect(source).toContain("活动照片为演示素材，不代表真实活动现场。");
  });

  it("does not expose tenant routing identifiers in the customer activity detail", () => {
    expect(source).not.toContain('import TenantContextBadge from "../../components/TenantContextBadge.vue";');
    expect(source).not.toContain("<TenantContextBadge");
  });

  it("does not label a demo event as open or present its price as a real offer", () => {
    expect(source).toContain('if (activity.value?.isTest) return "演示活动";');
    expect(source.match(/activity\.isTest \? "示例费用 " : ""/g)?.length).toBe(2);
    expect(source).toContain('`示例费用 ${fallback.priceText}，暂不含保险。`');
    expect(source).toContain('const start = demoActivityDate(fallback.date, fallback.startTime);');
    expect(source).toContain('const end = demoActivityDate(fallback.date, fallback.endTime || fallback.startTime);');
    expect(source).toContain('startTime: demoActivityDate(item.date, item.startTime)');
    expect(source).toContain('{{ item.isTest ? "示例费用 " : "" }}{{ priceText(item.price) }}');
  });

  it("does not present mock organizer, attendee, or review metrics as real", () => {
    const fallback = source.slice(source.indexOf("activity.value = {", source.indexOf("async function load()")), source.indexOf("operationSetting.value = { registrationEnabled: true };", source.indexOf("async function load()")));
    expect(fallback).not.toContain("historicalActivityCount: 18");
    expect(fallback).not.toContain("reviewCount: 12");
    expect(fallback).not.toContain("averageRating: 4.8");
    expect(fallback).not.toContain("followerCount: 86");
    expect(fallback).not.toContain("fulfillmentRate: 98");
    expect(fallback).not.toContain("reviews: [{");
    expect(source).toContain("演示主理人资料待审核");
    expect(source).toContain("真实活动完成后将在这里展示评价");
  });

  it("never shows attendee identities or counts on demo activity details", () => {
    const template = source.slice(source.indexOf("<template>"), source.lastIndexOf("</template>"));
    expect(template).toContain('v-if="activity.attendees?.length && !activity.isTest"');
    expect(source).toContain('if (activity.value?.isTest) return "演示活动";');
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
