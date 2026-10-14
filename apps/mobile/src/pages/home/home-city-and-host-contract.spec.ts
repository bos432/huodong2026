import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync(new URL("./index.vue", import.meta.url), "utf8");
const profile = readFileSync(new URL("../prototype/me.vue", import.meta.url), "utf8");

describe("home city selection and profile host entry", () => {
  it("opens a real city selector from the current city control and offers explicit location matching", () => {
    expect(home).toContain('@click="openCityPicker"');
    expect(home).toContain("选择活动城市");
    expect(home).toContain("定位到当前城市");
    expect(home).toContain("resolveTenantByCurrentLocation({ force: true })");
    expect(home).toContain("setCurrentTenantCode(item.code)");
    expect(home).toContain("setCurrentTenantCodeSource(\"manual\")");
    expect(home).toContain("const cityActivities = computed(() => queryActivities(activities.value");
    expect(home).toContain(".filter((item) => item.status === \"open\")");
    expect(home).toContain("city: currentCity.value");
  });

  it("styles the host application as a restrained secondary action", () => {
    expect(profile).toContain("background:var(--mp-bg-surface)");
    expect(profile).toContain("color:var(--mp-brand-primary-dark)");
    expect(profile).toContain("border:1px solid var(--mp-border)");
    expect(profile).not.toContain("background:var(--mp-mist-soft)");
    expect(profile).not.toContain(".host-entry button{flex:0 0 auto;background:var(--mp-brand-primary)");
  });
});
