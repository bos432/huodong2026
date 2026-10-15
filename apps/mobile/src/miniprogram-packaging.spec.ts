import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = JSON.parse(readFileSync(new URL("./pages.json", import.meta.url), "utf8"));

describe("mini program packaging", () => {
  it("keeps only launch and home in the main package", () => {
    expect(config.pages.map((page: { path: string }) => page.path)).toEqual([
      "pages/index/index", "pages/home/index"
    ]);
  });

  it("preserves activity and main navigation route paths in subpackages", () => {
    const routes = config.subPackages.flatMap((pack: { root: string; pages: { path: string }[] }) =>
      pack.pages.map(page => `${pack.root}/${page.path}`));
    for (const route of ["pages/activity/list", "pages/activity/detail", "pages/activity/register",
      "pages/activity/space", "pages/checkin/index", "pages/checkin/detail", "pages/prototype/me",
      "pages/prototype/message", "pages/prototype/detail", "pages/prototype/index", "pages/scan/index",
      "pages/courses/index"]) expect(routes).toContain(route);
    expect(new Set(routes).size).toBe(routes.length);
  });
});
