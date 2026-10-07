import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "index.vue"), "utf8");
const discoverySource = readFileSync(resolve(__dirname, "../home/index.vue"), "utf8");

describe("mobile homepage tenant state contract", () => {
  it("uses the approved slow-pi discovery homepage as the public root entry", () => {
    expect(source).toContain('uni.reLaunch({ url: "/pages/home/index" });');
  });

  it("renders the slow-pi discovery state from the current prototype", () => {
    expect(discoverySource).toContain("const loadError = ref(\"\");");
    expect(discoverySource).toContain("const filteredActivities = computed(() =>");
    expect(discoverySource).toContain("<ActivityCard v-for=\"activity in filteredActivities\"");
    expect(discoverySource).toContain("<BaseBottomSheet :open=\"sheet === 'filter'\"");
    expect(discoverySource).toContain("<BaseBottomSheet :open=\"sheet === 'sort'\"");
    expect(discoverySource).toContain("async function loadActivities()");
  });

  it("keeps explicit loading, error and empty states", () => {
    expect(discoverySource).toContain('v-if="loadError" class="state notice"');
    expect(discoverySource).toContain('v-if="loading" class="state loading"');
    expect(discoverySource).toContain('v-if="!filteredActivities.length" class="state empty"');
  });
});
