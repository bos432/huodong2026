import { describe, expect, it } from "vitest";
import { homepageSectionIsPublicCandidate, homepageSnapshotChanged } from "./homepage-publication";

describe("homepage publication visibility", () => {
  it("keeps disabled global singleton markers without exposing disabled content", () => {
    expect(homepageSectionIsPublicCandidate({ type: "hero", enabled: true })).toBe(true);
    expect(homepageSectionIsPublicCandidate({ type: "hero", enabled: false })).toBe(false);
    expect(homepageSectionIsPublicCandidate({ type: "bottom_nav", enabled: false })).toBe(true);
    expect(homepageSectionIsPublicCandidate({ type: "my_page", enabled: false })).toBe(true);
    expect(homepageSectionIsPublicCandidate({ type: "inner_pages", enabled: false })).toBe(true);
  });

  it("does not report a published snapshot as changed when JSON keys are reordered", () => {
    const published = [{ type: "bottom_nav", enabled: true, sortOrder: 10, config: { items: [{ label: "活动", enabled: false }], mode: "fixed" }, layout: { textColor: "#333", backgroundColor: "#fff" } }] as any;
    const draft = [{ layout: { backgroundColor: "#fff", textColor: "#333" }, config: { mode: "fixed", items: [{ enabled: false, label: "活动" }] }, sortOrder: 10, enabled: true, type: "bottom_nav" }] as any;

    expect(homepageSnapshotChanged(published, draft)).toBe(false);
    expect(homepageSnapshotChanged(published, [{ ...draft[0], enabled: false }])).toBe(true);
  });
});
