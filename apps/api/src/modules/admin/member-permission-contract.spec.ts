import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd());
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("member center permission and privacy contract", () => {
  const permissions = read("src/modules/admin/admin-permissions.ts");
  const controller = read("src/modules/admin/admin.controller.ts");
  const service = read("src/modules/admin/admin.service.ts");
  const dto = read("src/modules/admin/dto.ts");
  const adminView = read("../admin/src/views/Members.vue");

  it("defines seven read-first member permissions and dedicated endpoints", () => {
    for (const permission of ["member.view", "member.manage", "member.password", "member.points.manage", "member.lifecycle.manage", "member.sensitive", "member.export"]) expect(permissions).toContain(`{ key: "${permission}"`);
    expect(permissions).toContain('"member.sensitive": ["member.view"]');
    expect(controller).toContain('@Get("members/options")');
    expect(controller).toContain('@Get("members/export")');
  });

  it("validates paging, filters, and point idempotency", () => {
    expect(dto).toContain("export class MemberQueryDto");
    expect(dto).toContain('@Length(8, 128)\n  idempotencyKey!: string');
    expect(dto).toContain('@Max(100) pageSize?: number');
    expect(service).toContain("validateMemberQuery");
    expect(service).toContain("rows.length < 10000");
  });

  it("uses explicit member projections instead of returning eager user and asset entities", () => {
    expect(service).toContain("private publicMemberUser");
    expect(service).toContain("private publicMemberProfile");
    expect(service).toContain("private publicMemberDetail");
    expect(service).toContain("sensitiveMasked: !includeSensitive");
    expect(service).not.toContain("return this.sanitizeMemberDetail");
    expect(service).not.toContain("return activity ? profiles.map((profile) => ({ ...profile");
  });

  it("serializes point changes and lifecycle scans", () => {
    expect(service).toContain("withMemberNamedLock");
    expect(service).toContain('member:points:${tenantScopeKey}:${userId}');
    expect(service).toContain('member:lifecycle:${scopeKey}');
    expect(service).toContain('sourceType: "admin_point_adjust", sourceId');
  });

  it("keeps the PC page permission-aware and avoids unconditional tenant or wallet requests", () => {
    for (const permission of ["member.points.manage", "member.lifecycle.manage", "member.sensitive", "member.export"]) expect(adminView).toContain(`hasPermission("${permission}")`);
    expect(adminView).toContain('"/admin/members/options"');
    expect(adminView).toContain("canViewWallet.value ? api.get");
    expect(adminView).not.toContain('api.get<any, any[]>("/admin/tenants")');
    expect(adminView).not.toContain("row.user.openid ?");
  });
});
