import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./index.vue", import.meta.url), "utf8");

describe("home featured activity carousel", () => {
  it("uses native horizontal paging and binds each slide to its own activity data", () => {
    expect(source).toContain("<swiper");
    expect(source).toContain("<swiper-item");
    expect(source).toContain("@change=\"onHeroChange\"");
    expect(source).toContain("v-for=\"(item, index) in heroCards\"");
    expect(source).toContain("item.cover");
    expect(source).not.toContain("class=\"hero-grid\"");
    expect(source).not.toContain("mockActivities[index % mockActivities.length].cover");
  });

  it("opens the activity represented by the active slide and exposes slide selection accessibly", () => {
    expect(source).toContain("openActivity(item.id)");
    expect(source).toContain(':aria-label="`第${index + 1}项推荐活动`"');
    expect(source).toContain(":aria-current=\"carouselIndex === index ? 'true' : 'false'\"");
  });

  it("shows eligible demo activities in the carousel without implying real booking data", () => {
    expect(source).toContain(".filter((item) => item.status === \"open\")");
    expect(source).toContain('class="hero-demo"');
    expect(source).toContain("报名数据未接入");
    expect(source).toContain("不代表真实举办安排");
  });

  it("communicates the no-real-activities state and hides filters when only demo records exist", () => {
    expect(source).toContain('const hasRealActivities = computed(() => activities.value.some((item) => !item.isDemo))');
    expect(source).toContain('v-if="hasRealActivities" class="actions"');
    expect(source).toContain("真实活动即将上线");
    expect(source).toContain("主理人发布并通过审核后，活动会显示在这里。");
  });

  it("does not bypass demo booking safeguards", () => {
    expect(source).not.toContain("if (demoMode.value) return [];");
    expect(source).toContain('class="hero-demo"');
  });

  it("places the city search, featured image, and categories before the activity feed", () => {
    const template = source.slice(source.indexOf("<template>"));
    const categories = template.indexOf("<CategoryScroller");
    const carousel = template.indexOf('class="hero-carousel"');
    const feed = template.indexOf('class="intro"');
    expect(template.indexOf('class="topbar"')).toBeLessThan(carousel);
    expect(carousel).toBeLessThan(categories);
    expect(categories).toBeLessThan(feed);
  });

  it("shows a Manpi-styled recovery surface when a featured cover cannot load", () => {
    expect(source).toContain("heroImageFailed");
    expect(source).toContain("class=\"hero-image-fallback\"");
    expect(source).toContain("活动封面暂不可用");
  });
});
