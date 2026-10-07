import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("activity fanout scene contract", () => {
  it("writes the business scene explicitly instead of falling back to the job type", () => {
    for (const path of [
      "src/modules/reliability/automatic-sms.service.ts",
      "src/modules/reliability/automatic-wechat.service.ts"
    ]) {
      const source = read(path);
      expect(source).toContain("scene: input.scene,");
      expect(source).toContain("type: ");
      expect(source).toContain("activity-fanout");
    }
  });
});
