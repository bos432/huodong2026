import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { AdminRole, AdminRoles } from "./admin-roles";
import { CurrentAdmin } from "./current-admin.decorator";
import { ReleaseReadinessService } from "./release-readiness.service";

type ReadinessAdmin = { id: number; username: string; role?: string; tenantId?: number | null };

@Controller("admin/release-readiness")
export class ReleaseReadinessController {
  constructor(private readonly service: ReleaseReadinessService) {}

  @Get() @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance)
  list(@CurrentAdmin() admin: ReadinessAdmin) { return this.service.list(admin); }

  @Get("summary") @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance)
  summary(@CurrentAdmin() admin: ReadinessAdmin) { return this.service.summary(admin); }

  @Put("items/:key") @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator)
  update(@Param("key") key: string, @Body() body: Record<string, unknown>, @CurrentAdmin() admin: ReadinessAdmin) { return this.service.updateItem(admin, key, body); }

  @Post("items/:key/check") @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance)
  check(@Param("key") key: string, @CurrentAdmin() admin: ReadinessAdmin) { return this.service.check(admin, key); }

  @Post("items/:key/verify") @AdminRoles(AdminRole.SuperAdmin)
  verify(@Param("key") key: string, @Body() body: Record<string, unknown>, @CurrentAdmin() admin: ReadinessAdmin) { return this.service.verify(admin, key, body); }

  @Post("items/:key/block") @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator)
  block(@Param("key") key: string, @Body() body: Record<string, unknown>, @CurrentAdmin() admin: ReadinessAdmin) { return this.service.block(admin, key, body); }

  @Get("events") @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance)
  events(@CurrentAdmin() admin: ReadinessAdmin) { return this.service.eventList(admin); }

  @Get("fixtures") @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance)
  fixtures(@CurrentAdmin() admin: ReadinessAdmin) { return this.service.fixtureList(admin); }

  @Post("fixtures") @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator)
  createFixture(@Body() body: Record<string, unknown>, @CurrentAdmin() admin: ReadinessAdmin) { return this.service.createFixture(admin, body); }
}
