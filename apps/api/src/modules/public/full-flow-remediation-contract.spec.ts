import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("full flow remediation contracts", () => {
  it("does not let missing points configuration fail the core flow", () => {
    const source = read("modules/member-points/member-points.service.ts");
    expect(source).toContain("Skipping member points award");
    expect(source).toContain("skipped: true as const");
    expect(source).not.toContain('if (!rule) throw new BadRequestException("积分规则不存在")');
  });

  it("treats retained charity refunds as terminal registration access", () => {
    const completion = read("modules/refund-completion.service.ts");
    const publicService = read("modules/public/public.service.ts");
    expect(completion).toContain("isTerminalCharityRefund");
    expect(completion).toContain("公益保留退款已完成，报名资格已关闭");
    expect(publicService).toContain("terminalCharityRefund");
    expect(publicService).toContain("terminal: terminalCharityRefund");
    expect(publicService).toContain("该报名已结束，不能再次申请退款");
  });

  it("keeps the activity-space composer from leaking clicks to navigation", () => {
    const space = fs.readFileSync(path.join(root, "../../mobile/src/pages/activity/space.vue"), "utf8");
    expect(space).toContain('@click.stop="submitPost"');
    expect(space).toContain("posting");
  });

  it("keeps registration identity scoped to its own route lifecycle", () => {
    const registration = fs.readFileSync(path.join(root, "../../mobile/src/pages/user/registration.vue"), "utf8");
    expect(registration).toContain("onLoad((query) => { registrationId.value = Number(query?.id || 0); })");
    expect(registration).not.toContain("const pages = getCurrentPages()");
  });
});
