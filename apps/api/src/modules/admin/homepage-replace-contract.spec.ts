import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("homepage transactional replacement contract", () => {
  it("keeps full-page replacement in one backend transaction", () => {
    const controller = read("apps/api/src/modules/admin/admin.controller.ts");
    const service = read("apps/api/src/modules/admin/admin.service.ts");

    expect(controller).toContain('@Post("homepage/sections/replace")');
    expect(controller).toContain("return this.service.replaceHomepageSections(dto.rows");
    expect(service).toContain("async replaceHomepageSections(rows: any[]");
    expect(service).toContain("this.dataSource.transaction(async (manager) =>");
    expect(service).toContain('"homepage.section.replace"');
    expect(service).toContain('defaultHomepageSections(normalizedPageKey), "homepage.section.reset_default"');
  });

  it("keeps builder templates, style and cross-tenant copies on the transactional endpoint", () => {
    const builder = read("apps/admin/src/views/HomepageBuilder.vue");

    expect(builder.match(/\/admin\/homepage\/sections\/replace/g)?.length || 0).toBeGreaterThanOrEqual(3);
    expect(builder).not.toContain("for (const row of orderedRows.value) await api.delete(`/admin/homepage/sections/${row.id}`");
    expect(builder).not.toContain("for (const row of currentRows) await api.delete(`/admin/homepage/sections/${row.id}`");
    expect(builder).toContain('const canEdit = computed(() => hasPermission("homepage.manage"))');
    expect(builder).toContain('v-if="loadError"');
    expect(builder).toContain("confirmAction");
  });

  it("makes the draft and published H5 boundary explicit", () => {
    const builder = read("apps/admin/src/views/HomepageBuilder.vue");

    expect(builder).toContain("当前有未发布的装修修改，线上 H5 仍显示上次发布版本");
    expect(builder).toContain("立即发布到 H5");
    expect(builder).toContain("保存只进入草稿；发布当前草稿后 H5 才会更新");
    expect(builder).toContain("保存草稿");
    expect(builder).not.toContain("刷新前台预览即可查看最新效果");
    expect(builder).not.toContain("H5 保存后刷新生效");
  });

  it("keeps the simplified builder and live draft preview contract", () => {
    const builder = read("apps/admin/src/views/HomepageBuilder.vue");
    const preview = read("apps/admin/src/components/HomepageLivePreview.vue");
    const mobileHome = read("apps/mobile/src/pages/index/index.vue");

    expect(builder).toContain("<HomepageLivePreview");
    expect(builder).toContain('v-model="previewDevice"');
    expect(builder).toContain('<el-radio-button value="standard">375</el-radio-button>');
    expect(builder).toContain('<el-radio-button value="large">430</el-radio-button>');
    expect(builder).toContain('v-model="moduleSearch"');
    expect(builder).toContain('v-model="moduleCategory"');
    expect(builder).toContain('@command="handleMoreCommand"');
    expect(builder).toContain("const draft = currentDraftPreviewRow()");
    expect(builder).toContain("list.splice(index, 1, draft)");
    expect(builder).not.toContain('v-if="false" class="phone-frame"');
    expect(builder).not.toContain("grid-template-columns: 220px minmax(360px, 0.9fr) 340px");

    for (const type of [
      "search_bar",
      "hero",
      "quick_nav",
      "featured_activities",
      "activity_feed",
      "testimonial_feed",
      "brand_story_entry",
      "charity_summary",
      "my_page",
      "inner_pages",
      "bottom_nav"
    ]) {
      expect(preview).toContain(type);
    }
    expect(preview).toContain('emit("select", section)');
    expect(preview).toContain("section.config?.display === 'lead_rail'");
    expect(preview).toContain('class="activity-focus-rail"');
    expect(mobileHome).toContain("featuredDisplay === 'lead_rail' && sideActivities.length");
    expect(preview).toContain("width:357px");
    expect(preview).toContain("width:412px");
  });

  it("makes inner-page bottom navigation conflicts recoverable", () => {
    const builder = read("apps/admin/src/views/HomepageBuilder.vue");

    expect(builder).toContain("setInnerPageBottomNav('show')");
    expect(builder).toContain("setInnerPageBottomNav('recommended')");
    expect(builder).toContain("setInnerPageBottomNav('hide')");
    expect(builder).toContain("所有内页都隐藏了底部导航");
    expect(builder).toContain("底部导航总模块开启后，仍需在这里决定各内页是否显示");
  });
});
