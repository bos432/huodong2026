import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const sourceRoot = join(process.cwd(), "src", "modules");
const adminSource = readFileSync(join(sourceRoot, "admin", "admin.service.ts"), "utf8");
const publicSource = readFileSync(join(sourceRoot, "public", "public.service.ts"), "utf8");
const refundSource = readFileSync(join(sourceRoot, "refund-completion.service.ts"), "utf8");

describe("automatic SMS trigger contracts", () => {
  it("keeps every activity lifecycle scene connected to a successful business path", () => {
    for (const scene of ["registrationSubmitted", "registrationApproved", "registrationRejected", "paymentSucceeded", "activityCancelled", "activityChanged", "checkInSucceeded"]) {
      expect(`${adminSource}\n${publicSource}`).toContain(`scene: "${scene}"`);
    }
  });

  it("publishes refund success only from the shared completion service", () => {
    expect(refundSource).toContain('scene: "refundSucceeded"');
    expect(adminSource).toContain('scene: "refundRejected"');
  });
});
