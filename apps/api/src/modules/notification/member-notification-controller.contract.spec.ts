import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const controller = readFileSync(resolve(__dirname, "../v1/v1-public.controller.ts"), "utf8");
describe("member inbox controller authorization", () => {
  for (const method of ["memberNotifications", "readMemberNotification"]) {
    it(`requires an authenticated owner for ${method}`, () => {
      const body = controller.match(new RegExp(`async ${method}\\([^]*?\\n  }`))?.[0] || "";
      expect(body).toContain("requireUserFromAuthorization(req.headers?.authorization)");
      expect(body).toContain("user.id");
      expect(body).toContain("this.tenantContext(req, tenantCode)");
      expect(body).not.toContain('@Query("userId")');
    });
  }
});
