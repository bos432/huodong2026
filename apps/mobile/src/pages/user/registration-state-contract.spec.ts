import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "registration.vue"), "utf8");

describe("registration detail shared state contract", () => {
  it("uses the shared activity-space states for loading and detail failure", () => {
    expect(source).toContain('<LoadingState v-if="loading" title="正在加载报名详情"');
    expect(source).toContain('<EmptyState v-else-if="loadError" variant="error"');
    expect(source).toContain('@action="load"');
  });

  it("keeps action errors separate from the page data state", () => {
    expect(source).toContain('v-if="actionError" class="card action-error"');
    expect(source).toContain('role="alert" aria-live="assertive"');
  });

  it("does not expose the review action before check-in and activity completion", () => {
    expect(source).toContain("const canReviewActivity = computed(() =>");
    expect(source).toContain('registrationStatus.value === RegistrationStatus.CheckedIn');
    expect(source).toContain('v-if="canReviewActivity" class="button secondary" @click="goReview"');
  });
});
