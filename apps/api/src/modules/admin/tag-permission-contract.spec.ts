import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("user tag and member segment permission contract", () => {
  const permissions = read("apps/api/src/modules/admin/admin-permissions.ts");
  const controller = read("apps/api/src/modules/admin/admin.controller.ts");
  const service = read("apps/api/src/modules/admin/admin.service.ts");
  const notificationService = read("apps/api/src/modules/v1/v1.service.ts");
  const page = read("apps/admin/src/views/UserTags.vue");
  const router = read("apps/admin/src/router.ts");
  const menu = read("apps/admin/src/navigation/admin-menu.ts");

  it("separates view, manage, and sensitive permissions", () => {
    expect(permissions).toContain('{ key: "tag.view"');
    expect(permissions).toContain('"tag.manage": ["tag.view"]');
    expect(permissions).toContain('"tag.sensitive": ["tag.view"]');
    expect(router).toContain('path: "tags", component: UserTags, meta: { roles: ["tag.view"]');
    expect(menu).toContain('label: "用户标签", roles: ["tag.view"]');
    expect(page).toContain('hasPermission("tag.manage")');
    expect(page).toContain('hasPermission("tag.sensitive")');
    expect(page).toContain('v-if="canManage" label="操作"');
  });

  it("uses dedicated options, validated pagination, and activity scope", () => {
    expect(controller).toContain('@Get("tags/options")');
    expect(controller).toContain('@Query() query: UserTagQueryDto');
    expect(page).toContain('api.get<any, { activities: any[]; levels: any[] }>("/admin/tags/options")');
    expect(page).not.toContain('"/admin/activities"');
    expect(service).toContain('this.tagPagination(query.page, query.pageSize)');
    expect(service).toContain('this.applyTagMemberDataScope(builder, "user", admin)');
    expect(service).toContain('this.assertTagMemberAccess(query.userId, admin)');
  });

  it("returns explicit masked projections without login identities", () => {
    expect(service).toContain('phone: includeSensitive ? user.phone : maskPhone(user.phone)');
    expect(service).toContain('rows.map((row) => this.publicUserTag(row, includeSensitive))');
    expect(service).toContain('items.map((row) => this.publicMemberSegmentProfile(row, includeSensitive))');
    expect(service).toContain('createdBy: includeSensitive ? row.createdBy : null');
    expect(page).toContain('maskPhone(phone)');
    expect(service).not.toContain('return this.sanitizeMemberDetail({ activity, users, tags })');
  });

  it("keeps writes idempotent and audited", () => {
    expect(service).toContain('if (!isDuplicateEntryError(error)) throw error');
    expect(service).toContain('this.logOperation(admin, "user_tag.create"');
    expect(service).toContain('this.logOperation(admin, "user_tag.delete"');
    expect(service).toContain('this.logOperation(admin, "user_tag.bulk_activity"');
    expect(service).toContain('this.logOperation(admin, "member_segment.snapshot"');
    expect(service).toContain('this.assertStrictTenantOwnership(tag, admin, "标签不存在或不属于当前商家")');
    expect(service).toContain('SELECT GET_LOCK(?, 15) AS acquired');
    expect(service).toContain('tenantScopeKey: scope.scopeKey, segment: { id: segmentId }, businessKey: idempotencyKey');
    expect(service).toContain('INSERT INTO member_segment_snapshot_members');
    expect(service).toContain('member-tags.behavior-refresh');
  });

  it("isolates same-name notification tags and rejects oversized audiences explicitly", () => {
    expect(notificationService).toContain('tag.tenantScopeKey = :targetScopeKey');
    expect(notificationService).toContain('.take(10001)');
    expect(notificationService).toContain('当前标签会员超过 10000 人，请拆分人群后分批发送');
    expect(notificationService).not.toContain('.take(300);\n    if (isTenantScopedActor(admin))');
  });
});
