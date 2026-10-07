import { Body, Controller, Get, Inject, Injectable, Module, Param, ParseIntPipe, Patch, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { createHmac } from "node:crypto";
import { Repository } from "typeorm";
import { ExperienceProject } from "../../entities/experience-project.entity";
import { ExperienceApplication } from "../../entities/experience-application.entity";
import { ExperienceFeedback } from "../../entities/experience-feedback.entity";
import { Tenant } from "../../entities/tenant.entity";
import { User } from "../../entities/user.entity";
import { Activity } from "../../entities/activity.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { AdminRole, AdminRoles } from "../admin/admin-roles";
import { CurrentAdmin } from "../admin/current-admin.decorator";
import { AdminModule } from "../admin/admin.module";

type AdminContext = { id: number; role?: string; tenantId?: number | null };

@Injectable()
export class ExperienceService {
  constructor(@InjectRepository(ExperienceProject) private readonly projects: Repository<ExperienceProject>, @InjectRepository(ExperienceApplication) private readonly applications: Repository<ExperienceApplication>, @InjectRepository(ExperienceFeedback) private readonly feedbacks: Repository<ExperienceFeedback>, @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>, @InjectRepository(User) private readonly users: Repository<User>, @InjectRepository(Activity) private readonly activities: Repository<Activity>, private readonly config: ConfigService) {}
  userId(req: any): number {
    const raw = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "").trim();
    const [payloadText, sign] = raw.split(".");
    if (!payloadText || !sign) throw new UnauthorizedException("登录凭证无效");
    const secret = this.config.get<string>("USER_ACCESS_TOKEN_SECRET") || this.config.get<string>("JWT_SECRET") || this.config.get<string>("H5_AUTH_SECRET") || "dev-h5-auth-secret";
    const expected = createHmac("sha256", secret).update(payloadText).digest("base64url");
    if (sign !== expected) throw new UnauthorizedException("登录凭证无效");
    let payload: any;
    try { payload = JSON.parse(Buffer.from(payloadText, "base64url").toString("utf8")); } catch { throw new UnauthorizedException("登录凭证无效"); }
    if (payload?.scope !== "user" || !Number.isInteger(payload.sub) || !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) throw new UnauthorizedException("登录已失效");
    return Number(payload.sub);
  }
  private async tenant(code?: string, tenantId?: number | null) { const row = tenantId ? await this.tenants.findOneBy({ id: tenantId }) : await this.tenants.findOne({ where: { code: code || "qiwai-showcase", enabled: true } }); if (!row) throw new Error("商家不存在"); return row; }
  private viewProject(row: ExperienceProject) { return { id: row.id, title: row.title, description: row.description, quota: row.quota, approvedCount: row.approvedCount, remaining: row.quota > 0 ? Math.max(row.quota - row.approvedCount, 0) : -1, status: row.status, activity: row.activity ? { id: row.activity.id, title: row.activity.title } : null, applyDeadline: row.applyDeadline, createdAt: row.createdAt, updatedAt: row.updatedAt }; }
  async list(code?: string) { const tenant = await this.tenant(code); const rows = await this.projects.find({ where: { tenant: { id: tenant.id }, status: "open" }, order: { createdAt: "DESC" } }); return rows.map((row) => this.viewProject(row)); }
  async my(userId: number, code?: string) { const tenant = await this.tenant(code); const rows = await this.applications.find({ where: { tenant: { id: tenant.id }, user: { id: userId } }, order: { createdAt: "DESC" } }); const feedbacks = rows.length ? await this.feedbacks.find({ where: { tenant: { id: tenant.id }, user: { id: userId } } }) : []; const feedbackByApplication = new Map(feedbacks.map((row) => [row.application.id, row])); return rows.map((row) => { const feedback = feedbackByApplication.get(row.id); return { id: row.id, status: row.status, reason: row.reason, reviewRemark: row.reviewRemark, project: this.viewProject(row.project), feedback: feedback ? { id: feedback.id, rating: feedback.rating, content: feedback.content, status: feedback.status, reviewRemark: feedback.reviewRemark, createdAt: feedback.createdAt } : null }; }); }
  async apply(projectId: number, userId: number, reason?: string, code?: string) {
    const tenant = await this.tenant(code);
    return this.projects.manager.transaction(async (manager) => {
      const projectRepo = manager.getRepository(ExperienceProject);
      const applicationRepo = manager.getRepository(ExperienceApplication);
      const project = await projectRepo.createQueryBuilder("project")
        .where("project.id = :projectId AND project.tenantId = :tenantId", { projectId, tenantId: tenant.id })
        .setLock("pessimistic_write")
        .getOne();
      if (!project || project.status !== "open") throw new Error("体验项目暂未开放");
      if (project.quota > 0 && project.approvedCount >= project.quota) throw new Error("体验名额已满");
      const user = await manager.getRepository(User).findOneBy({ id: userId });
      if (!user) throw new Error("用户不存在");
      const exists = await applicationRepo.findOne({ where: { project: { id: projectId }, user: { id: userId } } });
      if (exists) return exists;
      return applicationRepo.save(applicationRepo.create({ tenant, project, user, reason: String(reason || "").trim().slice(0, 2000) || null, status: "pending", reviewRemark: null, reviewedAt: null }));
    });
  }
  async feedback(applicationId: number, userId: number, body: { rating?: number; content?: string }, code?: string) {
    const tenant = await this.tenant(code);
    const content = String(body?.content || "").trim();
    if (content.length < 10) throw new Error("反馈至少 10 个字");
    return this.projects.manager.transaction(async (manager) => {
      const applicationRepo = manager.getRepository(ExperienceApplication);
      const feedbackRepo = manager.getRepository(ExperienceFeedback);
      const application = await applicationRepo.createQueryBuilder("application")
        .where("application.id = :applicationId AND application.tenantId = :tenantId AND application.userId = :userId", { applicationId, tenantId: tenant.id, userId })
        .setLock("pessimistic_write")
        .getOne();
      if (!application || application.status !== "approved") throw new Error("只有已通过的体验申请可以反馈");
      const existing = await feedbackRepo.findOne({ where: { application: { id: applicationId } } });
      if (existing) return existing;
      const saved = await feedbackRepo.save(feedbackRepo.create({ tenant, project: application.project, application, user: application.user, rating: Math.min(Math.max(Number(body.rating || 5), 1), 5), content, status: "pending", reviewRemark: null, reviewedAt: null }));
      application.status = "feedback_submitted";
      await applicationRepo.save(application);
      return saved;
    });
  }
  async adminList(admin: AdminContext) { const tenant = await this.tenant(undefined, admin.tenantId); const projects = await this.projects.find({ where: { tenant: { id: tenant.id } }, order: { createdAt: "DESC" } }); const applications = await this.applications.find({ where: { tenant: { id: tenant.id } }, order: { createdAt: "DESC" } }); const feedbacks = await this.feedbacks.find({ where: { tenant: { id: tenant.id } } }); const activities = await this.activities.find({ where: { tenant: { id: tenant.id } }, order: { startTime: "DESC" }, take: 200 }); const approvedApplications = applications.filter((row) => row.status === "approved" || row.status === "feedback_submitted").length; const projectViews = projects.map((row) => { const projectApplications = applications.filter((item) => item.project.id === row.id); const projectFeedbacks = feedbacks.filter((item) => item.project.id === row.id); const projectApproved = projectApplications.filter((item) => item.status === "approved" || item.status === "feedback_submitted").length; return { ...this.viewProject(row), funnel: { applicationCount: projectApplications.length, approvedApplicationCount: projectApproved, approvalRate: projectApplications.length ? Math.round((projectApproved / projectApplications.length) * 100) : 0, feedbackCount: projectFeedbacks.length, approvedFeedbackCount: projectFeedbacks.filter((item) => item.status === "approved").length } }; }); return { tenant: { id: tenant.id, code: tenant.code, name: tenant.name }, metrics: { projectCount: projects.length, openProjectCount: projects.filter((row) => row.status === "open").length, applicationCount: applications.length, approvedApplicationCount: approvedApplications, approvalRate: applications.length ? Math.round((approvedApplications / applications.length) * 100) : 0, feedbackCount: feedbacks.length, approvedFeedbackCount: feedbacks.filter((row) => row.status === "approved").length }, activities: activities.map((row) => ({ id: row.id, title: row.title, startTime: row.startTime, status: (row as any).status || null })), projects: projectViews, applications: applications.map((row) => ({ id: row.id, status: row.status, reason: row.reason, project: this.viewProject(row.project), user: { id: row.user.id, nickname: row.user.nickname, maskedPhone: row.user.phone ? `${String(row.user.phone).slice(0, 3)}****${String(row.user.phone).slice(-4)}` : null }, reviewRemark: row.reviewRemark, createdAt: row.createdAt })) }; }
  async update(id: number, body: { title?: string; description?: string; quota?: number; activityId?: number | null; status?: string }, admin: AdminContext) { const tenant = await this.tenant(undefined, admin.tenantId); const project = await this.projects.findOne({ where: { id, tenant: { id: tenant.id } } }); if (!project) throw new Error("体验项目不存在"); const title = String(body.title ?? project.title).trim(); if (!title) throw new Error("请填写体验项目名称"); const nextQuota = body.quota === undefined ? project.quota : Math.max(Number(body.quota || 0), 0); if (nextQuota > 0 && nextQuota < project.approvedCount) throw new Error("名额不能低于已通过人数"); const activity = body.activityId === null || body.activityId === undefined ? project.activity : await this.activities.findOne({ where: { id: Number(body.activityId), tenant: { id: tenant.id } } }); if (body.activityId && !activity) throw new Error("关联活动不存在或不属于当前商家"); project.title = title; project.description = body.description === undefined ? project.description : String(body.description || "").trim().slice(0, 5000) || null; project.quota = nextQuota; project.activity = activity || null; if (body.status !== undefined) { const status = String(body.status); if (!["draft", "open", "closed", "archived"].includes(status)) throw new Error("项目状态无效"); project.status = status as any; } return this.projects.save(project); }
  async create(body: { title?: string; description?: string; quota?: number; activityId?: number; status?: string }, admin: AdminContext) { const tenant = await this.tenant(undefined, admin.tenantId); const title = String(body.title || "").trim(); if (!title) throw new Error("请填写体验项目名称"); const activity = body.activityId ? await this.activities.findOne({ where: { id: Number(body.activityId), tenant: { id: tenant.id } } }) : null; if (body.activityId && !activity) throw new Error("关联活动不存在或不属于当前商家"); return this.projects.save(this.projects.create({ tenant, activity, title, description: String(body.description || "").trim().slice(0, 5000) || null, quota: Math.max(Number(body.quota || 0), 0), approvedCount: 0, status: ["draft", "open", "closed"].includes(String(body.status)) ? body.status as any : "draft", applyDeadline: null })); }
  async reviewApplication(id: number, body: { status?: string; remark?: string }, admin: AdminContext) {
    const tenant = await this.tenant(undefined, admin.tenantId);
    const next = String(body.status || "");
    if (!["approved", "rejected"].includes(next)) throw new Error("审核状态无效");
    return this.projects.manager.transaction(async (manager) => {
      const projectRepo = manager.getRepository(ExperienceProject);
      const applicationRepo = manager.getRepository(ExperienceApplication);
      const row = await applicationRepo.findOne({ where: { id, tenant: { id: tenant.id } } });
      if (!row) throw new Error("体验申请不存在");
      if (row.status === "approved" && next !== "approved") throw new Error("已通过申请不能直接改为其他状态");
      if (row.status === "feedback_submitted" && next === "approved") throw new Error("已反馈申请不能重复占用体验名额");
      if (next === "approved" && row.status !== "approved") {
        const project = await projectRepo.createQueryBuilder("project")
          .where("project.id = :id", { id: row.project.id })
          .setLock("pessimistic_write")
          .getOne();
        if (!project) throw new Error("体验项目不存在");
        if (project.quota > 0 && project.approvedCount >= project.quota) throw new Error("体验名额已满");
        project.approvedCount += 1;
        await projectRepo.save(project);
        row.project = project;
      }
      row.status = next as any;
      row.reviewRemark = String(body.remark || "").trim().slice(0, 2000) || null;
      row.reviewedAt = new Date();
      return applicationRepo.save(row);
    });
  }
  async adminFeedback(admin: AdminContext) { const tenant = await this.tenant(undefined, admin.tenantId); const rows = await this.feedbacks.find({ where: { tenant: { id: tenant.id } }, order: { createdAt: "DESC" } }); return rows.map((row) => ({ id: row.id, status: row.status, rating: row.rating, content: row.content, project: this.viewProject(row.project), user: { id: row.user.id, phone: row.user.phone ? `${String(row.user.phone).slice(0, 3)}****${String(row.user.phone).slice(-4)}` : null }, reviewRemark: row.reviewRemark, createdAt: row.createdAt })); }
  async reviewFeedback(id: number, body: { status?: string; remark?: string }, admin: AdminContext) { const tenant = await this.tenant(undefined, admin.tenantId); const row = await this.feedbacks.findOne({ where: { id, tenant: { id: tenant.id } } }); if (!row) throw new Error("体验反馈不存在"); const next = String(body.status || ""); if (!["approved", "rejected"].includes(next)) throw new Error("反馈状态无效"); row.status = next as any; row.reviewRemark = String(body.remark || "").trim().slice(0, 2000) || null; row.reviewedAt = new Date(); return this.feedbacks.save(row); }
}

