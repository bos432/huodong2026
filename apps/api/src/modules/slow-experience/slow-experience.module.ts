import { Body, Controller, Delete, Get, Header, Module, Param, ParseIntPipe, Patch, Post, Query, Req, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { SlowExperienceRecord } from "../../entities/slow-experience-record.entity";
import { SlowExperienceEvent } from "../../entities/slow-experience-event.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { ContentKeywordRule } from "../../entities/content-keyword-rule.entity";
import { ContentUserSanction } from "../../entities/content-user-sanction.entity";
import { PublicModule } from "../public/public.module";
import { PublicService, PublicTenantContext } from "../public/public.service";
import { AdminModule } from "../admin/admin.module";
import { AdminRole, AdminRoles } from "../admin/admin-roles";
import { CurrentAdmin } from "../admin/current-admin.decorator";
import { SlowExperienceService } from "./slow-experience.service";
import { CreateSlowRecordDto, ReviewSlowRecordDto, UpdateSlowRecordDto } from "./dto";

@Controller("public")
export class SlowExperienceController {
  constructor(private readonly service: SlowExperienceService, private readonly members: PublicService) {}
  private context(req: any, tenantCode?: string): PublicTenantContext {
    const header = req.headers?.["x-tenant-code"];
    const host = req.headers?.["x-forwarded-host"] || req.headers?.host;
    return { tenantCode: tenantCode || (typeof header === "string" ? header : Array.isArray(header) ? header[0] : null), host: typeof host === "string" ? host : null };
  }
  private async member(req: any, tenantCode?: string, write = false) {
    const user = await this.members.requireUserFromAuthorization(req.headers?.authorization);
    const context = this.context(req, tenantCode);
    const tenant = write ? await this.members.assertFeatureGateEnabled(context, "communityPublish") : await this.members.memberTenantContext(context);
    if (write) await this.members.assertFeatureGateEnabled(context, "userContentSharing");
    return { userId: user.id, tenantId: tenant?.id ?? null };
  }
  @Get("me/slow-experiences")
  async mine(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("page") page?: string) { const member = await this.member(req, tenantCode); return this.service.mine(member.userId, member.tenantId, Number(page)); }
  @Post("me/slow-experiences")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  async create(@Req() req: any, @Body() dto: CreateSlowRecordDto, @UploadedFile() file?: Express.Multer.File, @Query("tenantCode") tenantCode?: string) { const member = await this.member(req, tenantCode, true); return this.service.create(member.userId, member.tenantId, dto, dto.businessKey, file); }
  @Get("me/slow-experiences/:id")
  async ownedDetail(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) { const member = await this.member(req, tenantCode); return this.service.ownedDetail(id, member.userId, member.tenantId); }
  @Patch("me/slow-experiences/:id")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  async update(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Body() dto: UpdateSlowRecordDto, @UploadedFile() file?: Express.Multer.File, @Query("tenantCode") tenantCode?: string) { const member = await this.member(req, tenantCode, true); return this.service.update(id, member.userId, member.tenantId, dto, file); }
  @Post("me/slow-experiences/:id/edit")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  async editWithPhoto(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Body() dto: UpdateSlowRecordDto, @UploadedFile() file?: Express.Multer.File, @Query("tenantCode") tenantCode?: string) { const member = await this.member(req, tenantCode, true); return this.service.update(id, member.userId, member.tenantId, dto, file); }
  @Post("me/slow-experiences/:id/photo")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  async upload(@Param("id", ParseIntPipe) id: number, @Req() req: any, @UploadedFile() file?: Express.Multer.File, @Query("tenantCode") tenantCode?: string) { const member = await this.member(req, tenantCode, true); return this.service.uploadPhoto(id, member.userId, member.tenantId, file); }
  @Delete("me/slow-experiences/:id")
  async remove(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) { const member = await this.member(req, tenantCode); return this.service.remove(id, member.userId, member.tenantId); }
  @Get("slow-experiences")
  @Header("Cache-Control", "no-store")
  async publicList(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("page") page?: string) { const tenant = await this.members.assertFeatureGateEnabled(this.context(req, tenantCode), "userContentSharing"); return this.service.publicList(tenant?.id ?? null, Number(page)); }
  @Get("slow-experiences/:id")
  @Header("Cache-Control", "no-store")
  async publicDetail(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) { const tenant = await this.members.assertFeatureGateEnabled(this.context(req, tenantCode), "userContentSharing"); return this.service.publicDetail(id, tenant?.id ?? null); }
  @Get("slow-experiences/photos/:token")
  async photo(@Param("token") token: string, @Res() response: Response) {
    const photo = await this.service.photo(token);
    if (photo.public) await this.members.assertFeatureGateEnabled({ tenantId: photo.tenantId ?? undefined }, "userContentSharing");
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.type(photo.mimetype).send(photo.buffer);
  }
}

@Controller("admin/slow-experiences")
@AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator)
export class SlowExperienceAdminController {
  constructor(private readonly service: SlowExperienceService) {}
  @Get()
  list(@CurrentAdmin() admin: any, @Query("page") page?: string) { return this.service.adminList(admin, Number(page)); }
  @Patch(":id/review")
  review(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: any, @Body() dto: ReviewSlowRecordDto) { return this.service.review(id, admin, dto.status, dto.revision, dto.remark || ""); }
}

@Module({ imports: [PublicModule, AdminModule, TypeOrmModule.forFeature([SlowExperienceRecord, SlowExperienceEvent, AdminUser, ContentKeywordRule, ContentUserSanction])], controllers: [SlowExperienceController, SlowExperienceAdminController], providers: [SlowExperienceService] })
export class SlowExperienceModule {}
