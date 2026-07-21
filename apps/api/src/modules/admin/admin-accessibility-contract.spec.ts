import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function vueFiles(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? vueFiles(path) : name.endsWith(".vue") ? [path] : [];
  });
}

describe("admin accessibility contract", () => {
  const adminRoot = "../admin/src";

  it("gives every self-closing icon button an accessible name and tooltip", () => {
    const unnamed: string[] = [];
    for (const file of vueFiles(adminRoot)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/<el-button\b[^>]*\/>/g)) {
        const button = match[0];
        if (!/(?:\bcircle\b|(?::)?icon=)/.test(button)) continue;
        if (!/aria-label=/.test(button) || !/title=/.test(button)) {
          unnamed.push(`${file}:${source.slice(0, match.index).split(/\r?\n/).length}`);
        }
      }
    }
    expect(unnamed).toEqual([]);
  });

  it("announces route changes and moves keyboard focus to the main content", () => {
    const layout = readFileSync(`${adminRoot}/views/Layout.vue`, "utf8");
    expect(layout).toContain('role="status"');
    expect(layout).toContain('aria-live="polite"');
    expect(layout).toContain('aria-atomic="true"');
    expect(layout).toContain('ref="mainContent"');
    expect(layout).toContain('tabindex="-1"');
    expect(layout).toContain("mainContent.value instanceof HTMLElement");
    expect(layout).toContain("mainContent.value?.$el");
    expect(layout).toContain("target?.focus({ preventScroll: true })");
    expect(layout).toContain("focusMainContent()");
  });

  it("restores activity editor focus across nested message boxes and drawer close", () => {
    const activities = readFileSync(`${adminRoot}/views/Activities.vue`, "utf8");
    expect(activities).toContain('class="activity-editor-drawer"');
    expect(activities).toContain('@closed="restoreActivityEditorFocus"');
    expect(activities).toContain("rememberActivityEditorTrigger(event)");
    expect(activities).toContain("focusActivityEditorAfterMessageBox()");
    expect(activities).toContain("new MutationObserver");
    expect(activities).toContain("target?.isConnected");
    expect(activities.indexOf("function runPrimaryAction")).toBeLessThan(activities.indexOf("</script>"));
  });

  it("keeps pointer-only custom controls keyboard accessible", () => {
    const missing: string[] = [];
    for (const file of vueFiles(adminRoot)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/<(div|span|article|el-tag)\b[^>]*@click(?!\.(?:self|stop))[^>]*>/g)) {
        const control = match[0];
        if (!/(?:^|\s):?role=/.test(control) || !/(?:^|\s):?tabindex=/.test(control) || !/@keydown\.enter/.test(control) || !/@keydown\.space/.test(control)) {
          missing.push(`${file}:${source.slice(0, match.index).split(/\r?\n/).length}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("automatically names dynamic Element Plus tables by their visible context", () => {
    const source = readFileSync(`${adminRoot}/accessibility.ts`, "utf8");
    const layout = readFileSync(`${adminRoot}/views/Layout.vue`, "utf8");
    expect(source).toContain('querySelectorAll<HTMLElement>(".el-table")');
    expect(source).toContain('[role="dialog"][aria-label]');
    expect(source).toContain("table.setAttribute(\"aria-label\"");
    expect(source).toContain("new MutationObserver");
    expect(layout).toContain("observeAdminTables()");
    expect(layout).toContain("stopTableObserver?.()");
  });
});
