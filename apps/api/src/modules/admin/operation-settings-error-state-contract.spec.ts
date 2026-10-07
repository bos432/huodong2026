import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../../../../../apps/admin/src/views/SystemSettings.vue"), "utf8");

describe("operation settings error state contract", () => {
  it("clears scoped operation settings after a failed load", () => {
    expect(source).toContain("resetOperationFormToUnknown();");
    expect(source).toContain("smsSecretConfigured.value = false;");
    expect(source).toContain("clearSmsSecretRequested.value = false;");
  });

  it("exposes page-level loading semantics while operation settings are loading", () => {
    expect(source).toContain('<div class="page" :aria-busy="operationBusy || loadingConfig">');
    expect(source).toContain('v-if="loadingOperation && !operationLoadError"');
    expect(source).toContain('role="status" aria-live="polite"');
  });
});
