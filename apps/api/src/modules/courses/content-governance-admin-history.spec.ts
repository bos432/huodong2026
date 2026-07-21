import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("content governance admin history", () => {
  const communityView = readFileSync("../admin/src/views/Community.vue", "utf8");

  it("loads processed appeals as well as pending appeals", () => {
    const load = communityView.slice(communityView.indexOf("async function load()"), communityView.indexOf("function moderatorCount"));
    expect(load).toContain('api.get<any, any[]>("/admin/content-appeals", { params })');
    expect(load).not.toContain('api.get<any, any[]>("/admin/content-appeals", { params: { ...params, status: "pending" } })');
  });
});
