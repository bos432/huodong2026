import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const shellSource = readFileSync(new URL("./components/layout/MobileShell.vue", import.meta.url), "utf8");
const launchSource = readFileSync(new URL("./components/LaunchScreen.vue", import.meta.url), "utf8");

describe("application launch screen", () => {
  it("mounts the branded launch screen at the app root", () => {
    expect(shellSource).toContain("LaunchScreen");
  });

  it("provides skip and enter actions", () => {
    expect(launchSource).toContain("跳过");
    expect(launchSource).toContain("进入慢π");
    expect(launchSource).toContain("/pages/home/index");
  });
});
