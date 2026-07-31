import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync("src/modules/public/public.service.ts", "utf8");
const controller = readFileSync("src/modules/public/public.controller.ts", "utf8");
const entity = readFileSync("src/entities/frequent-registrant.entity.ts", "utf8");

describe("frequent registrants privacy", () => {
  it("scopes every read, write and delete to the authenticated user and resolved tenant", () => {
    const start = service.indexOf("async myFrequentRegistrants");
    const end = service.indexOf("private publicFrequentRegistrant");
    const body = service.slice(start, end);
    expect(body).toContain('user: { id: user.id }, tenant: tenant ? { id: tenant.id } : IsNull()');
    expect(body).toContain('async deleteFrequentRegistrant(user: User, id: number, context?: PublicTenantContext)');
    expect(body).toContain('throw new NotFoundException("常用报名人不存在")');
  });

  it("keeps the API authenticated and records private by relation", () => {
    expect(controller).toContain('@Get("me/frequent-registrants")');
    expect(controller).toContain('@Delete("me/frequent-registrants/:id")');
    expect(controller).toContain('this.service.requireUserFromAuthorization(req.headers?.authorization)');
    expect(entity).toContain('@ManyToOne(() => User, { onDelete: "CASCADE" })');
    expect(entity).toContain('@ManyToOne(() => Tenant, { nullable: true, onDelete: "SET NULL" })');
  });
});