@Controller("public/experiences")
export class ExperiencePublicController {
  constructor(@Inject(ExperienceService) private readonly service: ExperienceService) {}
  @Get() list(@Query("tenantCode") code?: string) { return this.service.list(code); }
  @Get("my") my(@Req() req: any, @Query("tenantCode") code?: string) { return this.service.my(this.service.userId(req), code); }
  @Post(":id/apply") apply(@Param("id", ParseIntPipe) id: number, @Body() body: { reason?: string }, @Req() req: any, @Query("tenantCode") code?: string) { return this.service.apply(id, this.service.userId(req), body?.reason, code); }
  @Post("applications/:id/feedback") feedback(@Param("id", ParseIntPipe) id: number, @Body() body: { rating?: number; content?: string }, @Req() req: any, @Query("tenantCode") code?: string) { return this.service.feedback(id, this.service.userId(req), body, code); }
}

@Controller("admin/experiences")
export class ExperienceAdminController {
  constructor(@Inject(ExperienceService) private readonly service: ExperienceService) {}
  @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator) @Get() list(@CurrentAdmin() admin: AdminContext) { return this.service.adminList(admin); }
  @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator) @Post() create(@Body() body: { title?: string; description?: string; quota?: number; activityId?: number; status?: string }, @CurrentAdmin() admin: AdminContext) { return this.service.create(body, admin); }
  @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator) @Patch(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: { title?: string; description?: string; quota?: number; activityId?: number | null; status?: string }, @CurrentAdmin() admin: AdminContext) { return this.service.update(id, body, admin); }
  @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator) @Patch("applications/:id/review") review(@Param("id", ParseIntPipe) id: number, @Body() body: { status?: string; remark?: string }, @CurrentAdmin() admin: AdminContext) { return this.service.reviewApplication(id, body, admin); }
  @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator) @Get("feedback") feedback(@CurrentAdmin() admin: AdminContext) { return this.service.adminFeedback(admin); }
  @AdminRoles(AdminRole.SuperAdmin, AdminRole.Operator) @Patch("feedback/:id/review") reviewFeedback(@Param("id", ParseIntPipe) id: number, @Body() body: { status?: string; remark?: string }, @CurrentAdmin() admin: AdminContext) { return this.service.reviewFeedback(id, body, admin); }
}

@Module({ imports: [AdminModule, JwtModule.register({ secret: process.env.JWT_SECRET || "dev-secret-change-me" }), TypeOrmModule.forFeature([ExperienceProject, ExperienceApplication, ExperienceFeedback, Tenant, User, Activity, AdminUser])], controllers: [ExperiencePublicController, ExperienceAdminController], providers: [ExperienceService] })
export class ExperienceModule {}
