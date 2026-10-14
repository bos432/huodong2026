import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./me.vue", import.meta.url), "utf8");

describe("slowpi profile page visual contract", () => {
  it("grows only row copy so icon views keep their explicit dimensions", () => {
    expect(source).toContain(".setting>view:not(.icon-glyph)");
    expect(source).toContain(".upcoming-card>view:not(.icon-glyph)");
    expect(source).not.toContain(".setting>view{");
    expect(source).not.toContain(".upcoming-card>view{");
  });
  it("uses the shared mobile shell and page heading", () => {
    expect(source).toMatch(/<MobileShell\b[^>]*active-tab="me"/);
    expect(source).toContain('class="page-heading"');
    expect(source).toContain('class="heading-title">我的</text>');
  });

  it("uses the shared surface token for the refreshed card overrides", () => {
    expect(source).toContain("var(--mp-bg-surface)");
    expect(source).toContain(".identity,");
    expect(source).toContain(".stats { grid-template-columns: repeat(3");
  });

  it("keeps the organizer entry on the quiet white surface from the approved preview", () => {
    expect(source).toContain(".host-entry{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;border:1px solid var(--mp-border);border-radius:var(--mp-radius-lg);background:var(--mp-bg-surface);box-shadow:none}");
    expect(source).toContain(".host-entry strong{display:block;color:var(--mp-brand-primary-dark)");
    expect(source).not.toContain("border:1px solid var(--mp-mist-border);border-radius:var(--mp-radius-lg);background:var(--mp-mist-soft)");
  });
});
