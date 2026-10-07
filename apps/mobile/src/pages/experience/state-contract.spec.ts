import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectsSource = readFileSync(resolve(__dirname, "index.vue"), "utf8");
const mineSource = readFileSync(resolve(__dirname, "mine.vue"), "utf8");

describe("experience pages shared state contract", () => {
  it("uses LoadingState while open projects are being requested", () => {
    expect(projectsSource).toContain("import LoadingState from '../../components/LoadingState.vue'");
    expect(projectsSource).toContain('<LoadingState v-if="loading"');
    expect(projectsSource).not.toContain('<EmptyState v-if="loading"');
  });

  it("uses LoadingState while personal experience records are being requested", () => {
    expect(mineSource).toContain("import LoadingState from '../../components/LoadingState.vue'");
    expect(mineSource).toContain('<LoadingState v-if="loading"');
    expect(mineSource).not.toContain('<EmptyState v-if="loading"');
  });
});
