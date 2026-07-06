import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("admin and mobile menu integrity", () => {
  it("keeps admin menu items backed by router records", () => {
    const adminMenu = readRepoFile("apps/admin/src/navigation/admin-menu.ts");
    const router = readRepoFile("apps/admin/src/router.ts");
    const menuIndexes = Array.from(adminMenu.matchAll(/\{\s*index:\s*"([^"]+)"/g)).map((match) => match[1]);
    const routePaths = new Set(Array.from(router.matchAll(/path:\s*"([^"]+)"/g)).map((match) => `/${match[1]}`.replace(/\/$/, "")));
    const missing = menuIndexes
      .filter((index) => index.startsWith("/"))
      .map((index) => index.split("?")[0])
      .filter((index, position, list) => list.indexOf(index) === position)
      .filter((index) => !routePaths.has(index));

    expect(missing).toEqual([]);
  });

  it("keeps platform dashboard menu role aligned with the route permission", () => {
    const adminMenu = readRepoFile("apps/admin/src/navigation/admin-menu.ts");

    expect(adminMenu).toContain('{ index: "/dashboard", icon: "DataAnalysis", label: "全局数据看板", roles: permissions.overview');
  });

  it("keeps mobile pages.json paths backed by Vue files", () => {
    const pagesJson = JSON.parse(readRepoFile("apps/mobile/src/pages.json")) as { pages: Array<{ path: string }> };
    const missing = pagesJson.pages
      .map((page) => `apps/mobile/src/${page.path}.vue`)
      .filter((relativePath) => !fs.existsSync(path.join(repoRoot, relativePath)));

    expect(missing).toEqual([]);
  });
});
