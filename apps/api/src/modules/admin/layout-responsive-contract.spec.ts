import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin layout responsive navigation contract", () => {
  const layout = readFileSync("../admin/src/views/Layout.vue", "utf8");
  const styles = readFileSync("../admin/src/styles.css", "utf8");

  it("uses a labelled drawer trigger instead of a horizontally scrolling menu", () => {
    expect(layout).toContain('aria-label="打开主导航"');
    expect(layout).toContain('aria-label="关闭主导航"');
    expect(layout).toContain('<el-drawer v-model="mobileMenuVisible"');
    expect(layout).toContain('@select="mobileMenuVisible = false"');
    expect(layout).not.toContain('.aside { width: 100% !important; overflow-x: auto; }');
  });

  it("keeps desktop navigation while hiding it at the mobile breakpoint", () => {
    expect(layout).toContain('<el-aside width="248px" class="aside">');
    expect(layout).toContain('.mobile-nav { display: none; }');
    expect(layout).toContain('.mobile-nav { height: 54px; display: flex;');
    expect(layout).toContain('.aside { display: none; }');
    expect(layout).toContain(':global(.mobile-menu-drawer .el-drawer__body)');
    expect(layout).toContain('background: #162033; overflow-y: auto;');
  });

  it("closes the mobile menu on route changes", () => {
    expect(layout).toContain('mobileMenuVisible.value = false;');
    expect(layout).toContain(':default-active="route.path"');
  });

  it("returns fixed table columns to the normal scroll flow on narrow screens", () => {
    expect(styles).toContain("@media (max-width: 768px)");
    expect(styles).toContain(".el-table .el-table-fixed-column--left");
    expect(styles).toContain(".el-table .el-table-fixed-column--right");
    expect(styles).toContain("position: static !important");
    expect(styles).toContain("left: auto !important");
    expect(styles).toContain("right: auto !important");
  });

  it("constrains overlays to the dynamic viewport and preserves scrollable forms", () => {
    expect(styles).toContain("@media (max-width: 1024px), (max-height: 600px)");
    expect(styles).toContain("width: calc(100vw - 24px) !important");
    expect(styles).toContain("max-height: calc(100dvh - 24px)");
    expect(styles).toContain("env(safe-area-inset-bottom)");
    expect(styles).toContain(".el-drawer.rtl");
    expect(styles).toContain("max-width: calc(100vw - 12px)");
    expect(styles).toContain(".el-dialog .el-form-item__label");
    expect(styles).toContain("margin-left: 0 !important");
    expect(styles).toContain("overscroll-behavior: contain");
  });

  it("keeps the activity wizard labels readable inside the mobile drawer", () => {
    const source = readFileSync("../admin/src/views/Activities.vue", "utf8");

    expect(source).toContain("@media (max-width: 1024px)");
    expect(source).toContain(".activity-wizard :deep(.el-step)");
    expect(source).toContain("min-width: 112px");
    expect(source).toContain("flex: 0 0 112px !important");
    expect(source).toContain("white-space: nowrap");
    expect(source).toContain("overflow-x: auto");
  });
});
