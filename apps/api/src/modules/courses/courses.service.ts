import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import ExcelJS from "exceljs";
import { DataSource, EntityManager, In, IsNull, Repository } from "typeorm";
import { AdminUser } from "../../entities/admin-user.entity";
import { Course } from "../../entities/course.entity";
import { CourseChapter } from "../../entities/course-chapter.entity";
import { CourseLesson } from "../../entities/course-lesson.entity";
import { CourseOrder, CourseOrderStatus } from "../../entities/course-order.entity";
import { CourseTeacher } from "../../entities/course-teacher.entity";
import { CourseResourceAccessLog } from "../../entities/course-resource-access-log.entity";
import { MemberLevel } from "../../entities/member-level.entity";
import { MemberProfile } from "../../entities/member-profile.entity";
import { normalizedCourseCompletionThreshold } from "../../shared/course-access-mode";
import { CourseAssessment } from "../../entities/course-assessment.entity";
import { CourseQuestion } from "../../entities/course-question.entity";
import { CourseAssessmentAttempt } from "../../entities/course-assessment-attempt.entity";
import { CourseAssessmentAnswer } from "../../entities/course-assessment-answer.entity";
import { assessmentPassed } from "../../shared/course-assessment-grading";
import { CourseAssessmentGrant } from "../../entities/course-assessment-grant.entity";
import { CourseReview } from "../../entities/course-review.entity";
import { CourseQa } from "../../entities/course-qa.entity";
import { CourseAnnouncement } from "../../entities/course-announcement.entity";
import { CourseCertificateTemplate } from "../../entities/course-certificate-template.entity";
import { CourseRefund } from "../../entities/course-refund.entity";
import { Order } from "../../entities/order.entity";
import { Certificate } from "../../entities/certificate.entity";
import { CommunityActivity } from "../../entities/community-activity.entity";
import { CommunityActivityMember } from "../../entities/community-activity-member.entity";
import { CheckInTask } from "../../entities/checkin-task.entity";
import { CommunityCheckIn } from "../../entities/community-checkin.entity";
import { CommunityPost, CommunityPostStatus } from "../../entities/community-post.entity";
import { CommunityPostComment, CommunityPostCommentStatus } from "../../entities/community-post-comment.entity";
import { CommunityPostLike } from "../../entities/community-post-like.entity";
import { CommunityPostFavorite } from "../../entities/community-post-favorite.entity";
import { CommunityUserFollow } from "../../entities/community-user-follow.entity";
import { SocialProfile, SocialProfileStatus } from "../../entities/social-profile.entity";
import { CommunityNotification } from "../../entities/community-notification.entity";
import { CommunityContentReport } from "../../entities/community-content-report.entity";
import { ContentAppeal } from "../../entities/content-appeal.entity";
import { ContentKeywordRule } from "../../entities/content-keyword-rule.entity";
import { ContentUserSanction } from "../../entities/content-user-sanction.entity";
import { ForumCategory } from "../../entities/forum-category.entity";
import { ForumCategoryModerator } from "../../entities/forum-category-moderator.entity";
import { ForumFavorite } from "../../entities/forum-favorite.entity";
import { ForumNotification } from "../../entities/forum-notification.entity";
import { ForumReply, ForumReplyStatus } from "../../entities/forum-reply.entity";
import { ForumReport, ForumReportStatus } from "../../entities/forum-report.entity";
import { ForumTopic, ForumTopicStatus } from "../../entities/forum-topic.entity";
import { ForumViewLog } from "../../entities/forum-view-log.entity";
import { Tenant } from "../../entities/tenant.entity";
import { User } from "../../entities/user.entity";
import { UserLearning } from "../../entities/user-learning.entity";
import { UserWallet } from "../../entities/user-wallet.entity";
import { WalletTransaction } from "../../entities/wallet-transaction.entity";
import { PaymentMethod } from "../../shared/domain";
import { fenToYuan, yuanToFen } from "../../shared/money";
import { applyTenantScopeToQuery, assertTenantAccessForActor, tenantRelationForActor } from "../../shared/tenant-scope";
import { TenantEntitlementFeature, tenantFeatureAccess, tenantSubscriptionWriteRestriction } from "../admin/tenant-subscription";
import { validatedCourseResourceFile } from "../../shared/upload-security";
import { ConfigService } from "@nestjs/config";
import { claimPrivateDocument, privateDocumentExists, storePrivateDocument } from "../../shared/private-document";
import { createPrivateAssetToken, verifyPrivateAssetToken } from "../../shared/private-asset-token";
import { assertUploadMalwareSafe, uploadMalwareScanConfig } from "../../shared/upload-malware-scan";
import { V1Service } from "../v1/v1.service";
import { communityNotificationTargets } from "../../shared/community-interaction-policy";
import { isDuplicateEntryError } from "../../shared/database-errors";
import { memberLevelScopeKey } from "../../shared/member-level-engine";
import { effectivePermissionsForAdmin } from "../admin/admin-permissions";
import { maskPhone } from "../../shared/data-masking";
import { PaymentProviderService, SupportedPaymentProvider } from "../public/payment-provider.service";
import { BusinessJobService } from "../reliability/business-job.service";

type AdminContext = { id?: number; username?: string; role?: string; tenantId?: number | null; permissions?: string[] };

@Injectable()
export class CoursesService implements OnModuleInit {
  constructor(
    @InjectRepository(Course) private courses: Repository<Course>,
    @InjectRepository(CourseChapter) private chapters: Repository<CourseChapter>,
    @InjectRepository(CourseLesson) private lessons: Repository<CourseLesson>,
    @InjectRepository(CourseOrder) private courseOrders: Repository<CourseOrder>,
    @InjectRepository(CourseTeacher) private courseTeachers: Repository<CourseTeacher>,
    @InjectRepository(CourseResourceAccessLog) private courseResourceAccessLogs: Repository<CourseResourceAccessLog>,
    @InjectRepository(MemberLevel) private memberLevels: Repository<MemberLevel>,
    @InjectRepository(CourseAssessment) private assessments: Repository<CourseAssessment>,
    @InjectRepository(CourseQuestion) private questions: Repository<CourseQuestion>,
    @InjectRepository(CourseAssessmentAttempt) private attempts: Repository<CourseAssessmentAttempt>,
    @InjectRepository(CourseAssessmentAnswer) private assessmentAnswers: Repository<CourseAssessmentAnswer>,
    @InjectRepository(CourseAssessmentGrant) private assessmentGrants: Repository<CourseAssessmentGrant>,
    @InjectRepository(CourseReview) private courseReviews: Repository<CourseReview>,
    @InjectRepository(CourseQa) private courseQa: Repository<CourseQa>,
    @InjectRepository(CourseAnnouncement) private courseAnnouncements: Repository<CourseAnnouncement>,
    @InjectRepository(CourseCertificateTemplate) private courseCertificateTemplates: Repository<CourseCertificateTemplate>,
    @InjectRepository(CourseRefund) private courseRefunds: Repository<CourseRefund>,
    @InjectRepository(Certificate) private certificates: Repository<Certificate>,
    @InjectRepository(CommunityActivity) private communityActivities: Repository<CommunityActivity>,
    @InjectRepository(CommunityActivityMember) private communityActivityMembers: Repository<CommunityActivityMember>,
    @InjectRepository(CheckInTask) private checkinTasks: Repository<CheckInTask>,
    @InjectRepository(CommunityCheckIn) private communityCheckins: Repository<CommunityCheckIn>,
    @InjectRepository(CommunityPost) private communityPosts: Repository<CommunityPost>,
    @InjectRepository(CommunityPostLike) private communityPostLikes: Repository<CommunityPostLike>,
    @InjectRepository(CommunityPostFavorite) private communityPostFavorites: Repository<CommunityPostFavorite>,
    @InjectRepository(CommunityUserFollow) private communityUserFollows: Repository<CommunityUserFollow>,
    @InjectRepository(SocialProfile) private socialProfiles: Repository<SocialProfile>,
    @InjectRepository(CommunityNotification) private communityNotifications: Repository<CommunityNotification>,
    @InjectRepository(CommunityContentReport) private communityContentReports: Repository<CommunityContentReport>,
    @InjectRepository(ContentKeywordRule) private contentKeywordRules: Repository<ContentKeywordRule>,
    @InjectRepository(ContentUserSanction) private contentUserSanctions: Repository<ContentUserSanction>,
    @InjectRepository(ContentAppeal) private contentAppeals: Repository<ContentAppeal>,
    @InjectRepository(CommunityPostComment) private communityPostComments: Repository<CommunityPostComment>,
    @InjectRepository(ForumCategory) private forumCategories: Repository<ForumCategory>,
    @InjectRepository(ForumCategoryModerator) private forumCategoryModerators: Repository<ForumCategoryModerator>,
    @InjectRepository(ForumTopic) private forumTopics: Repository<ForumTopic>,
    @InjectRepository(ForumReply) private forumReplies: Repository<ForumReply>,
    @InjectRepository(ForumReport) private forumReports: Repository<ForumReport>,
    @InjectRepository(ForumFavorite) private forumFavorites: Repository<ForumFavorite>,
    @InjectRepository(ForumViewLog) private forumViewLogs: Repository<ForumViewLog>,
    @InjectRepository(ForumNotification) private forumNotifications: Repository<ForumNotification>,
    @InjectRepository(AdminUser) private adminUsers: Repository<AdminUser>,
    @InjectRepository(Tenant) private tenants: Repository<Tenant>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(UserLearning) private userLearning: Repository<UserLearning>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly notifications: V1Service,
    private readonly paymentProvider: PaymentProviderService,
    private readonly businessJobs: BusinessJobService
  ) {}

  onModuleInit() {
    this.businessJobs.register("course-refund.provider-query", async (payload, job) => {
      const refundId = Number(payload.refundId || 0);
      if (!refundId) throw new Error("Course refund job payload is invalid");
      if (Number(payload.tenantId || 0) !== Number(job.tenantId || 0)) throw new Error("Course refund job tenant does not match payload");
      const refund = await this.queryCourseProviderRefund(refundId, job.tenantId || 0);
      if (!refund) return { skipped: true, reason: "refund_not_found" };
      if (refund.status === "processing") throw new Error(refund.failureReason || "Course provider refund remains processing");
      return { refundId, status: refund.status, providerRefundStatus: refund.providerRefundStatus || null };
    });
  }

  // ===== Courses =====
  async listCourseTeachers(query: { tenantId?: string | number; status?: string }, admin?: AdminContext) {
    const builder = this.courseTeachers.createQueryBuilder("teacher").leftJoinAndSelect("teacher.tenant", "tenant").leftJoinAndSelect("teacher.adminUser", "adminUser").orderBy("teacher.id", "DESC");
    applyTenantScopeToQuery(builder, "teacher", admin);
    this.applyPlatformTenantFilter(builder, "teacher", query.tenantId, admin);
    if (this.isCourseTeacherScoped(admin)) builder.andWhere("teacher.adminUserId = :courseTeacherAdminId", { courseTeacherAdminId: admin!.id });
    if (query.status) builder.andWhere("teacher.status = :status", { status: query.status });
    return (await builder.getMany()).map((teacher) => this.publicCourseTeacher(teacher));
  }

  async listCourseTeacherAccountOptions(query: { tenantId?: string | number }, admin?: AdminContext) {
    const tenantId = admin?.tenantId || Number(query.tenantId || 0) || null;
    const builder = this.adminUsers.createQueryBuilder("candidate").leftJoinAndSelect("candidate.tenant", "tenant").where("candidate.enabled = :enabled", { enabled: true }).orderBy("candidate.username", "ASC");
    if (tenantId) builder.andWhere("candidate.tenantId = :tenantId", { tenantId });
    else builder.andWhere("candidate.tenantId IS NULL");
    if (this.isCourseTeacherScoped(admin)) builder.andWhere("candidate.id = :currentAdminId", { currentAdminId: admin!.id });
    const candidates = await builder.getMany();
    const links = candidates.length ? await this.courseTeachers.createQueryBuilder("teacher").select("teacher.id", "teacher_id").addSelect("teacher.name", "teacher_name").addSelect("teacher.adminUserId", "teacher_adminUserId").where("teacher.adminUserId IN (:...candidateIds)", { candidateIds: candidates.map((item) => item.id) }).getRawMany<any>() : [];
    const linkedByAdminId = new Map(links.map((item) => [Number(item.teacher_adminUserId), { id: Number(item.teacher_id), name: item.teacher_name }]));
    return candidates
      .filter((candidate) => effectivePermissionsForAdmin({ role: candidate.role, tenantId: candidate.tenant?.id || null, permissions: candidate.permissions }).includes("course.teacher_scope"))
      .map((candidate) => ({ id: candidate.id, username: candidate.username, role: candidate.role, enabled: candidate.enabled, linkedTeacher: linkedByAdminId.get(candidate.id) || null }));
  }

  async listCourseMemberLevelOptions(query: { tenantId?: string | number }, admin?: AdminContext) {
    const targetTenantId = admin?.tenantId || Number(query.tenantId || 0) || null;
    const builder = this.memberLevels.createQueryBuilder("level").leftJoinAndSelect("level.tenant", "tenant").orderBy("level.tenantScopeKey", "ASC").addOrderBy("level.sortOrder", "ASC").addOrderBy("level.id", "ASC");
    if (targetTenantId) builder.where("level.tenantScopeKey = :tenantScopeKey", { tenantScopeKey: memberLevelScopeKey({ id: targetTenantId }) });
    return (await builder.getMany()).map((level) => ({ id: level.id, name: level.name, sortOrder: level.sortOrder, tenantId: level.tenant?.id || null }));
  }

  async saveCourseTeacher(dto: any, id?: number, admin?: AdminContext) {
    if (this.isCourseTeacherScoped(admin) && !id) throw new ForbiddenException("讲师账号不能新增其他讲师档案");
    const teacher = id ? await this.courseTeachers.findOne({ where: { id }, relations: { tenant: true, adminUser: true } }) : this.courseTeachers.create({ adminUser: null });
    if (!teacher) throw new NotFoundException("讲师不存在");
    if (id) assertTenantAccessForActor(teacher, admin, "讲师不存在或不属于当前商家");
    if (this.isCourseTeacherScoped(admin) && teacher.adminUser?.id !== admin?.id) throw new NotFoundException("讲师不存在或不属于当前账号");
    teacher.name = String(dto.name || "").trim().slice(0, 100);
    if (!teacher.name) throw new BadRequestException("请填写讲师姓名");
    teacher.avatarUrl = String(dto.avatarUrl || "").trim().slice(0, 500) || null;
    teacher.title = String(dto.title || "").trim().slice(0, 160) || null;
    teacher.bio = String(dto.bio || "").trim().slice(0, 5000) || null;
    teacher.status = dto.status === "disabled" ? "disabled" : "active";
    await this.assignTenant(teacher, dto, admin, "courses");
    if (dto.adminUserId !== undefined) teacher.adminUser = await this.resolveCourseTeacherAdminUser(dto.adminUserId, teacher, admin);
    let saved: CourseTeacher;
    try {
      saved = await this.courseTeachers.save(teacher);
    } catch (error: any) {
      if (isDuplicateEntryError(error) && teacher.adminUser) throw new BadRequestException("该后台账号已绑定其他讲师档案");
      throw error;
    }
    return this.publicCourseTeacher(saved);
  }

  async deleteCourseTeacher(id: number, admin?: AdminContext) {
    if (this.isCourseTeacherScoped(admin)) throw new ForbiddenException("讲师账号不能删除讲师档案");
    const teacher = await this.courseTeachers.findOne({ where: { id }, relations: { tenant: true } });
    if (!teacher) throw new NotFoundException("讲师不存在");
    assertTenantAccessForActor(teacher, admin, "讲师不存在或不属于当前商家");
    const used = await this.courses.count({ where: { teacher: { id } } });
    if (used) throw new BadRequestException(`讲师仍关联 ${used} 门课程，请先调整课程讲师`);
    await this.courseTeachers.delete(id);
    return { success: true };
  }

  async uploadCourseResource(file: Express.Multer.File & { buffer: Buffer }, type: string, courseId: number, admin?: AdminContext) {
    if (!admin?.id) throw new ForbiddenException("请先登录后台");
    if (!Number.isInteger(courseId) || courseId < 1) throw new BadRequestException("请选择课程后再上传资源");
    const course = await this.assertCourseAccess(courseId, admin);
    const resourceType = ["video", "audio", "attachment", "image"].includes(type) ? type : "attachment";
    const validated = validatedCourseResourceFile(file, resourceType);
    if (!validated) throw new BadRequestException("课程资源内容与格式不匹配；视频支持 MP4/WebM，音频支持 MP3/WAV/Ogg，附件支持 PDF/ZIP/DOC/DOCX/TXT");
    await assertUploadMalwareSafe(validated.buffer, uploadMalwareScanConfig(this.config));
    const reference = storePrivateDocument(validated, "course-resources");
    const secret = this.config.get<string>("PRIVATE_ASSET_SIGNING_SECRET") || this.config.get<string>("JWT_SECRET", "dev-secret-change-me");
    const token = createPrivateAssetToken({ v: 1, purpose: "course_resource", reference, tenantId: course.tenant?.id || null, ownerAdminId: admin.id, contextId: course.id, originalName: validated.originalname, mimetype: validated.mimetype, size: Number(validated.size || validated.buffer.length) }, secret);
    return { url: `private-course-resource://${token}`, provider: "private", resourceType, originalName: validated.originalname.slice(0, 160), size: Number(validated.size || validated.buffer.length), mimeType: validated.mimetype };
  }

  async listCourseResourceAccessLogs(query: { courseId?: string | number; tenantId?: string | number }, admin?: AdminContext) {
    const builder = this.courseResourceAccessLogs.createQueryBuilder("access").innerJoinAndSelect(Course, "course", "course.id = access.courseId").leftJoinAndSelect("course.tenant", "tenant").orderBy("access.id", "DESC").take(500);
    this.applyStrictCourseTenantScope(builder, "course", admin);
    this.applyPlatformTenantFilter(builder, "course", query.tenantId, admin);
    if (query.courseId) builder.andWhere("access.courseId = :courseId", { courseId: Number(query.courseId) });
    const rows = await builder.getRawMany<any>();
    return rows.map((row) => ({ id: Number(row.access_id), userId: Number(row.access_userId), courseId: Number(row.access_courseId), lessonId: Number(row.access_lessonId), resourceType: row.access_resourceType, clientIp: row.access_clientIp, userAgent: row.access_userAgent, createdAt: row.access_createdAt, course: { id: Number(row.course_id), title: row.course_title } }));
  }

  async listCourses(query: { status?: string; categoryId?: number; tenantId?: string | number }, admin?: AdminContext) {
    const builder = this.courses.createQueryBuilder("course").leftJoinAndSelect("course.tenant", "tenant").leftJoinAndSelect("course.teacher", "teacher").orderBy("course.sortOrder", "ASC").addOrderBy("course.createdAt", "DESC");
    this.applyStrictCourseTenantScope(builder, "course", admin);
    this.applyPlatformTenantFilter(builder, "course", query.tenantId, admin);
    if (query.status) builder.andWhere("course.status = :status", { status: query.status });
    if (query.categoryId) builder.andWhere("course.categoryId = :categoryId", { categoryId: Number(query.categoryId) });
    return builder.getMany();
  }

  async getCourse(id: number, admin?: AdminContext) {
    const course = await this.assertCourseAccess(id, admin);
    const chapters = await this.chapters.find({ where: { courseId: id }, order: { sortOrder: "ASC" } });
    const chapterIds = chapters.map(c => c.id);
    const lessons = chapterIds.length ? await this.lessons.find({ where: chapterIds.map(id => ({ chapterId: id })), order: { sortOrder: "ASC" } }) : [];
    return { ...course, chapters: chapters.map(ch => ({ ...ch, lessons: lessons.filter(l => l.chapterId === ch.id) })) };
  }

  async createCourse(dto: any, admin?: AdminContext) {
    const course = this.courses.create();
    Object.assign(course, dto);
    await this.assignTenant(course, dto, admin, "courses");
    await this.assignCourseTeacher(course, dto.teacherId, admin);
    await this.assignCourseAccess(course, dto);
    return this.courses.save(course);
  }

  async updateCourse(id: number, dto: any, admin?: AdminContext) {
    const course = await this.assertCourseAccess(id, admin);
    Object.assign(course, dto);
    await this.assignTenant(course, dto, admin, "courses");
    if (dto.teacherId !== undefined) await this.assignCourseTeacher(course, dto.teacherId, admin);
    await this.assignCourseAccess(course, dto);
    return this.courses.save(course);
  }

  async deleteCourse(id: number, admin?: AdminContext) {
    await this.assertCourseAccess(id, admin);
    const accessCount = await this.userLearning.count({ where: { courseId: id, lessonId: 0 } });
    if (accessCount) throw new BadRequestException(`已有 ${accessCount} 位用户获得学习权限，不能删除；请将课程改为下架状态`);
    await this.chapters.delete({ courseId: id });
    await this.courses.delete(id);
    return { success: true };
  }

  // ===== Chapters =====
  async listCourseChapters(courseId: number, admin?: AdminContext) {
    await this.assertCourseAccess(courseId, admin);
    return this.chapters.find({ where: { courseId }, order: { sortOrder: "ASC" } });
  }

  async createCourseChapter(dto: any, admin?: AdminContext) {
    await this.assertCourseAccess(Number(dto.courseId), admin);
    const item = this.chapters.create(dto);
    return this.chapters.save(item);
  }

  async updateCourseChapter(id: number, dto: any, admin?: AdminContext) {
    const chapter = await this.assertChapterAccess(id, admin);
    Object.assign(chapter, dto);
    if (dto.courseId !== undefined) await this.assertCourseAccess(Number(dto.courseId), admin);
    return this.chapters.save(chapter);
  }

  async deleteCourseChapter(id: number, admin?: AdminContext) {
    await this.assertChapterAccess(id, admin);
    await this.chapters.delete(id);
    await this.lessons.delete({ chapterId: id });
    return { success: true };
  }

  // ===== Lessons =====
  async listChapterLessons(chapterId: number, admin?: AdminContext) {
    await this.assertChapterAccess(chapterId, admin);
    return this.lessons.find({ where: { chapterId }, order: { sortOrder: "ASC" } });
  }

  async createCourseLesson(dto: any, admin?: AdminContext) {
    const chapter = await this.assertChapterAccess(Number(dto.chapterId), admin);
    await this.claimLessonPrivateResources(dto, chapter.courseId, admin);
    const item = this.lessons.create(this.normalizeLessonDto(dto));
    return this.lessons.save(item);
  }

  async updateCourseLesson(id: number, dto: any, admin?: AdminContext) {
    const lesson = await this.assertLessonAccess(id, admin);
    const chapter = await this.assertChapterAccess(Number(dto.chapterId !== undefined ? dto.chapterId : lesson.chapterId), admin);
    await this.claimLessonPrivateResources(dto, chapter.courseId, admin);
    Object.assign(lesson, this.normalizeLessonDto(dto));
    return this.lessons.save(lesson);
  }

  async deleteCourseLesson(id: number, admin?: AdminContext) {
    await this.assertLessonAccess(id, admin);
    await this.lessons.delete(id);
    return { success: true };
  }

  // ===== Course Orders =====
  async listCourseAssessments(query: { courseId?: string | number; tenantId?: string | number }, admin?: AdminContext) {
    const builder = this.assessments.createQueryBuilder("assessment").leftJoinAndSelect("assessment.course", "course").leftJoinAndSelect("course.tenant", "tenant").orderBy("assessment.sortOrder", "ASC").addOrderBy("assessment.id", "DESC");
    this.applyStrictCourseTenantScope(builder, "course", admin); this.applyPlatformTenantFilter(builder, "course", query.tenantId, admin);
    if (query.courseId) builder.andWhere("course.id = :courseId", { courseId: Number(query.courseId) });
    return builder.getMany();
  }

  async saveCourseAssessment(dto: any, id?: number, admin?: AdminContext) {
    const course = await this.assertCourseAccess(Number(dto.courseId || 0), admin);
    const row = id ? await this.assessments.findOne({ where: { id } }) : this.assessments.create();
    if (!row) throw new NotFoundException("考核不存在");
    if (id && row.course.id !== course.id) throw new BadRequestException("考核不能切换课程");
    row.course = course; row.tenant = course.tenant; row.title = String(dto.title || "").trim().slice(0,160); if (!row.title) throw new BadRequestException("请填写考核标题");
    row.description = String(dto.description || "").trim().slice(0,5000) || null; row.type = dto.type === "assignment" ? "assignment" : "quiz"; row.passScore = Math.min(Math.max(Math.trunc(Number(dto.passScore || 60)),1),100); row.maxAttempts = Math.min(Math.max(Math.trunc(Number(dto.maxAttempts || 1)),1),20); row.dueAt = dto.dueAt ? new Date(dto.dueAt) : null; row.allowLateSubmission = dto.allowLateSubmission === true; row.status = ["published","closed"].includes(dto.status) ? dto.status : "draft"; row.sortOrder = Math.max(Math.trunc(Number(dto.sortOrder || 0)),0);
    return this.assessments.save(row);
  }

  async listAssessmentQuestions(assessmentId: number, admin?: AdminContext) { await this.assertAssessmentAccess(assessmentId, admin); return this.questions.find({ where:{ assessmentId }, order:{ sortOrder:"ASC", id:"ASC" } }); }
  async saveAssessmentQuestion(dto: any, id?: number, admin?: AdminContext) {
    const assessment = await this.assertAssessmentAccess(Number(dto.assessmentId || 0), admin); const row = id ? await this.questions.findOneBy({ id }) : this.questions.create(); if (!row) throw new NotFoundException("题目不存在"); if (id && row.assessmentId !== assessment.id) throw new BadRequestException("题目不能切换试卷");
    const type = ["single","multiple","boolean","essay"].includes(dto.type) ? dto.type : "single"; const options = type === "essay" ? null : Array.isArray(dto.options) ? dto.options.map((item:any,index:number) => ({ key:String(item.key || String.fromCharCode(65+index)).slice(0,10), text:String(item.text || "").trim().slice(0,500) })).filter((item:any)=>item.text).slice(0,20) : [];
    Object.assign(row, { assessmentId:assessment.id, type, stem:String(dto.stem || "").trim().slice(0,10000), options, correctAnswer:type === "essay" ? null : Array.isArray(dto.correctAnswer) ? dto.correctAnswer.map(String).slice(0,20) : [], explanation:String(dto.explanation || "").trim().slice(0,5000) || null, score:Math.max(Number(dto.score || 10),0).toFixed(2), sortOrder:Math.max(Math.trunc(Number(dto.sortOrder || 0)),0) }); if (!row.stem) throw new BadRequestException("请填写题干"); return this.questions.save(row);
  }
  async deleteAssessmentQuestion(id:number, admin?:AdminContext) { const row=await this.questions.findOneBy({id}); if(!row) throw new NotFoundException("题目不存在"); await this.assertAssessmentAccess(row.assessmentId,admin); await this.questions.delete(id); return {success:true}; }
  async listAssessmentAttempts(query:{courseId?:string|number;assessmentId?:string|number;status?:string;tenantId?:string|number},admin?:AdminContext) { const builder=this.attempts.createQueryBuilder("attempt").innerJoinAndSelect(CourseAssessment,"assessment","assessment.id=attempt.assessmentId").innerJoinAndSelect(Course,"course","course.id=attempt.courseId").leftJoinAndSelect("course.tenant","tenant").orderBy("attempt.id","DESC").take(500); this.applyStrictCourseTenantScope(builder,"course",admin); this.applyPlatformTenantFilter(builder,"course",query.tenantId,admin); if(query.courseId) builder.andWhere("attempt.courseId=:courseId",{courseId:Number(query.courseId)}); if(query.assessmentId) builder.andWhere("attempt.assessmentId=:assessmentId",{assessmentId:Number(query.assessmentId)}); if(query.status) builder.andWhere("attempt.status=:status",{status:query.status}); return builder.getRawMany(); }
  async exportAssessmentAttempts(query:{assessmentId?:string|number;status?:string;tenantId?:string|number},admin?:AdminContext){const rows=await this.listAssessmentAttempts(query,admin);const escape=(value:unknown)=>`"${String(value??"").replace(/"/g,'""')}"`;const lines=[["提交ID","课程","考核","用户ID","尝试次数","客观分","人工分","总分","状态","逾期","提交时间","批改时间","批改管理员","评语"].map(escape).join(","),...rows.map((row:any)=>[row.attempt_id,row.course_title,row.assessment_title,row.attempt_userId,row.attempt_attemptNo,row.attempt_objectiveScore,row.attempt_manualScore,row.attempt_totalScore,row.attempt_status,row.attempt_lateSubmission?"是":"否",row.attempt_submittedAt,row.attempt_reviewedAt,row.attempt_reviewedByAdminId,row.attempt_reviewRemark].map(escape).join(","))];return `\uFEFF${lines.join("\r\n")}`;}
  async reviewAssessmentAttempt(id:number,dto:any,admin?:AdminContext) { const attempt=await this.attempts.findOneBy({id}); if(!attempt) throw new NotFoundException("提交不存在"); const assessment=await this.assertAssessmentAccess(attempt.assessmentId,admin); const answers=await this.assessmentAnswers.find({where:{attemptId:id}}); const scores=dto.answerScores && typeof dto.answerScores === "object" ? dto.answerScores : {}; let manual=0; for(const answer of answers){ if(answer.correct !== null) continue; const value=Math.max(Number(scores[answer.questionId]?.score || 0),0); answer.score=value.toFixed(2); answer.feedback=String(scores[answer.questionId]?.feedback || "").trim().slice(0,5000)||null; manual+=value; } await this.assessmentAnswers.save(answers); attempt.manualScore=manual.toFixed(2); attempt.totalScore=(Number(attempt.objectiveScore||0)+manual).toFixed(2); const questions=await this.questions.find({where:{assessmentId:assessment.id}}); const maximum=questions.reduce((sum,q)=>sum+Number(q.score||0),0); if(dto.action === "return"){attempt.status="returned";} else attempt.status=assessmentPassed(Number(attempt.totalScore),maximum,assessment.passScore)?"passed":"failed"; attempt.reviewedAt=new Date(); attempt.reviewedByAdminId=admin?.id||null; attempt.reviewRemark=String(dto.reviewRemark||"").trim().slice(0,5000)||null; return this.attempts.save(attempt); }
  async assessmentAttemptDetail(id:number,admin?:AdminContext){const attempt=await this.attempts.findOneBy({id});if(!attempt)throw new NotFoundException("提交不存在");const assessment=await this.assertAssessmentAccess(attempt.assessmentId,admin);const questions=await this.questions.find({where:{assessmentId:assessment.id},order:{sortOrder:"ASC",id:"ASC"}});const answers=await this.assessmentAnswers.find({where:{attemptId:id}});return{attempt,assessment,questions:questions.map(q=>({...q,answer:answers.find(a=>a.questionId===q.id)||null}))};}
  async grantAssessmentRetake(assessmentId:number,dto:any,admin?:AdminContext){await this.assertAssessmentAccess(assessmentId,admin);const userId=Number(dto.userId||0);if(!userId)throw new BadRequestException("请选择用户");let row=await this.assessmentGrants.findOneBy({assessmentId,userId});if(!row)row=this.assessmentGrants.create({assessmentId,userId,additionalAttempts:0,lateUntil:null,reason:null,grantedByAdminId:null});row.additionalAttempts=Math.min(Math.max(Math.trunc(Number(dto.additionalAttempts||0)),0),20);row.lateUntil=dto.lateUntil?new Date(dto.lateUntil):null;row.reason=String(dto.reason||"").trim().slice(0,500)||null;row.grantedByAdminId=admin?.id||null;return this.assessmentGrants.save(row);}

  async listCourseReviews(query:any,admin?:AdminContext){const b=this.courseReviews.createQueryBuilder("review").innerJoinAndSelect("review.course","course").leftJoinAndSelect("course.tenant","tenant").orderBy("review.id","DESC").take(500);this.applyStrictCourseTenantScope(b,"course",admin);this.applyPlatformTenantFilter(b,"course",query.tenantId,admin);if(query.courseId)b.andWhere("review.courseId=:courseId",{courseId:Number(query.courseId)});if(query.status)b.andWhere("review.status=:status",{status:query.status});return b.getMany();}
  async moderateCourseReview(id:number,dto:any,admin?:AdminContext){const row=await this.courseReviews.findOneBy({id});if(!row)throw new NotFoundException("课程评价不存在");await this.assertCourseAccess(row.courseId,admin);row.status=["approved","rejected","hidden"].includes(dto.status)?dto.status:"pending";row.moderationReason=String(dto.reason||"").trim().slice(0,500)||null;if(dto.reply!==undefined){row.reply=String(dto.reply||"").trim().slice(0,5000)||null;row.repliedAt=row.reply?new Date():null;row.repliedByAdminId=row.reply?admin?.id||null:null;}return this.courseReviews.save(row);}
  async listCourseQa(query:any,admin?:AdminContext){const b=this.courseQa.createQueryBuilder("qa").innerJoinAndSelect("qa.course","course").leftJoinAndSelect("course.tenant","tenant").orderBy("qa.id","DESC").take(500);this.applyStrictCourseTenantScope(b,"course",admin);this.applyPlatformTenantFilter(b,"course",query.tenantId,admin);if(query.courseId)b.andWhere("qa.courseId=:courseId",{courseId:Number(query.courseId)});if(query.status)b.andWhere("qa.status=:status",{status:query.status});return b.getMany();}
  async answerCourseQa(id:number,dto:any,admin?:AdminContext){const row=await this.courseQa.findOneBy({id});if(!row)throw new NotFoundException("课程提问不存在");await this.assertCourseAccess(row.courseId,admin);const answer=String(dto.answer||"").trim().slice(0,10000);if(!answer)throw new BadRequestException("请填写答复");row.answer=answer;row.status="answered";row.answeredAt=new Date();row.answeredByAdminId=admin?.id||null;row.featured=dto.featured===true;return this.courseQa.save(row);}
  async listCourseAnnouncements(query:any,admin?:AdminContext){const b=this.courseAnnouncements.createQueryBuilder("notice").innerJoinAndSelect("notice.course","course").leftJoinAndSelect("course.tenant","tenant").orderBy("notice.id","DESC");this.applyStrictCourseTenantScope(b,"course",admin);this.applyPlatformTenantFilter(b,"course",query.tenantId,admin);if(query.courseId)b.andWhere("notice.courseId=:courseId",{courseId:Number(query.courseId)});return b.getMany();}
  async saveCourseAnnouncement(dto:any,id?:number,admin?:AdminContext){const course=await this.assertCourseAccess(Number(dto.courseId||0),admin);const row=id?await this.courseAnnouncements.findOneBy({id}):this.courseAnnouncements.create();if(!row)throw new NotFoundException("课程公告不存在");if(id&&row.courseId!==course.id)throw new BadRequestException("公告不能切换课程");row.courseId=course.id;row.course=course;row.tenant=course.tenant;row.title=String(dto.title||"").trim().slice(0,200);row.content=String(dto.content||"").trim().slice(0,20000);if(!row.title||!row.content)throw new BadRequestException("请填写公告标题和内容");row.status=["published","cancelled"].includes(dto.status)?dto.status:"draft";row.publishAt=dto.publishAt?new Date(dto.publishAt):null;row.expiresAt=dto.expiresAt?new Date(dto.expiresAt):null;row.notifyLearners=dto.notifyLearners===true;row.createdByAdminId=row.createdByAdminId||admin?.id||null;return this.courseAnnouncements.save(row);}
  async saveCourseCertificateTemplate(courseId:number,dto:any,admin?:AdminContext){const course=await this.assertCourseAccess(courseId,admin);let row=await this.courseCertificateTemplates.findOneBy({courseId});if(!row)row=this.courseCertificateTemplates.create({courseId,course,tenant:course.tenant});row.name=String(dto.name||`${course.title}结业证书`).trim().slice(0,160);row.backgroundUrl=String(dto.backgroundUrl||"").trim().slice(0,500)||null;row.issuerName=String(dto.issuerName||"").trim().slice(0,160)||null;row.description=String(dto.description||"").trim().slice(0,5000)||null;row.completionThreshold=Math.min(Math.max(Math.trunc(Number(dto.completionThreshold||100)),1),100);row.requireAssessmentPass=dto.requireAssessmentPass===true;row.enabled=dto.enabled!==false;return this.courseCertificateTemplates.save(row);}
  async getCourseCertificateTemplate(courseId:number,admin?:AdminContext){await this.assertCourseAccess(courseId,admin);return this.courseCertificateTemplates.findOneBy({courseId});}
  async listCourseRefunds(query:any,admin?:AdminContext){const b=this.courseRefunds.createQueryBuilder("refund").innerJoinAndSelect("refund.order","order").innerJoinAndSelect("order.course","course").leftJoinAndSelect("course.tenant","tenant").leftJoinAndSelect("order.user","user").orderBy("refund.id","DESC");this.applyStrictCourseTenantScope(b,"course",admin);this.applyPlatformTenantFilter(b,"course",query.tenantId,admin);if(query.courseId)b.andWhere("course.id=:courseId",{courseId:Number(query.courseId)});if(query.status)b.andWhere("refund.status=:status",{status:query.status});return (await b.getMany()).map((row)=>this.publicCourseRefundForAdmin(row));}
  async createCourseRefund(dto: any, admin?: AdminContext) {
    const order = await this.courseOrders.findOne({ where: { id: Number(dto.orderId || 0) } });
    if (!order) throw new NotFoundException("课程订单不存在");
    await this.assertCourseAccess(order.course.id, admin);
    return this.dataSource.transaction(async (manager) => {
      const lockedOrder = await manager.getRepository(CourseOrder).findOne({ where: { id: order.id }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!lockedOrder) throw new NotFoundException("课程订单不存在");
      if (![CourseOrderStatus.Paid, CourseOrderStatus.PartiallyRefunded].includes(lockedOrder.status)) throw new BadRequestException("当前课程订单不可退款");
      const refundRepo = manager.getRepository(CourseRefund);
      const rows = await refundRepo.createQueryBuilder("refund").where("refund.orderId = :orderId", { orderId: order.id }).orderBy("refund.createdAt", "DESC").getMany();
      const active = rows.find((row) => ["pending", "approved", "processing", "failed"].includes(row.status));
      if (active) return { ...this.publicCourseRefundForAdmin(active), idempotent: true };
      const used = rows.filter((row) => row.status === "completed").reduce((sum, row) => sum + Number(row.amountFen || 0), 0);
      const amountFen = Math.trunc(Number(dto.amountFen || 0));
      if (amountFen <= 0 || used + amountFen > Number(lockedOrder.amountFen)) throw new BadRequestException("退款金额超过可退金额");
      const saved = await refundRepo.save(refundRepo.create({ refundNo: `CRF${Date.now()}${order.id}`, order, amountFen, reason: String(dto.reason || "").trim().slice(0, 500) || "课程退款", status: "pending", reviewRemark: null, reviewedByAdminId: null, reviewedAt: null, completedAt: null, providerRefundNo: null, providerRefundStatus: null, providerRefundSyncedAt: null, providerRefundPayload: null, providerRefundRetryCount: 0, providerRefundNextQueryAt: null, failureReason: null }));
      return { ...this.publicCourseRefundForAdmin(saved), idempotent: false };
    });
  }

  async reviewCourseRefund(id: number, dto: any, admin?: AdminContext) {
    const current = await this.courseRefunds.findOne({ where: { id } });
    if (!current) throw new NotFoundException("课程退款单不存在");
    const courseId = current.order.course.id;
    const userId = current.order.user.id;
    const orderId = current.order.id;
    await this.assertCourseAccess(courseId, admin);
    const action = dto.action === "reject" ? "reject" : "approve";
    if (action === "approve" && current.status === "processing") {
      await this.publishCourseRefundQueryJob(current);
      return this.publicCourseRefundForAdmin(current);
    }
    const provider = this.courseRefundProvider(current.order);
    const useRealProvider = action === "approve" && provider ? await this.paymentProvider.usesRealProvider(provider) : false;
    const reviewed = await this.dataSource.transaction(async (manager) => {
      const order = await manager.getRepository(CourseOrder).findOne({ where: { id: orderId }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      const row = await manager.getRepository(CourseRefund).findOne({ where: { id }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!order || !row) throw new NotFoundException("课程退款单不存在");
      if (action === "reject" && row.status === "rejected") return row;
      if (action === "approve" && ["approved", "processing", "completed"].includes(row.status)) return row;
      if (row.status !== "pending") throw new BadRequestException("退款单已处理");
      row.reviewedAt = new Date();
      row.reviewedByAdminId = admin?.id || null;
      row.reviewRemark = String(dto.reviewRemark || "").trim().slice(0, 500) || null;
      if (action === "reject") {
        row.status = "rejected";
        return manager.getRepository(CourseRefund).save(row);
      }
      const requiresProvider = Boolean(provider && useRealProvider);
      row.status = requiresProvider ? "processing" : "approved";
      if (!requiresProvider) {
        row.providerRefundStatus = order.paymentMethod === PaymentMethod.Balance ? "wallet_success" : order.paymentMethod === PaymentMethod.Offline ? "manual_success" : provider ? "sandbox_success" : "not_required";
        row.providerRefundSyncedAt = new Date();
        row.providerRefundNextQueryAt = null;
      }
      await manager.getRepository(CourseRefund).save(row);
      return requiresProvider ? row : this.completeCourseRefundInTransaction(manager, row, order, userId, courseId, admin);
    });
    if (action !== "approve" || !provider || !useRealProvider || reviewed.status !== "processing") return this.publicCourseRefundForAdmin(reviewed);
    return this.publicCourseRefundForAdmin(await this.submitCourseProviderRefund(reviewed.id, provider, admin));
  }

  async confirmCourseRefund(id: number, dto: any, admin?: AdminContext) {
    const current = await this.courseRefunds.findOne({ where: { id } });
    if (!current) throw new NotFoundException("课程退款单不存在");
    const courseId = current.order.course.id;
    const userId = current.order.user.id;
    const orderId = current.order.id;
    await this.assertCourseAccess(courseId, admin);
    const confirmed = await this.dataSource.transaction(async (manager) => {
      const order = await manager.getRepository(CourseOrder).findOne({ where: { id: orderId }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      const row = await manager.getRepository(CourseRefund).findOne({ where: { id }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!order || !row) throw new NotFoundException("课程退款单不存在");
      if (row.status === "completed") return row;
      if (!["approved", "processing", "failed"].includes(row.status)) throw new BadRequestException("当前退款单不可确认完成");
      if (dto.success === false) {
        row.status = "failed";
        row.providerRefundStatus = "failed";
        row.providerRefundSyncedAt = new Date();
        row.providerRefundNextQueryAt = null;
        row.failureReason = String(dto.failureReason || "退款通道处理失败").trim().slice(0, 500);
        return manager.getRepository(CourseRefund).save(row);
      }
      row.providerRefundNo = String(dto.providerRefundNo || "").trim().slice(0, 128) || row.providerRefundNo;
      row.providerRefundStatus = "success";
      row.providerRefundSyncedAt = new Date();
      row.providerRefundNextQueryAt = null;
      return this.completeCourseRefundInTransaction(manager, row, order, userId, courseId, admin);
    });
    return this.publicCourseRefundForAdmin(confirmed);
  }

  private async submitCourseProviderRefund(refundId: number, provider: SupportedPaymentProvider, admin?: AdminContext) {
    const refund = await this.courseRefunds.findOne({ where: { id: refundId } });
    if (!refund) throw new NotFoundException("课程退款单不存在");
    try {
      const result = await this.paymentProvider.requestRefund({ provider, order: this.courseOrderPaymentView(refund.order), refundNo: refund.refundNo, amount: fenToYuan(refund.amountFen), reason: refund.reason, operator: admin?.username || null });
      const saved = await this.applyCourseProviderRefundResult(refund.id, result.status, result.providerRefundNo, result.raw || null, null, admin);
      if (saved.status === "processing") await this.publishCourseRefundQueryJob(saved);
      return saved;
    } catch (error) {
      const message = error instanceof Error ? error.message : "课程退款渠道提交结果未知";
      const saved = await this.markCourseRefundForRecovery(refund.id, "submission_unknown", message);
      await this.publishCourseRefundQueryJob(saved);
      return saved;
    }
  }

  private async queryCourseProviderRefund(refundId: number, tenantId: number) {
    const refund = await this.courseRefunds.findOne({ where: { id: refundId } });
    if (!refund || Number(refund.order.course.tenant?.id || 0) !== Number(tenantId || 0)) return null;
    if (refund.status !== "processing") return refund;
    const provider = this.courseRefundProvider(refund.order);
    if (!provider) return this.applyCourseProviderRefundResult(refund.id, "success", refund.providerRefundNo, null, null);
    try {
      const result = await this.paymentProvider.queryRefund({ provider, order: this.courseOrderPaymentView(refund.order), refundNo: refund.refundNo, providerRefundNo: refund.providerRefundNo });
      return this.applyCourseProviderRefundResult(refund.id, result.status, result.providerRefundNo, result.raw || null, result.failureReason || null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "课程退款渠道查询失败";
      await this.markCourseRefundForRecovery(refund.id, refund.providerRefundStatus || "processing", message);
      throw error;
    }
  }

  private async applyCourseProviderRefundResult(refundId: number, status: "accepted" | "processing" | "success" | "failed", providerRefundNo: string | null, payload: Record<string, unknown> | null, failureReason: string | null, admin?: AdminContext) {
    return this.dataSource.transaction(async (manager) => {
      const refundRepo = manager.getRepository(CourseRefund);
      const row = await refundRepo.findOne({ where: { id: refundId }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!row) throw new NotFoundException("课程退款单不存在");
      if (row.status === "completed") return row;
      const orderRef = await refundRepo.createQueryBuilder("refund").select("refund.orderId", "orderId").where("refund.id = :refundId", { refundId }).getRawOne<{ orderId: string }>();
      const order = await manager.getRepository(CourseOrder).findOne({ where: { id: Number(orderRef?.orderId || 0) }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!order) throw new NotFoundException("课程退款关联订单不存在");
      return this.finishCourseProviderRefundResult(manager, row, order, status, providerRefundNo, payload, failureReason, admin);
    });
  }

  private async finishCourseProviderRefundResult(manager: EntityManager, row: CourseRefund, order: CourseOrder, status: "accepted" | "processing" | "success" | "failed", providerRefundNo: string | null, payload: Record<string, unknown> | null, failureReason: string | null, admin?: AdminContext) {
    row.providerRefundNo = providerRefundNo || row.providerRefundNo;
    row.providerRefundStatus = status;
    row.providerRefundSyncedAt = new Date();
    row.providerRefundPayload = payload || row.providerRefundPayload;
    row.providerRefundRetryCount = Number(row.providerRefundRetryCount || 0) + 1;
    row.failureReason = failureReason;
    if (status === "success") {
      row.providerRefundNextQueryAt = null;
      const orderRefs = await manager.getRepository(CourseOrder).createQueryBuilder("courseOrder").select("courseOrder.userId", "userId").addSelect("courseOrder.courseId", "courseId").where("courseOrder.id = :orderId", { orderId: order.id }).getRawOne<{ userId: string; courseId: string }>();
      return this.completeCourseRefundInTransaction(manager, row, order, Number(orderRefs?.userId || 0), Number(orderRefs?.courseId || 0), admin);
    }
    row.status = status === "failed" ? "failed" : "processing";
    row.providerRefundNextQueryAt = status === "failed" ? null : new Date(Date.now() + Math.min(60, Math.max(10, row.providerRefundRetryCount * 10)) * 60_000);
    if (status === "failed") row.failureReason ||= "课程退款渠道处理失败";
    return manager.getRepository(CourseRefund).save(row);
  }

  private async markCourseRefundForRecovery(refundId: number, providerStatus: string, failureReason: string) {
    const row = await this.courseRefunds.findOne({ where: { id: refundId }, loadEagerRelations: false });
    if (!row) throw new NotFoundException("课程退款单不存在");
    row.status = "processing";
    row.providerRefundStatus = providerStatus;
    row.providerRefundSyncedAt = new Date();
    row.providerRefundRetryCount = Number(row.providerRefundRetryCount || 0) + 1;
    row.providerRefundNextQueryAt = new Date(Date.now() + Math.min(60, Math.max(10, row.providerRefundRetryCount * 10)) * 60_000);
    row.failureReason = failureReason.slice(0, 500);
    return this.courseRefunds.save(row);
  }

  private async publishCourseRefundQueryJob(refund: CourseRefund) {
    if (refund.status !== "processing") return null;
    const tenantRef = await this.courseRefunds.createQueryBuilder("refund")
      .innerJoin("refund.order", "courseOrder")
      .innerJoin("courseOrder.course", "course")
      .select("course.tenantId", "tenantId")
      .where("refund.id = :refundId", { refundId: refund.id })
      .getRawOne<{ tenantId: string }>();
    const tenantId = Number(tenantRef?.tenantId || 0);
    return this.businessJobs.publish({ tenantId, type: "course-refund.provider-query", idempotencyKey: `course-refund:${refund.id}`, payload: { refundId: refund.id, tenantId }, runAt: refund.providerRefundNextQueryAt || new Date(), maxAttempts: 8 });
  }

  private courseRefundProvider(order: CourseOrder): SupportedPaymentProvider | null {
    if (order.paymentMethod === PaymentMethod.Wechat) return "wechat";
    if (order.paymentMethod === PaymentMethod.Alipay) return "alipay";
    return null;
  }

  private courseOrderPaymentView(order: CourseOrder): Order {
    return { id: order.id, orderNo: order.orderNo, amount: order.amount, transactionNo: order.transactionNo, paymentMethod: order.paymentMethod, tenant: order.course.tenant, agent: null, registration: { activity: { title: order.course.title } } } as Order;
  }

  private publicCourseRefundForAdmin(row: CourseRefund) {
    const order = row.order ? {
      id: row.order.id,
      orderNo: row.order.orderNo,
      amount: row.order.amount,
      amountFen: row.order.amountFen,
      paymentMethod: row.order.paymentMethod,
      status: row.order.status,
      transactionNo: row.order.transactionNo,
      paidAt: row.order.paidAt,
      user: row.order.user ? { id: row.order.user.id, nickname: row.order.user.nickname, phone: maskPhone(row.order.user.phone) } : null,
      course: row.order.course ? { id: row.order.course.id, title: row.order.course.title, tenant: row.order.course.tenant ? { id: row.order.course.tenant.id, name: row.order.course.tenant.name, code: row.order.course.tenant.code } : null } : null
    } : null;
    return {
      id: row.id,
      refundNo: row.refundNo,
      order,
      amountFen: Number(row.amountFen || 0),
      reason: row.reason,
      status: row.status,
      reviewRemark: row.reviewRemark,
      reviewedByAdminId: row.reviewedByAdminId,
      reviewedAt: row.reviewedAt,
      completedAt: row.completedAt,
      providerRefundNo: row.providerRefundNo,
      providerRefundStatus: row.providerRefundStatus,
      providerRefundSyncedAt: row.providerRefundSyncedAt,
      providerRefundRetryCount: Number(row.providerRefundRetryCount || 0),
      providerRefundNextQueryAt: row.providerRefundNextQueryAt,
      failureReason: row.failureReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private async completeCourseRefundInTransaction(manager: EntityManager, row: CourseRefund, order: CourseOrder, userId: number, courseId: number, admin?: AdminContext) {
    const refundRepo = manager.getRepository(CourseRefund) as Repository<CourseRefund>;
    const completed = await refundRepo.createQueryBuilder("refund").where("refund.orderId = :orderId", { orderId: order.id }).andWhere("refund.status = :status", { status: "completed" }).getMany();
    const total = completed.filter((item) => item.id !== row.id).reduce((sum, item) => sum + Number(item.amountFen || 0), 0) + Number(row.amountFen || 0);
    if (total > Number(order.amountFen || 0)) throw new BadRequestException("累计退款金额超过订单金额");
    row.status = "completed";
    row.completedAt = row.completedAt || new Date();
    row.failureReason = null;
    const saved = await refundRepo.save(row);
    await this.returnCourseBalanceRefund(manager, saved, order, userId, courseId);
    if (total < Number(order.amountFen || 0)) {
      order.status = CourseOrderStatus.PartiallyRefunded;
      await manager.getRepository(CourseOrder).save(order);
      return saved;
    }
    order.status = CourseOrderStatus.Refunded;
    await manager.getRepository(CourseOrder).save(order);
    const otherPaidOrders = await manager.getRepository(CourseOrder).createQueryBuilder("courseOrder")
      .where("courseOrder.userId = :userId", { userId })
      .andWhere("courseOrder.courseId = :courseId", { courseId })
      .andWhere("courseOrder.id != :orderId", { orderId: order.id })
      .andWhere("courseOrder.status IN (:...statuses)", { statuses: [CourseOrderStatus.Paid, CourseOrderStatus.PartiallyRefunded] })
      .getCount();
    if (otherPaidOrders > 0) return saved;
    await manager.getRepository(UserLearning).delete({ userId, courseId, lessonId: 0 });
    const certificates = await manager.getRepository(Certificate).find({ where: { userId, courseId, status: "active" }, loadEagerRelations: false });
    for (const certificate of certificates) {
      certificate.status = "revoked";
      certificate.revokedAt = new Date();
      certificate.revokedBy = admin?.username || `admin:${admin?.id || ""}`;
      certificate.revokeReason = `课程订单 ${order.orderNo} 已全额退款`;
      await manager.getRepository(Certificate).save(certificate);
    }
    return saved;
  }

  private async returnCourseBalanceRefund(manager: EntityManager, refund: CourseRefund, order: CourseOrder, userId: number, courseId: number) {
    if (order.paymentMethod !== PaymentMethod.Balance) return null;
    const txRepo = manager.getRepository(WalletTransaction);
    const idempotencyKey = `course_refund:${refund.id}`;
    const existing = await txRepo.findOne({ where: { idempotencyKey }, loadEagerRelations: false });
    if (existing) return existing;
    const course = await manager.getRepository(Course).findOne({ where: { id: courseId }, relations: ["tenant"], loadEagerRelations: false });
    const user = await manager.getRepository(User).findOne({ where: { id: userId }, loadEagerRelations: false });
    if (!course || !user) throw new NotFoundException("课程退款关联数据不存在");
    const tenantScopeKey = course.tenant?.id ? String(course.tenant.id) : "platform";
    const walletRepo = manager.getRepository(UserWallet);
    let wallet = await walletRepo.findOne({ where: { user: { id: user.id }, tenantScopeKey }, lock: { mode: "pessimistic_write" } });
    if (!wallet) wallet = await walletRepo.save(walletRepo.create({ user, tenant: course.tenant, tenantScopeKey }));
    const paymentTx = await txRepo.findOne({ where: { idempotencyKey: `course_balance_pay:${order.id}` }, loadEagerRelations: false });
    const originalGiftUsedFen = paymentTx ? Math.max(yuanToFen(paymentTx.giftBefore || 0) - yuanToFen(paymentTx.giftAfter || 0), 0) : 0;
    const completedRefunds = await manager.getRepository(CourseRefund).find({ where: { order: { id: order.id }, status: "completed" }, loadEagerRelations: false });
    let restoredGiftFen = 0;
    for (const prior of completedRefunds.filter((item) => item.id !== refund.id)) {
      const priorTx = await txRepo.findOne({ where: { idempotencyKey: `course_refund:${prior.id}` }, loadEagerRelations: false });
      if (priorTx) restoredGiftFen += Math.max(yuanToFen(priorTx.giftAfter || 0) - yuanToFen(priorTx.giftBefore || 0), 0);
    }
    const amountFen = Number(refund.amountFen || 0);
    const giftReturnFen = Math.min(Math.max(originalGiftUsedFen - restoredGiftFen, 0), amountFen);
    const cashReturnFen = amountFen - giftReturnFen;
    const cashBeforeFen = yuanToFen(wallet.availableBalance || 0);
    const giftBeforeFen = yuanToFen(wallet.giftBalance || 0);
    const cashAfterFen = cashBeforeFen + cashReturnFen;
    const giftAfterFen = giftBeforeFen + giftReturnFen;
    wallet.availableBalance = fenToYuan(cashAfterFen);
    wallet.giftBalance = fenToYuan(giftAfterFen);
    await walletRepo.save(wallet);
    return txRepo.save(txRepo.create({ wallet, user, tenant: course.tenant, order: null, transactionNo: `COURSERF${Date.now()}${refund.id}`, direction: "credit", type: "refund_return", amount: fenToYuan(amountFen), balanceBefore: fenToYuan(cashBeforeFen), balanceAfter: fenToYuan(cashAfterFen), frozenBefore: wallet.frozenBalance || "0.00", frozenAfter: wallet.frozenBalance || "0.00", giftBefore: fenToYuan(giftBeforeFen), giftAfter: fenToYuan(giftAfterFen), frozenGiftBefore: wallet.frozenGiftBalance || "0.00", frozenGiftAfter: wallet.frozenGiftBalance || "0.00", operator: "system", remark: `课程余额退款：${order.orderNo}/${refund.refundNo}`, idempotencyKey }));
  }

  async listCourseOrders(query: { status?: string; courseId?: string | number; keyword?: string; page?: string | number; pageSize?: string | number; tenantId?: string | number }, admin?: AdminContext) {
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.courseOrders
      .createQueryBuilder("courseOrder")
      .leftJoinAndSelect("courseOrder.course", "course")
      .leftJoinAndSelect("course.teacher", "teacher")
      .leftJoinAndSelect("course.tenant", "tenant")
      .leftJoinAndSelect("courseOrder.user", "user")
      .orderBy("courseOrder.createdAt", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize);
    this.applyStrictCourseTenantScope(builder, "course", admin);
    this.applyPlatformTenantFilter(builder, "course", query.tenantId, admin);
    if (query.status) builder.andWhere("courseOrder.status = :status", { status: query.status });
    if (query.courseId) builder.andWhere("course.id = :courseId", { courseId: Number(query.courseId) });
    const keyword = String(query.keyword || "").trim();
    if (keyword) {
      builder.andWhere("(courseOrder.orderNo LIKE :keyword OR course.title LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${keyword}%` });
    }
    const [items, total] = await builder.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async confirmOfflineCourseOrder(orderId: number, admin?: AdminContext) {
    const order = await this.courseOrders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException("课程订单不存在");
    await this.assertCourseAccess(order.course.id, admin);
    if (order.status === CourseOrderStatus.Paid) {
      await this.grantCourseAccess(order.user.id, order.course.id);
      return order;
    }
    if (order.status !== CourseOrderStatus.PendingPayment) throw new BadRequestException("当前课程订单不能确认收款");
    if (order.paymentMethod !== PaymentMethod.Offline) throw new BadRequestException("只有线下收款课程订单可以后台确认");
    if (order.expiresAt && order.expiresAt.getTime() <= Date.now()) {
      order.status = CourseOrderStatus.Closed;
      order.closedAt = new Date();
      order.closeReason = "课程订单超时关闭";
      await this.courseOrders.save(order);
      throw new BadRequestException("课程订单已超时关闭，不能确认收款");
    }
    order.status = CourseOrderStatus.Paid;
    order.transactionNo = `COURSE-OFFLINE-${Date.now()}-${order.id}`;
    order.paidAt = new Date();
    const saved = await this.courseOrders.save(order);
    await this.grantCourseAccess(saved.user.id, saved.course.id);
    return saved;
  }

  private async grantCourseAccess(userId: number, courseId: number) {
    let row = await this.userLearning.findOne({ where: { userId, courseId, lessonId: 0 } });
    if (!row) row = this.userLearning.create({ userId, courseId, lessonId: 0, progress: 0, completedAt: null });
    return this.userLearning.save(row);
  }

  // ===== Community Activities =====
  async listCommunityActivities(query: any, admin?: AdminContext) {
    const builder = this.communityActivities.createQueryBuilder("activity").leftJoinAndSelect("activity.tenant", "tenant").orderBy("activity.sortOrder", "ASC").addOrderBy("activity.createdAt", "DESC");
    applyTenantScopeToQuery(builder, "activity", admin);
    this.applyPlatformTenantFilter(builder, "activity", query.tenantId, admin);
    if (query.status) builder.andWhere("activity.status = :status", { status: query.status });
    return builder.getMany();
  }

  async createCommunityActivity(dto: any, admin?: AdminContext) {
    const item = this.communityActivities.create();
    Object.assign(item, dto);
    await this.assignTenant(item, dto, admin, "community");
    return this.communityActivities.save(item);
  }

  async updateCommunityActivity(id: number, dto: any, admin?: AdminContext) {
    const item = await this.assertCommunityActivityAccess(id, admin);
    Object.assign(item, dto);
    await this.assignTenant(item, dto, admin, "community");
    return this.communityActivities.save(item);
  }

  async deleteCommunityActivity(id: number, admin?: AdminContext) {
    await this.assertCommunityActivityAccess(id, admin);
    await this.communityActivities.delete(id);
    return { success: true };
  }

  // ===== Check-in Tasks =====
  async listCheckinTasks(query: any, admin?: AdminContext) {
    const builder = this.checkinTasks.createQueryBuilder("task").leftJoinAndSelect("task.tenant", "tenant").orderBy("task.date", "DESC");
    applyTenantScopeToQuery(builder, "task", admin);
    this.applyPlatformTenantFilter(builder, "task", query.tenantId, admin);
    if (query.date) builder.andWhere("task.date = :date", { date: query.date });
    return builder.getMany();
  }

  async createCheckinTask(dto: any, admin?: AdminContext) {
    const item = this.checkinTasks.create();
    Object.assign(item, this.normalizeCheckinTaskDto(dto));
    await this.assignTenant(item, dto, admin, "community");
    await this.assertCheckinTaskDateUnique(item);
    return this.checkinTasks.save(item);
  }

  async updateCheckinTask(id: number, dto: any, admin?: AdminContext) {
    const item = await this.assertCheckinTaskAccess(id, admin);
    Object.assign(item, this.normalizeCheckinTaskDto(dto));
    await this.assignTenant(item, dto, admin, "community");
    await this.assertCheckinTaskDateUnique(item, id);
    return this.checkinTasks.save(item);
  }

  async deleteCheckinTask(id: number, admin?: AdminContext) {
    await this.assertCheckinTaskAccess(id, admin);
    await this.checkinTasks.delete(id);
    return { success: true };
  }

  private normalizeCheckinTaskDto(dto: any) {
    if (!dto || dto.date === undefined || dto.date === null) return dto;
    const next = { ...dto };
    next.date = this.normalizeDateOnly(dto.date);
    next.activityId = Number(dto.activityId || 0) || null;
    next.checkinType = ["text","image","question","location"].includes(dto.checkinType) ? dto.checkinType : "text";
    next.questions = Array.isArray(dto.questions) ? dto.questions.slice(0,20) : null;
    next.requireApproval = dto.requireApproval === true;
    next.allowMakeup = dto.allowMakeup === true;
    next.makeupWithinDays = Math.min(Math.max(Math.trunc(Number(dto.makeupWithinDays || 3)),1),30);
    return next;
  }

  private normalizeDateOnly(value: unknown) {
    if (value instanceof Date) return this.localDateString(value);
    const text = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text.slice(0, 10);
    return this.localDateString(date);
  }

  private localDateString(date: Date) {
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
    return formatter.format(date);
  }

  private async assertCheckinTaskDateUnique(task: { id?: number; date?: string | null; activityId?: number | null; tenant?: Tenant | null }, excludeId?: number) {
    const date = String(task.date || "").trim();
    if (!date) throw new BadRequestException("请选择打卡日期");
    const tenantId = task.tenant?.id || null;
    const builder = this.checkinTasks
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.tenant", "tenant")
      .where("task.date = :date", { date });
    if (task.activityId) builder.andWhere("task.activityId = :activityId", { activityId: task.activityId });
    else builder.andWhere("task.activityId IS NULL");
    if (tenantId) builder.andWhere("task.tenantId = :tenantId", { tenantId });
    else builder.andWhere("task.tenantId IS NULL");
    if (excludeId) builder.andWhere("task.id != :excludeId", { excludeId });
    const duplicate = await builder.getOne();
    if (!duplicate) return;
    const scope = duplicate.tenant?.name || duplicate.tenant?.code || "平台";
    throw new BadRequestException(`${scope} ${date} 已存在打卡任务「${duplicate.title}」，请编辑已有任务或删除重复任务后再保存`);
  }

  // ===== Community Posts =====
  async listCommunityPosts(query: any, admin?: AdminContext) {
    const builder = this.communityPosts.createQueryBuilder("post").leftJoinAndSelect("post.tenant", "tenant").orderBy("post.createdAt", "DESC").take(Math.min(query.limit || 20, 50));
    builder.leftJoinAndSelect("post.activity", "activity");
    applyTenantScopeToQuery(builder, "post", admin);
    this.applyPlatformTenantFilter(builder, "post", query.tenantId, admin);
    if (query.visible !== undefined) builder.andWhere("post.visible = :visible", { visible: query.visible === true || query.visible === "true" || query.visible === "1" });
    if (query.status) builder.andWhere("post.status = :status", { status: query.status });
    if (query.source) builder.andWhere("post.source = :source", { source: query.source });
    if (query.activityId) builder.andWhere("post.activityId = :activityId", { activityId: Number(query.activityId) });
    return builder.getMany();
  }

  async createCommunityPost(dto: any, admin?: AdminContext) {
    const item = this.communityPosts.create();
    Object.assign(item, {
      ...dto,
      source: "official",
      status: dto.visible === false ? "pending" : "approved",
      approvedAt: dto.visible === false ? null : new Date(),
      tags: Array.isArray(dto.tags) ? dto.tags.slice(0, 6) : [],
      images: Array.isArray(dto.images) ? dto.images.slice(0, 9) : []
    });
    await this.assignTenant(item, dto, admin, "community");
    return this.communityPosts.save(item);
  }

  async reviewCommunityPost(id: number, dto: { status?: CommunityPostStatus; reviewRemark?: string | null; visible?: boolean }, admin?: AdminContext) {
    const post = await this.assertCommunityPostAccess(id, admin);
    const nextStatus = dto.status;
    if (nextStatus !== "approved" && nextStatus !== "rejected" && nextStatus !== "pending") throw new BadRequestException("动态状态不正确");
    post.status = nextStatus;
    post.reviewRemark = dto.reviewRemark?.trim() || null;
    post.visible = dto.visible === undefined ? nextStatus !== "rejected" : Boolean(dto.visible);
    post.approvedAt = nextStatus === "approved" ? post.approvedAt || new Date() : null;
    const saved = await this.communityPosts.save(post);
    if (post.userId) await this.notifications.sendNotification({ userId: post.userId, channel: "site", title: "社区动态审核结果", content: `${post.status === "approved" ? "已通过" : post.status === "rejected" ? "未通过" : "待审核"}${post.reviewRemark ? `：${post.reviewRemark}` : ""}`, remark: `社区动态审核:${post.id}` }, admin).catch(() => null);
    return saved;
  }

  async deleteCommunityPost(id: number, admin?: AdminContext) {
    const post=await this.assertCommunityPostAccess(id, admin);
    post.deletedAt=new Date();post.visible=false;
    await this.communityPosts.save(post);
    return { success: true };
  }

  async listCommunityPostComments(query: { status?: CommunityPostCommentStatus; postId?: string | number; tenantId?: string | number }, admin?: AdminContext) {
    const builder = this.communityPostComments
      .createQueryBuilder("comment")
      .innerJoin(CommunityPost, "post", "post.id = comment.postId")
      .leftJoin("post.tenant", "tenant")
      .orderBy("comment.createdAt", "DESC")
      .take(100);
    applyTenantScopeToQuery(builder, "post", admin);
    this.applyPlatformTenantFilter(builder, "post", query.tenantId, admin);
    if (query.status) builder.andWhere("comment.status = :status", { status: query.status });
    if (query.postId) builder.andWhere("comment.postId = :postId", { postId: Number(query.postId) });
    return builder.getMany();
  }

  async reviewCommunityPostComment(id: number, dto: { status?: CommunityPostCommentStatus; reviewRemark?: string | null }, admin?: AdminContext) {
    const comment = await this.communityPostComments.findOne({ where: { id } });
    if (!comment) throw new NotFoundException("评论不存在");
    await this.assertCommunityPostAccess(comment.postId, admin);
    const nextStatus = dto.status;
    if (nextStatus !== "approved" && nextStatus !== "rejected" && nextStatus !== "pending") throw new BadRequestException("评论状态不正确");
    const oldStatus = comment.status;
    comment.status = nextStatus;
    comment.reviewRemark = dto.reviewRemark?.trim() || null;
    const saved = await this.communityPostComments.save(comment);
    if (oldStatus !== "approved" && nextStatus === "approved") await this.adjustPostCommentCount(comment.postId, 1);
    if (oldStatus === "approved" && nextStatus !== "approved") await this.adjustPostCommentCount(comment.postId, -1);
    if(oldStatus!=="approved"&&nextStatus==="approved")await this.createCommunityCommentNotifications(saved);
    if (comment.userId) await this.notifications.sendNotification({ userId: comment.userId, channel: "site", title: "社区评论审核结果", content: `${comment.status === "approved" ? "已通过" : comment.status === "rejected" ? "未通过" : "待审核"}${comment.reviewRemark ? `：${comment.reviewRemark}` : ""}`, remark: `社区评论审核:${comment.id}` }, admin).catch(() => null);
    return saved;
  }

  async listSocialProfiles(query: any, admin?: AdminContext) {
    const builder = this.socialProfiles.createQueryBuilder("profile").leftJoinAndSelect("profile.tenant", "tenant").leftJoinAndSelect("profile.user", "user").orderBy("profile.updatedAt", "DESC").take(200);
    applyTenantScopeToQuery(builder, "profile", admin);
    this.applyPlatformTenantFilter(builder, "profile", query.tenantId, admin);
    if (query.status) builder.andWhere("profile.status = :status", { status: query.status });
    return builder.getMany();
  }

  async reviewSocialProfile(id: number, dto: { status?: SocialProfileStatus; reviewRemark?: string | null; visible?: boolean }, admin?: AdminContext) {
    const profile = await this.socialProfiles.findOne({ where: { id } });
    if (!profile) throw new NotFoundException("社交资料不存在");
    assertTenantAccessForActor(profile, admin, "社交资料不存在或不属于当前商家");
    if (!['approved', 'rejected', 'pending'].includes(String(dto.status || ''))) throw new BadRequestException("审核状态不正确");
    profile.status = dto.status as SocialProfileStatus;
    profile.visible = dto.visible === undefined ? profile.status !== "rejected" : Boolean(dto.visible);
    profile.reviewRemark = String(dto.reviewRemark || "").trim().slice(0, 500) || null;
    profile.reviewedAt = new Date();
    profile.reviewedByAdminId = admin?.id || null;
    const saved = await this.socialProfiles.save(profile);
    await this.notifications.sendNotification({ userId: profile.userId, channel: "site", title: "社交资料审核结果", content: `${profile.status === "approved" ? "资料已通过，可以开始拓展连接" : profile.status === "rejected" ? "资料未通过" : "资料待审核"}${profile.reviewRemark ? `：${profile.reviewRemark}` : ""}`, remark: `社交资料审核:${profile.id}` }, admin).catch(() => null);
    return saved;
  }

  private async createCommunityCommentNotifications(comment:CommunityPostComment){const post=await this.communityPosts.findOneBy({id:comment.postId});if(!post)return;const parent=comment.parentId?await this.communityPostComments.findOneBy({id:comment.parentId}):null;const targets=communityNotificationTargets({actorUserId:comment.userId,postAuthorUserId:post.userId,parentAuthorUserId:parent?.userId,mentionUserIds:comment.mentionUserIds});if(!targets.length)return;await this.communityNotifications.save(targets.map(({userId,type})=>this.communityNotifications.create({userId,type,postId:post.id,commentId:comment.id,actorUserId:comment.userId,title:type==="mention"?"你在评论中被提及":type==="reply"?"你的评论有新回复":"你的动态有新评论",content:comment.content.slice(0,160),readAt:null})));}

  private async adjustPostCommentCount(postId: number, delta: number) {
    const post = await this.communityPosts.findOne({ where: { id: postId } });
    if (!post) return;
    post.comments = await this.communityPostComments.count({where:{postId,status:"approved",deletedAt:IsNull()}});
    await this.communityPosts.save(post);
  }

  private async assignCourseTeacher(course: Course, teacherId: unknown, admin?: AdminContext) {
    if (this.isCourseTeacherScoped(admin)) {
      const ownTeacher = await this.linkedCourseTeacher(admin);
      if (!ownTeacher || ownTeacher.status !== "active") throw new ForbiddenException("当前账号未绑定启用的讲师档案");
      const requestedId = Number(teacherId || 0);
      if (requestedId && requestedId !== ownTeacher.id) throw new BadRequestException("讲师账号只能维护本人课程");
      course.teacher = ownTeacher;
      course.teacherName = ownTeacher.name;
      course.teacherAvatar = ownTeacher.avatarUrl;
      return;
    }
    const id = Number(teacherId || 0);
    if (!id) { course.teacher = null; return; }
    const teacher = await this.courseTeachers.findOne({ where: { id }, relations: { tenant: true } });
    if (!teacher || teacher.status !== "active") throw new BadRequestException("讲师不存在或已停用");
    assertTenantAccessForActor(teacher, admin, "讲师不存在或不属于当前商家");
    if (course.tenant?.id && teacher.tenant?.id && course.tenant.id !== teacher.tenant.id) throw new BadRequestException("课程和讲师必须属于同一商家");
    course.teacher = teacher;
    course.teacherName = teacher.name;
    course.teacherAvatar = teacher.avatarUrl;
  }

  private async assignCourseAccess(course: Course, dto: any) {
    if (dto.accessMode !== undefined) course.accessMode = ["member", "redeem"].includes(String(dto.accessMode || "")) ? dto.accessMode : "price";
    if (dto.completionThreshold !== undefined || !course.completionThreshold) course.completionThreshold = normalizedCourseCompletionThreshold(dto.completionThreshold);
    if (dto.requiredMemberLevelId === undefined && course.requiredMemberLevel) return;
    const levelId = Number(dto.requiredMemberLevelId || 0);
    course.requiredMemberLevel = levelId ? await this.memberLevels.findOne({ where: { id: levelId, tenantScopeKey: memberLevelScopeKey(course.tenant) } }) : null;
    if (course.accessMode === "member" && levelId && !course.requiredMemberLevel) throw new BadRequestException("会员等级不存在或不属于当前商家");
  }

  private normalizeLessonDto(dto: any) {
    const contentType = ["video", "audio", "article", "attachment"].includes(String(dto.contentType || "")) ? dto.contentType : "video";
    return { ...dto, contentType, status: dto.status === "draft" ? "draft" : "published", videoUrl: String(dto.videoUrl || "").trim().slice(0, 500) || null, audioUrl: String(dto.audioUrl || "").trim().slice(0, 500) || null, attachmentUrl: String(dto.attachmentUrl || "").trim().slice(0, 500) || null, attachmentName: String(dto.attachmentName || "").trim().slice(0, 160) || null, content: String(dto.content || "").trim().slice(0, 50000) || null };
  }

  private async claimLessonPrivateResources(dto: any, courseId: number, admin?: AdminContext) {
    const course = await this.assertCourseAccess(courseId, admin);
    const secret = this.config.get<string>("PRIVATE_ASSET_SIGNING_SECRET") || this.config.get<string>("JWT_SECRET", "dev-secret-change-me");
    for (const key of ["videoUrl", "audioUrl", "attachmentUrl"] as const) {
      const value = String(dto[key] || "").trim();
      if (!value.startsWith("private-course-resource://")) continue;
      const token = value.match(/^private-course-resource:\/\/([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/)?.[1];
      const payload = token ? verifyPrivateAssetToken(token, secret) : null;
      if (!payload || payload.purpose !== "course_resource" || payload.contextId !== course.id || (payload.tenantId || null) !== (course.tenant?.id || null) || !privateDocumentExists(payload.reference)) throw new BadRequestException("课程资源无效或不属于当前课程");
      claimPrivateDocument(payload.reference);
    }
  }

  async coursesOverview(query: { tenantId?: string | number } = {}, admin?: AdminContext) {
    const grossBuilder = this.scopedCourseOrderQuery(admin, query.tenantId)
      .andWhere("courseOrder.status IN (:...paidStatuses)", { paidStatuses: [CourseOrderStatus.Paid, CourseOrderStatus.PartiallyRefunded, CourseOrderStatus.Refunded] })
      .select("COALESCE(SUM(courseOrder.amountFen), 0)", "amountFen");
    const refundBuilder = this.scopedCourseRefundQuery(admin, query.tenantId)
      .andWhere("refund.status = :completedRefundStatus", { completedRefundStatus: "completed" })
      .select("COALESCE(SUM(refund.amountFen), 0)", "amountFen");
    const [published, draft, totalOrders, pendingOfflineOrders, paidCourses, freeCourses, recentOrders, grossRow, refundRow] = await Promise.all([
      this.scopedCourseQuery(admin, query.tenantId).andWhere("course.status = :status", { status: "published" }).getCount(),
      this.scopedCourseQuery(admin, query.tenantId).andWhere("course.status = :status", { status: "draft" }).getCount(),
      this.scopedCourseOrderQuery(admin, query.tenantId).getCount(),
      this.scopedCourseOrderQuery(admin, query.tenantId).andWhere("courseOrder.status = :status", { status: CourseOrderStatus.PendingPayment }).getCount(),
      this.scopedCourseQuery(admin, query.tenantId).andWhere("course.price > 0").getCount(),
      this.scopedCourseQuery(admin, query.tenantId).andWhere("course.price <= 0").getCount(),
      this.scopedCourseOrderQuery(admin, query.tenantId).orderBy("courseOrder.createdAt", "DESC").take(8).getMany(),
      grossBuilder.getRawOne<{ amountFen: string | number }>(),
      refundBuilder.getRawOne<{ amountFen: string | number }>()
    ]);
    const grossAmountFen = Number(grossRow?.amountFen || 0);
    const refundAmountFen = Number(refundRow?.amountFen || 0);
    const netAmountFen = grossAmountFen - refundAmountFen;
    return {
      kpis: { published, draft, totalOrders, pendingOfflineOrders, paidCourses, freeCourses, grossAmountFen, refundAmountFen, netAmountFen },
      todos: [
        { key: "pending_offline_orders", label: "待确认课程收款", count: pendingOfflineOrders },
        { key: "draft_courses", label: "草稿课程", count: draft }
      ],
      alerts: [
        ...(pendingOfflineOrders ? [{ level: "warning", message: "存在待确认收款课程订单，确认后用户学习权限会开通。" }] : []),
        ...(netAmountFen < 0 ? [{ level: "warning", message: "当前筛选范围课程净额为负，请核对跨期退款。" }] : [])
      ],
      recentRecords: recentOrders
    };
  }

  async courseInsights(courseId: number, admin?: AdminContext) {
    const course = await this.assertCourseAccess(courseId, admin);
    const completionThreshold = normalizedCourseCompletionThreshold(course.completionThreshold);
    const grossStatuses = [CourseOrderStatus.Paid, CourseOrderStatus.PartiallyRefunded, CourseOrderStatus.Refunded];
    const orderBuilder = this.courseOrders.createQueryBuilder("courseOrder").where("courseOrder.courseId = :courseId", { courseId });
    const refundBuilder = this.courseRefunds.createQueryBuilder("refund").innerJoin("refund.order", "courseOrder").where("courseOrder.courseId = :courseId", { courseId });
    const learningBuilder = this.userLearning.createQueryBuilder("learning").where("learning.courseId = :courseId", { courseId }).andWhere("learning.lessonId = 0");
    const [orderRow, refundRow, learningRow, certificateRow] = await Promise.all([
      orderBuilder
        .select("COUNT(courseOrder.id)", "orderCount")
        .addSelect("COALESCE(SUM(CASE WHEN courseOrder.status IN (:...grossStatuses) THEN 1 ELSE 0 END), 0)", "paidOrderCount")
        .addSelect("COALESCE(SUM(CASE WHEN courseOrder.status IN (:...grossStatuses) THEN courseOrder.amountFen ELSE 0 END), 0)", "grossAmountFen")
        .setParameter("grossStatuses", grossStatuses)
        .getRawOne<any>(),
      refundBuilder.andWhere("refund.status = :status", { status: "completed" }).select("COUNT(refund.id)", "refundCount").addSelect("COALESCE(SUM(refund.amountFen), 0)", "refundAmountFen").getRawOne<any>(),
      learningBuilder
        .select("COUNT(learning.id)", "learnerCount")
        .addSelect("COALESCE(SUM(CASE WHEN learning.progress > 0 THEN 1 ELSE 0 END), 0)", "startedLearnerCount")
        .addSelect("COALESCE(SUM(CASE WHEN learning.completedAt IS NOT NULL OR learning.progress >= :completionThreshold THEN 1 ELSE 0 END), 0)", "completedLearnerCount")
        .addSelect("COALESCE(AVG(learning.progress), 0)", "averageProgress")
        .addSelect("MAX(learning.updatedAt)", "latestLearningAt")
        .setParameter("completionThreshold", completionThreshold)
        .getRawOne<any>(),
      this.certificates.createQueryBuilder("certificate").where("certificate.courseId = :courseId", { courseId }).andWhere("certificate.templateKey = :templateKey", { templateKey: "course_completion" }).select("COALESCE(SUM(CASE WHEN certificate.status = 'active' THEN 1 ELSE 0 END), 0)", "activeCertificateCount").addSelect("COALESCE(SUM(CASE WHEN certificate.status = 'revoked' THEN 1 ELSE 0 END), 0)", "revokedCertificateCount").getRawOne<any>()
    ]);
    const learnerCount = Number(learningRow?.learnerCount || 0);
    const completedLearnerCount = Number(learningRow?.completedLearnerCount || 0);
    const grossAmountFen = Number(orderRow?.grossAmountFen || 0);
    const refundAmountFen = Number(refundRow?.refundAmountFen || 0);
    return {
      course: { id: course.id, title: course.title, teacher: course.teacher ? { id: course.teacher.id, name: course.teacher.name } : null, tenantId: course.tenant?.id || null, completionThreshold },
      kpis: {
        orderCount: Number(orderRow?.orderCount || 0),
        paidOrderCount: Number(orderRow?.paidOrderCount || 0),
        refundCount: Number(refundRow?.refundCount || 0),
        grossAmountFen,
        refundAmountFen,
        netAmountFen: grossAmountFen - refundAmountFen,
        learnerCount,
        startedLearnerCount: Number(learningRow?.startedLearnerCount || 0),
        completedLearnerCount,
        completionRate: learnerCount ? Number(((completedLearnerCount / learnerCount) * 100).toFixed(2)) : 0,
        averageProgress: Number(Number(learningRow?.averageProgress || 0).toFixed(2)),
        activeCertificateCount: Number(certificateRow?.activeCertificateCount || 0),
        revokedCertificateCount: Number(certificateRow?.revokedCertificateCount || 0),
        latestLearningAt: learningRow?.latestLearningAt || null
      }
    };
  }

  async listCourseLearners(courseId: number, query: { keyword?: string; status?: string; sortBy?: string; sortOrder?: string; page?: string | number; pageSize?: string | number } = {}, admin?: AdminContext, maximumPageSize = 100) {
    const course = await this.assertCourseAccess(courseId, admin);
    const completionThreshold = normalizedCourseCompletionThreshold(course.completionThreshold);
    const requestedPage = Number(query.page || 1);
    const requestedPageSize = Number(query.pageSize || 20);
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0 ? Math.min(requestedPageSize, maximumPageSize) : 20;
    const builder = this.userLearning.createQueryBuilder("learning").innerJoin(User, "user", "user.id = learning.userId").where("learning.courseId = :courseId", { courseId }).andWhere("learning.lessonId = 0");
    const keyword = String(query.keyword || "").trim().slice(0, 100);
    if (keyword) builder.andWhere("(user.nickname LIKE :keyword OR user.phone LIKE :keyword OR CAST(user.id AS CHAR) = :exactUserId)", { keyword: `%${keyword}%`, exactUserId: keyword });
    if (query.status === "completed") builder.andWhere("(learning.completedAt IS NOT NULL OR learning.progress >= :completionThreshold)", { completionThreshold });
    if (query.status === "in_progress") builder.andWhere("learning.completedAt IS NULL AND learning.progress > 0 AND learning.progress < :completionThreshold", { completionThreshold });
    if (query.status === "not_started") builder.andWhere("learning.completedAt IS NULL AND learning.progress <= 0");
    const total = await builder.getCount();
    const sortColumns: Record<string, string> = { progress: "learning.progress", grantedAt: "learning.createdAt", lastLearnedAt: "learning.updatedAt" };
    const sortColumn = sortColumns[String(query.sortBy || "lastLearnedAt")] || sortColumns.lastLearnedAt;
    const sortOrder: "ASC" | "DESC" = String(query.sortOrder || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
    const rows = await builder
      .select("learning.id", "learningId")
      .addSelect("learning.userId", "userId")
      .addSelect("user.nickname", "nickname")
      .addSelect("user.phone", "phone")
      .addSelect("learning.progress", "progress")
      .addSelect("learning.completedAt", "completedAt")
      .addSelect("learning.createdAt", "grantedAt")
      .addSelect("learning.updatedAt", "lastLearnedAt")
      .orderBy(sortColumn, sortOrder)
      .addOrderBy("learning.id", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getRawMany<any>();
    const userIds = rows.map((row) => Number(row.userId));
    const grossStatuses = [CourseOrderStatus.Paid, CourseOrderStatus.PartiallyRefunded, CourseOrderStatus.Refunded];
    const [orderRows, refundRows, certificateRows] = userIds.length ? await Promise.all([
      this.courseOrders.createQueryBuilder("courseOrder").innerJoin("courseOrder.user", "user").where("courseOrder.courseId = :courseId", { courseId }).andWhere("user.id IN (:...userIds)", { userIds }).select("user.id", "userId").addSelect("COUNT(courseOrder.id)", "orderCount").addSelect("COALESCE(SUM(CASE WHEN courseOrder.status IN (:...grossStatuses) THEN 1 ELSE 0 END), 0)", "paidOrderCount").addSelect("COALESCE(SUM(CASE WHEN courseOrder.status IN (:...grossStatuses) THEN courseOrder.amountFen ELSE 0 END), 0)", "grossAmountFen").addSelect("MAX(courseOrder.paidAt)", "latestPaidAt").setParameter("grossStatuses", grossStatuses).groupBy("user.id").getRawMany<any>(),
      this.courseRefunds.createQueryBuilder("refund").innerJoin("refund.order", "courseOrder").innerJoin("courseOrder.user", "user").where("courseOrder.courseId = :courseId", { courseId }).andWhere("user.id IN (:...userIds)", { userIds }).andWhere("refund.status = :status", { status: "completed" }).select("user.id", "userId").addSelect("COUNT(refund.id)", "refundCount").addSelect("COALESCE(SUM(refund.amountFen), 0)", "refundAmountFen").groupBy("user.id").getRawMany<any>(),
      this.certificates.find({ where: { courseId, userId: In(userIds), templateKey: "course_completion" }, order: { issuedAt: "DESC", id: "DESC" }, loadEagerRelations: false })
    ]) : [[], [], []];
    const orderByUser = new Map(orderRows.map((row) => [Number(row.userId), row]));
    const refundByUser = new Map(refundRows.map((row) => [Number(row.userId), row]));
    const certificateByUser = new Map<number, Certificate>();
    for (const certificate of certificateRows) {
      const current = certificateByUser.get(certificate.userId);
      if (!current || current.status !== "active" && certificate.status === "active") certificateByUser.set(certificate.userId, certificate);
    }
    const items = rows.map((row) => {
      const userId = Number(row.userId);
      const order = orderByUser.get(userId);
      const refund = refundByUser.get(userId);
      const certificate = certificateByUser.get(userId);
      const progress = Number(row.progress || 0);
      const grossAmountFen = Number(order?.grossAmountFen || 0);
      const refundAmountFen = Number(refund?.refundAmountFen || 0);
      return {
        learningId: Number(row.learningId),
        user: { id: userId, nickname: row.nickname || null, phone: maskPhone(row.phone) },
        progress,
        completionStatus: row.completedAt || progress >= completionThreshold ? "completed" : progress > 0 ? "in_progress" : "not_started",
        completedAt: row.completedAt || null,
        grantedAt: row.grantedAt,
        lastLearnedAt: row.lastLearnedAt,
        orderCount: Number(order?.orderCount || 0),
        paidOrderCount: Number(order?.paidOrderCount || 0),
        refundCount: Number(refund?.refundCount || 0),
        grossAmountFen,
        refundAmountFen,
        netAmountFen: grossAmountFen - refundAmountFen,
        latestPaidAt: order?.latestPaidAt || null,
        certificate: certificate ? { id: certificate.id, certificateNo: certificate.certificateNo, status: certificate.status, issuedAt: certificate.issuedAt, revokedAt: certificate.revokedAt } : null
      };
    });
    return { course: { id: course.id, title: course.title, completionThreshold }, items, total, page, pageSize };
  }

  async exportCourseInsights(courseId: number, query: { keyword?: string; status?: string; sortBy?: string; sortOrder?: string } = {}, admin?: AdminContext) {
    const summary = await this.courseInsights(courseId, admin);
    const first = await this.listCourseLearners(courseId, { ...query, page: 1, pageSize: 500 }, admin, 500);
    if (first.total > 10000) throw new BadRequestException("课程学员超过 10000 人，请先按状态或关键词筛选后导出");
    const learners = [...first.items];
    for (let page = 2; learners.length < first.total; page += 1) {
      const next = await this.listCourseLearners(courseId, { ...query, page, pageSize: 500 }, admin, 500);
      learners.push(...next.items);
    }
    if (learners.length !== first.total) throw new BadRequestException("课程学员导出数量校验失败，请重试");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "慢π活动报名平台";
    workbook.created = new Date();
    const summarySheet = workbook.addWorksheet("课程汇总", { views: [{ state: "frozen", ySplit: 1 }] });
    summarySheet.columns = [{ header: "指标", key: "label", width: 24 }, { header: "值", key: "value", width: 28 }];
    const kpis = summary.kpis;
    summarySheet.addRows([
      { label: "课程ID", value: summary.course.id }, { label: "课程名称", value: summary.course.title }, { label: "讲师", value: summary.course.teacher?.name || "-" }, { label: "完成阈值", value: `${summary.course.completionThreshold}%` },
      { label: "订单数", value: kpis.orderCount }, { label: "有效支付订单", value: kpis.paidOrderCount }, { label: "退款单数", value: kpis.refundCount }, { label: "课程毛额（分）", value: kpis.grossAmountFen }, { label: "退款金额（分）", value: kpis.refundAmountFen }, { label: "课程净额（分）", value: kpis.netAmountFen },
      { label: "学员数", value: kpis.learnerCount }, { label: "已开始", value: kpis.startedLearnerCount }, { label: "已完课", value: kpis.completedLearnerCount }, { label: "完课率", value: `${kpis.completionRate}%` }, { label: "平均进度", value: `${kpis.averageProgress}%` }, { label: "有效证书", value: kpis.activeCertificateCount }, { label: "已撤销证书", value: kpis.revokedCertificateCount }, { label: "最近学习时间", value: kpis.latestLearningAt || "-" }
    ]);
    const learnerSheet = workbook.addWorksheet("学员明细", { views: [{ state: "frozen", ySplit: 1 }] });
    learnerSheet.columns = [
      { header: "用户ID", key: "userId", width: 12 }, { header: "昵称", key: "nickname", width: 20 }, { header: "手机号（脱敏）", key: "phone", width: 18 }, { header: "学习状态", key: "status", width: 14 }, { header: "进度%", key: "progress", width: 12 }, { header: "获得权限时间", key: "grantedAt", width: 22 }, { header: "最近学习时间", key: "lastLearnedAt", width: 22 }, { header: "完课时间", key: "completedAt", width: 22 }, { header: "订单数", key: "orderCount", width: 12 }, { header: "毛额（分）", key: "gross", width: 14 }, { header: "退款（分）", key: "refund", width: 14 }, { header: "净额（分）", key: "net", width: 14 }, { header: "证书状态", key: "certificateStatus", width: 14 }, { header: "证书编号", key: "certificateNo", width: 28 }
    ];
    learnerSheet.addRows(learners.map((row) => ({ userId: row.user.id, nickname: row.user.nickname || "", phone: row.user.phone || "", status: row.completionStatus, progress: row.progress, grantedAt: row.grantedAt, lastLearnedAt: row.lastLearnedAt, completedAt: row.completedAt || "", orderCount: row.orderCount, gross: row.grossAmountFen, refund: row.refundAmountFen, net: row.netAmountFen, certificateStatus: row.certificate?.status || "none", certificateNo: row.certificate?.certificateNo || "" })));
    for (const sheet of [summarySheet, learnerSheet]) {
      sheet.getRow(1).font = { bold: true };
      sheet.autoFilter = { from: "A1", to: sheet.getRow(1).getCell(sheet.columnCount).address };
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async communityOverview(query: { tenantId?: string | number } = {}, admin?: AdminContext) {
    const todayStart = this.startOfToday();
    const [activities, checkinTasks, pendingPosts, pendingComments, todayPosts, todayLikes, todayComments, duplicateTasks, recentPosts] = await Promise.all([
      this.scopedCommunityActivityQuery(admin, query.tenantId).getCount(),
      this.scopedCheckinTaskQuery(admin, query.tenantId).getCount(),
      this.scopedCommunityPostQuery(admin, query.tenantId).andWhere("post.status = :status", { status: "pending" }).getCount(),
      this.scopedCommunityCommentQuery(admin, query.tenantId).andWhere("comment.status = :status", { status: "pending" }).getCount(),
      this.scopedCommunityPostQuery(admin, query.tenantId).andWhere("post.createdAt >= :todayStart", { todayStart }).getCount(),
      this.scopedCommunityLikeQuery(admin, query.tenantId).andWhere("likeRow.createdAt >= :todayStart", { todayStart }).getCount(),
      this.scopedCommunityCommentQuery(admin, query.tenantId).andWhere("comment.createdAt >= :todayStart", { todayStart }).getCount(),
      this.duplicateCheckinTaskSummary(query.tenantId, admin),
      this.scopedCommunityPostQuery(admin, query.tenantId).orderBy("post.createdAt", "DESC").take(8).getMany()
    ]);
    return {
      kpis: { activities, checkinTasks, pendingPosts, pendingComments, todayInteraction: todayPosts + todayLikes + todayComments },
      todos: [
        { key: "pending_posts", label: "待审核动态", count: pendingPosts },
        { key: "pending_comments", label: "待审核评论", count: pendingComments },
        { key: "duplicate_checkins", label: "重复打卡任务", count: duplicateTasks.length }
      ],
      alerts: duplicateTasks.map((item) => ({ level: "warning", message: `${item.scope} ${item.date} 存在 ${item.count} 个打卡任务，请保留一条。` })),
      recentRecords: recentPosts
    };
  }

  async forumOverview(query: { tenantId?: string | number } = {}, admin?: AdminContext) {
    const todayStart = this.startOfToday();
    const [categories, moderators, topics, lockedTopics, pendingTopics, pendingReplies, pendingReports, todayTopics, todayReplies, recentTopics, recentReports] = await Promise.all([
      this.scopedForumCategoryQuery(admin, query.tenantId).getCount(),
      this.scopedForumModeratorQuery(admin, query.tenantId).getCount(),
      this.scopedForumTopicQuery(admin, query.tenantId).getCount(),
      this.scopedForumTopicQuery(admin, query.tenantId).andWhere("topic.locked = :locked", { locked: true }).getCount(),
      this.scopedForumTopicQuery(admin, query.tenantId).andWhere("topic.status = :status", { status: "pending" }).getCount(),
      this.scopedForumReplyQuery(admin, query.tenantId).andWhere("reply.status = :status", { status: "pending" }).getCount(),
      this.scopedForumReportQuery(admin, query.tenantId).andWhere("report.status = :status", { status: "pending" }).getCount(),
      this.scopedForumTopicQuery(admin, query.tenantId).andWhere("topic.createdAt >= :todayStart", { todayStart }).getCount(),
      this.scopedForumReplyQuery(admin, query.tenantId).andWhere("reply.createdAt >= :todayStart", { todayStart }).getCount(),
      this.scopedForumTopicQuery(admin, query.tenantId).orderBy("topic.createdAt", "DESC").take(8).getMany(),
      this.scopedForumReportQuery(admin, query.tenantId).orderBy("report.createdAt", "DESC").take(8).getMany()
    ]);
    return {
      kpis: { categories, moderators, topics, lockedTopics, pendingTopics, pendingReplies, pendingReports, todayInteraction: todayTopics + todayReplies },
      todos: [
        { key: "pending_topics", label: "待审核帖子", count: pendingTopics },
        { key: "pending_replies", label: "待审核回复", count: pendingReplies },
        { key: "pending_reports", label: "待处理举报", count: pendingReports }
      ],
      alerts: pendingReports ? [{ level: "warning", message: "论坛存在待处理举报，请优先处理。" }] : [],
      recentRecords: { topics: recentTopics, reports: recentReports }
    };
  }

  async listForumCategories(query: { tenantId?: string | number; enabled?: string | boolean } = {}, admin?: AdminContext) {
    const builder = this.scopedForumCategoryQuery(admin, query.tenantId).orderBy("category.sortOrder", "ASC").addOrderBy("category.id", "ASC");
    if (query.enabled !== undefined && query.enabled !== "") builder.andWhere("category.enabled = :enabled", { enabled: query.enabled === true || query.enabled === "true" || query.enabled === "1" });
    return builder.getMany();
  }

  async saveForumCategory(dto: any, id?: number, admin?: AdminContext) {
    const category = id ? await this.assertForumCategoryAccess(id, admin) : this.forumCategories.create();
    const name = String(dto.name || "").trim();
    if (!name) throw new BadRequestException("请填写版块名称");
    category.name = name.slice(0, 80);
    category.description = this.optionalText(dto.description, 255);
    category.sortOrder = Number.isFinite(Number(dto.sortOrder)) ? Number(dto.sortOrder) : 0;
    category.enabled = dto.enabled === undefined ? true : Boolean(dto.enabled);
    category.postPermission = this.normalizeChoice(dto.postPermission, ["user", "admin"], "user") as any;
    category.auditMode = this.normalizeChoice(dto.auditMode, ["pre", "post", "closed"], "pre") as any;
    await this.assignTenant(category, dto, admin, "forum");
    return this.forumCategories.save(category);
  }

  async deleteForumCategory(id: number, admin?: AdminContext) {
    await this.assertForumCategoryAccess(id, admin);
    const used = await this.forumTopics.count({ where: { category: { id } } });
    if (used) throw new BadRequestException("该版块已有帖子，请先停用版块，不建议删除历史内容");
    await this.forumCategories.delete(id);
    return { success: true };
  }

  async listForumModeratorCandidates(query: { tenantId?: string | number } = {}, admin?: AdminContext) {
    const builder = this.adminUsers.createQueryBuilder("candidate").leftJoinAndSelect("candidate.tenant", "tenant")
      .where("candidate.enabled = :enabled", { enabled: true })
      .andWhere("candidate.role IN (:...roles)", { roles: ["admin", "super_admin", "operator"] })
      .orderBy("candidate.username", "ASC");
    const requestedTenantId = Number(query.tenantId || 0) || null;
    if (admin?.tenantId) builder.andWhere("candidate.tenantId = :tenantId", { tenantId: admin.tenantId });
    else if (requestedTenantId) builder.andWhere("candidate.tenantId = :tenantId", { tenantId: requestedTenantId });
    else builder.andWhere("candidate.tenantId IS NULL");
    return builder.getMany();
  }

  async listForumModerators(query: { tenantId?: string | number; categoryId?: string | number } = {}, admin?: AdminContext) {
    const builder = this.scopedForumModeratorQuery(admin, query.tenantId).orderBy("moderator.createdAt", "DESC");
    if (query.categoryId) builder.andWhere("moderator.categoryId = :categoryId", { categoryId: Number(query.categoryId) });
    return builder.getMany();
  }

  async addForumModerator(categoryId: number, dto: { adminId?: number; permissions?: string[] }, admin?: AdminContext) {
    const category = await this.assertForumCategoryAccess(categoryId, admin);
    this.assertTenantFeatureWritable(category.tenant, "forum");
    const candidate = await this.adminUsers.findOne({ where: { id: Number(dto.adminId || 0), enabled: true } });
    if (!candidate || !["admin", "super_admin", "operator"].includes(candidate.role)) throw new BadRequestException("请选择可用的运营管理员");
    if ((category.tenant?.id || null) !== (candidate.tenant?.id || null)) throw new BadRequestException("版主必须属于版块所在商家");
    const existing = await this.forumCategoryModerators.findOne({ where: { category: { id: categoryId }, admin: { id: candidate.id } } });
    if (existing) return existing;
    return this.forumCategoryModerators.save(this.forumCategoryModerators.create({
      tenant: category.tenant || null,
      category,
      admin: candidate,
      permissions: this.normalizeStringArray(dto.permissions?.length ? dto.permissions : ["topic_review", "reply_review", "topic_lock", "topic_feature"], 10),
      createdByAdminId: admin?.id || null
    }));
  }

  async removeForumModerator(id: number, admin?: AdminContext) {
    const row = await this.forumCategoryModerators.findOne({ where: { id } });
    if (!row) throw new NotFoundException("版主配置不存在");
    await this.assertForumCategoryAccess(row.category.id, admin);
    await this.forumCategoryModerators.delete(id);
    return { success: true };
  }

  async listCommunityActivityMembers(activityId:number,query:any,admin?:AdminContext){await this.assertCommunityActivityAccess(activityId,admin);const builder=this.communityActivityMembers.createQueryBuilder("member").leftJoinAndSelect("member.activity","activity").leftJoinAndSelect("member.tenant","tenant").where("member.activityId=:activityId",{activityId}).orderBy("member.id","DESC");if(query.status)builder.andWhere("member.status=:status",{status:query.status});return builder.getMany();}
  async reviewCommunityActivityMember(id:number,dto:any,admin?:AdminContext){const member=await this.communityActivityMembers.findOneBy({id});if(!member)throw new NotFoundException("共学成员申请不存在");const activity=await this.assertCommunityActivityAccess(member.activityId,admin);if(member.status!=="pending")throw new BadRequestException("成员申请已处理");member.status=dto.action==="reject"?"rejected":"joined";member.reviewRemark=String(dto.reviewRemark||"").trim().slice(0,500)||null;member.reviewedAt=new Date();member.reviewedByAdminId=admin?.id||null;member.joinedAt=member.status==="joined"?new Date():null;const saved=await this.communityActivityMembers.save(member);activity.registeredCount=await this.communityActivityMembers.count({where:{activityId:activity.id,status:"joined"}});await this.communityActivities.save(activity);return saved;}
  async listCommunityCheckins(query:any,admin?:AdminContext){const builder=this.communityCheckins.createQueryBuilder("checkin").leftJoinAndSelect("checkin.tenant","tenant").leftJoin(CheckInTask,"task","task.id=checkin.taskId").leftJoin(CommunityActivity,"activity","activity.id=checkin.activityId").orderBy("checkin.id","DESC").take(500);applyTenantScopeToQuery(builder,"checkin",admin);this.applyPlatformTenantFilter(builder,"checkin",query.tenantId,admin);if(query.activityId)builder.andWhere("checkin.activityId=:activityId",{activityId:Number(query.activityId)});if(query.status)builder.andWhere("checkin.status=:status",{status:query.status});return builder.getRawMany();}
  async reviewCommunityCheckin(id: number, dto: any, admin?: AdminContext) {
    const current = await this.communityCheckins.findOneBy({ id });
    if (!current) throw new NotFoundException("打卡记录不存在");
    if (current.activityId) await this.assertCommunityActivityAccess(current.activityId, admin);
    else assertTenantAccessForActor(current, admin, "打卡记录不存在或不属于当前商家");
    return this.dataSource.transaction(async (manager) => {
      const checkinRepo = manager.getRepository(CommunityCheckIn);
      const taskRepo = manager.getRepository(CheckInTask);
      const row = await checkinRepo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!row) throw new NotFoundException("打卡记录不存在");
      if (row.status !== "pending") throw new BadRequestException("打卡记录已审核");
      row.status = dto.action === "reject" ? "rejected" : "approved";
      row.reviewRemark = String(dto.reviewRemark || "").trim().slice(0, 500) || null;
      row.reviewedAt = new Date();
      row.reviewedByAdminId = admin?.id || null;
      const saved = await checkinRepo.save(row);
      const task = await taskRepo.findOne({ where: { id: row.taskId }, lock: { mode: "pessimistic_write" } });
      if (task) {
        const countBuilder = checkinRepo.createQueryBuilder("checkin")
          .where("checkin.taskId = :taskId", { taskId: task.id })
          .andWhere("checkin.status = :status", { status: "approved" });
        if (task.tenant?.id) countBuilder.andWhere("checkin.tenantId = :tenantId", { tenantId: task.tenant.id });
        else countBuilder.andWhere("checkin.tenantId IS NULL");
        task.completedCount = await countBuilder.getCount();
        await taskRepo.save(task);
      }
      return saved;
    });
  }

  async listForumTopics(query: any = {}, admin?: AdminContext) {
    const builder = this.scopedForumTopicQuery(admin, query.tenantId).orderBy("topic.pinned", "DESC").addOrderBy("topic.featured", "DESC").addOrderBy("topic.lastReplyAt", "DESC").addOrderBy("topic.createdAt", "DESC").take(Math.min(Number(query.limit || 50), 100));
    if (query.status) builder.andWhere("topic.status = :status", { status: query.status });
    if (query.categoryId) builder.andWhere("topic.categoryId = :categoryId", { categoryId: Number(query.categoryId) });
    if (query.keyword) builder.andWhere("(topic.title LIKE :keyword OR topic.content LIKE :keyword)", { keyword: `%${String(query.keyword).trim()}%` });
    return builder.getMany();
  }

  async updateForumTopic(id: number, dto: any, admin?: AdminContext) {
    const topic = await this.assertForumTopicAccess(id, admin);
    const oldStatus = topic.status;
    this.assertTenantFeatureWritable(topic.tenant, "forum");
    if (dto.title !== undefined) {
      const title = String(dto.title || "").trim();
      if (!title) throw new BadRequestException("请填写帖子标题");
      topic.title = title.slice(0, 120);
    }
    if (dto.content !== undefined) topic.content = this.requiredText(dto.content, 1, 10000, "请填写帖子内容");
    if (dto.categoryId !== undefined) topic.category = await this.resolveForumCategoryForTopic(dto.categoryId, topic.tenant, admin);
    if (dto.images !== undefined) topic.images = this.normalizeStringArray(dto.images, 9);
    if (dto.tags !== undefined) topic.tags = this.normalizeStringArray(dto.tags, 10);
    if (dto.pinned !== undefined) topic.pinned = Boolean(dto.pinned);
    if (dto.featured !== undefined) topic.featured = Boolean(dto.featured);
    if (dto.status !== undefined) {
      topic.status = this.normalizeChoice(dto.status, ["pending", "approved", "rejected", "hidden"], topic.status) as ForumTopicStatus;
      topic.approvedAt = topic.status === "approved" ? topic.approvedAt || new Date() : null;
    }
    if (dto.reviewRemark !== undefined) topic.reviewRemark = this.optionalText(dto.reviewRemark, 1000);
    const saved = await this.forumTopics.save(topic);
    if (topic.userId && oldStatus !== topic.status) await this.notifications.sendNotification({ userId: topic.userId, channel: "site", title: "论坛帖子审核结果", content: `${topic.status === "approved" ? "已通过" : topic.status === "rejected" ? "未通过" : "已隐藏"}${topic.reviewRemark ? `：${topic.reviewRemark}` : ""}`, remark: `论坛帖子审核:${topic.id}` }, admin).catch(() => null);
    return saved;
  }

  async setForumTopicPin(id: number, dto: { pinned?: boolean }, admin?: AdminContext) {
    const topic = await this.assertForumTopicAccess(id, admin);
    this.assertTenantFeatureWritable(topic.tenant, "forum");
    topic.pinned = dto.pinned === undefined ? !topic.pinned : Boolean(dto.pinned);
    return this.forumTopics.save(topic);
  }

  async setForumTopicFeature(id: number, dto: { featured?: boolean }, admin?: AdminContext) {
    const topic = await this.assertForumTopicAccess(id, admin);
    this.assertTenantFeatureWritable(topic.tenant, "forum");
    topic.featured = dto.featured === undefined ? !topic.featured : Boolean(dto.featured);
    return this.forumTopics.save(topic);
  }

  async setForumTopicLock(id: number, dto: { locked?: boolean; reason?: string }, admin?: AdminContext) {
    const topic = await this.assertForumTopicAccess(id, admin);
    this.assertTenantFeatureWritable(topic.tenant, "forum");
    const locked = dto.locked === undefined ? !topic.locked : Boolean(dto.locked);
    topic.locked = locked;
    topic.lockReason = locked ? this.optionalText(dto.reason, 500) || "版主已关闭回复" : null;
    topic.lockedAt = locked ? new Date() : null;
    topic.lockedByAdminId = locked ? admin?.id || null : null;
    return this.forumTopics.save(topic);
  }

  async convertCommunityPostToForumTopic(id: number, dto: { categoryId?: number }, admin?: AdminContext) {
    const post = await this.assertCommunityPostAccess(id, admin);
    this.assertTenantFeatureWritable(post.tenant, "forum");
    const category = dto.categoryId ? await this.resolveForumCategoryForTopic(dto.categoryId, post.tenant || null, admin) : await this.ensureDefaultForumCategory(post.tenant || null, admin);
    const titleSource = post.activity?.title || String(post.content || "").replace(/\s+/g, " ").slice(0, 40);
    const topic = this.forumTopics.create({
      tenant: post.tenant || null,
      category,
      userId: post.userId || null,
      title: titleSource ? `活动心得：${titleSource}`.slice(0, 120) : `共修动态 #${post.id}`,
      content: post.content,
      images: post.images || [],
      tags: post.tags || [],
      activityId: post.activityId || null,
      status: post.status === "approved" ? "approved" : "pending",
      approvedAt: post.status === "approved" ? post.approvedAt || new Date() : null,
      lastReplyAt: post.createdAt
    });
    return this.forumTopics.save(topic);
  }

  async listForumReplies(query: any = {}, admin?: AdminContext) {
    const builder = this.scopedForumReplyQuery(admin, query.tenantId).orderBy("reply.createdAt", "DESC").take(Math.min(Number(query.limit || 100), 150));
    if (query.status) builder.andWhere("reply.status = :status", { status: query.status });
    if (query.topicId) builder.andWhere("reply.topicId = :topicId", { topicId: Number(query.topicId) });
    return builder.getMany();
  }

  async updateForumReply(id: number, dto: any, admin?: AdminContext) {
    const reply = await this.assertForumReplyAccess(id, admin);
    const oldStatus = reply.status;
    if (dto.content !== undefined) reply.content = this.requiredText(dto.content, 1, 5000, "请填写回复内容");
    if (dto.status !== undefined) {
      reply.status = this.normalizeChoice(dto.status, ["pending", "approved", "rejected", "hidden"], reply.status) as ForumReplyStatus;
      reply.approvedAt = reply.status === "approved" ? reply.approvedAt || new Date() : null;
    }
    if (dto.reviewRemark !== undefined) reply.reviewRemark = this.optionalText(dto.reviewRemark, 1000);
    const saved = await this.forumReplies.save(reply);
    await this.adjustForumTopicReplyCount(reply.topic.id, oldStatus, reply.status, reply.createdAt);
    if (reply.userId && oldStatus !== reply.status) await this.notifications.sendNotification({ userId: reply.userId, channel: "site", title: "论坛回复审核结果", content: `${reply.status === "approved" ? "已通过" : reply.status === "rejected" ? "未通过" : "已隐藏"}${reply.reviewRemark ? `：${reply.reviewRemark}` : ""}`, remark: `论坛回复审核:${reply.id}` }, admin).catch(() => null);
    return saved;
  }

  async listForumReports(query: any = {}, admin?: AdminContext) {
    const builder = this.scopedForumReportQuery(admin, query.tenantId).orderBy("report.createdAt", "DESC").take(Math.min(Number(query.limit || 100), 150));
    if (query.status) builder.andWhere("report.status = :status", { status: query.status });
    return builder.getMany();
  }

  async updateForumReport(id: number, dto: any, admin?: AdminContext) {
    const report = await this.assertForumReportAccess(id, admin);
    report.status = this.normalizeChoice(dto.status, ["pending", "resolved", "rejected"], report.status) as ForumReportStatus;
    report.handleRemark = this.optionalText(dto.handleRemark, 1000);
    report.handler = admin?.id ? ({ id: admin.id } as any) : null;
    report.handledAt = report.status === "pending" ? null : new Date();
    if (dto.hideTarget && report.status === "resolved") {
      if (report.reply) {
        report.reply.status = "hidden";
        await this.forumReplies.save(report.reply);
      } else if (report.topic) {
        report.topic.status = "hidden";
        await this.forumTopics.save(report.topic);
      }
    }
    const saved = await this.forumReports.save(report);
    if (report.reporterId && report.status !== "pending") await this.notifications.sendNotification({ userId: report.reporterId, channel: "site", title: "论坛举报处理结果", content: report.handleRemark || (report.status === "resolved" ? "举报已处理" : "举报未采纳"), remark: `论坛举报:${report.id}` }, admin).catch(() => null);
    return saved;
  }

  async listCommunityContentReports(query: any = {}, admin?: AdminContext) {
    const builder = this.communityContentReports.createQueryBuilder("report").leftJoinAndSelect("report.tenant", "tenant").orderBy("report.id", "DESC").take(500);
    applyTenantScopeToQuery(builder, "report", admin);
    this.applyPlatformTenantFilter(builder, "report", query.tenantId, admin);
    if (query.status) builder.andWhere("report.status = :status", { status: query.status });
    if (query.targetType) builder.andWhere("report.targetType = :targetType", { targetType: query.targetType });
    return builder.getMany();
  }

  async reviewCommunityContentReport(id: number, dto: any, admin?: AdminContext) {
    const report = await this.communityContentReports.findOneBy({ id });
    if (!report) throw new NotFoundException("社区举报不存在");
    assertTenantAccessForActor(report, admin, "社区举报不存在或不属于当前商家");
    if (report.status !== "pending") throw new BadRequestException("举报已处理");
    report.status = dto.status === "resolved" ? "resolved" : "rejected";
    report.handleRemark = this.requiredText(dto.handleRemark, 2, 1000, "请填写处理说明");
    report.handledByAdminId = admin?.id || null;
    report.handledAt = new Date();
    report.action = report.status === "resolved" ? this.normalizeChoice(dto.action, ["none", "hide", "sanction"], "hide") as any : "none";
    if (report.status === "resolved" && ["hide", "sanction"].includes(report.action || "")) {
      if (report.targetType === "post") {
        const post = await this.assertCommunityPostAccess(report.targetId, admin);
        post.visible = false;
        post.reviewRemark = report.handleRemark;
        await this.communityPosts.save(post);
      } else {
        const comment = await this.communityPostComments.findOneBy({ id: report.targetId });
        if (comment) {
          await this.assertCommunityPostAccess(comment.postId, admin);
          if (!comment.deletedAt && comment.status === "approved") await this.adjustPostCommentCount(comment.postId, -1);
          comment.deletedAt = comment.deletedAt || new Date();
          comment.reviewRemark = report.handleRemark;
          await this.communityPostComments.save(comment);
        }
      }
      if (report.action === "sanction") await this.createContentSanction({ userId: report.targetUserId, tenantId: report.tenant?.id, type: dto.sanctionType || "mute", scope: "community", endsAt: dto.sanctionEndsAt, reason: report.handleRemark, sourceType: "community_report", sourceId: report.id }, admin);
    }
    const saved = await this.communityContentReports.save(report);
    await this.ensureGovernanceMemberProfile(report.reporterId, report.tenant || null);
    await this.ensureGovernanceMemberProfile(report.targetUserId, report.tenant || null);
    await this.notifications.sendNotification({ userId: report.reporterId, channel: "site", title: "社区举报处理结果", content: report.handleRemark, remark: `社区举报:${report.id}` }, admin).catch(() => null);
    if (report.status === "resolved") await this.notifications.sendNotification({ userId: report.targetUserId, channel: "site", title: "社区内容处置通知", content: report.handleRemark, remark: `社区内容处置:${report.id}` }, admin).catch(() => null);
    return saved;
  }

  async listContentKeywordRules(query: any = {}, admin?: AdminContext) {
    const builder = this.contentKeywordRules.createQueryBuilder("rule").leftJoinAndSelect("rule.tenant", "tenant").orderBy("rule.id", "DESC");
    applyTenantScopeToQuery(builder, "rule", admin);
    this.applyPlatformTenantFilter(builder, "rule", query.tenantId, admin);
    if (query.scope) builder.andWhere("rule.scope = :scope", { scope: query.scope });
    if (query.enabled !== undefined && query.enabled !== "") builder.andWhere("rule.enabled = :enabled", { enabled: query.enabled === true || query.enabled === "true" || query.enabled === "1" });
    return builder.getMany();
  }

  async saveContentKeywordRule(dto: any, id?: number, admin?: AdminContext) {
    const row = id ? await this.contentKeywordRules.findOneBy({ id }) : this.contentKeywordRules.create();
    if (!row) throw new NotFoundException("关键词规则不存在");
    if (id) assertTenantAccessForActor(row, admin, "关键词规则不存在或不属于当前商家");
    row.keyword = this.requiredText(dto.keyword, 1, 120, "请填写关键词");
    row.scope = this.normalizeChoice(dto.scope, ["all", "community", "forum"], "all") as any;
    row.matchMode = this.normalizeChoice(dto.matchMode, ["contains", "exact"], "contains") as any;
    row.action = this.normalizeChoice(dto.action, ["review", "reject", "mask"], "review") as any;
    row.replacement = row.action === "mask" ? this.optionalText(dto.replacement, 120) : null;
    row.enabled = dto.enabled === undefined ? true : Boolean(dto.enabled);
    row.createdByAdminId = row.createdByAdminId || admin?.id || null;
    await this.assignGovernanceTenant(row, dto, admin);
    return this.contentKeywordRules.save(row);
  }

  async deleteContentKeywordRule(id: number, admin?: AdminContext) {
    const row = await this.contentKeywordRules.findOneBy({ id });
    if (!row) throw new NotFoundException("关键词规则不存在");
    assertTenantAccessForActor(row, admin, "关键词规则不存在或不属于当前商家");
    await this.contentKeywordRules.delete(id);
    return { success: true };
  }

  async listContentSanctions(query: any = {}, admin?: AdminContext) {
    await this.markExpiredContentSanctions();
    const builder = this.contentUserSanctions.createQueryBuilder("sanction").leftJoinAndSelect("sanction.tenant", "tenant").orderBy("sanction.id", "DESC").take(500);
    applyTenantScopeToQuery(builder, "sanction", admin);
    this.applyPlatformTenantFilter(builder, "sanction", query.tenantId, admin);
    if (query.userId) builder.andWhere("sanction.userId = :userId", { userId: Number(query.userId) });
    if (query.status) builder.andWhere("sanction.status = :status", { status: query.status });
    return builder.getMany();
  }

  async createContentSanction(dto: any, admin?: AdminContext) {
    const userId = Number(dto.userId || 0);
    if (!userId || !(await this.users.findOneBy({ id: userId }))) throw new NotFoundException("用户不存在");
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (Number.isNaN(startsAt.getTime()) || (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt))) throw new BadRequestException("处罚时间范围不正确");
    const createdAt = new Date();
    const row = this.contentUserSanctions.create({
      userId,
      scope: this.normalizeChoice(dto.scope, ["all", "community", "forum"], "all") as any,
      type: this.normalizeChoice(dto.type, ["mute", "ban"], "mute") as any,
      status: "active",
      reason: this.requiredText(dto.reason, 2, 500, "请填写处罚原因"),
      sourceType: this.optionalText(dto.sourceType, 40),
      sourceId: Number(dto.sourceId || 0) || null,
      startsAt,
      endsAt,
      issuedByAdminId: admin?.id || null,
      revokedByAdminId: null,
      revokedAt: null,
      revokeRemark: null,
      createdAt,
      updatedAt: createdAt
    });
    await this.assignGovernanceTenant(row, dto, admin);
    const saved = await this.contentUserSanctions.save(row);
    await this.ensureGovernanceMemberProfile(userId, saved.tenant || null);
    await this.notifications.sendNotification({ userId, channel: "site", title: "社区账号处罚通知", content: `${saved.type === "ban" ? "禁用" : "禁言"}原因：${saved.reason}`, remark: `内容处罚:${saved.id}` }, admin).catch(() => null);
    return saved;
  }

  async revokeContentSanction(id: number, dto: any, admin?: AdminContext) {
    const row = await this.contentUserSanctions.findOneBy({ id });
    if (!row) throw new NotFoundException("处罚记录不存在");
    assertTenantAccessForActor(row, admin, "处罚记录不存在或不属于当前商家");
    row.status = "revoked";
    row.revokedAt = new Date();
    row.revokedByAdminId = admin?.id || null;
    row.revokeRemark = this.optionalText(dto.remark, 500);
    const saved = await this.contentUserSanctions.save(row);
    await this.notifications.sendNotification({ userId: row.userId, channel: "site", title: "社区处罚已解除", content: row.revokeRemark || "账号内容发布权限已恢复", remark: `内容处罚撤销:${row.id}` }, admin).catch(() => null);
    return saved;
  }

  async listContentAppeals(query: any = {}, admin?: AdminContext) {
    const builder = this.contentAppeals.createQueryBuilder("appeal").leftJoinAndSelect("appeal.tenant", "tenant").leftJoinAndSelect("appeal.sanction", "sanction").orderBy("appeal.id", "DESC").take(500);
    applyTenantScopeToQuery(builder, "appeal", admin);
    this.applyPlatformTenantFilter(builder, "appeal", query.tenantId, admin);
    if (query.status) builder.andWhere("appeal.status = :status", { status: query.status });
    return builder.getMany();
  }

  async reviewContentAppeal(id: number, dto: any, admin?: AdminContext) {
    const row = await this.contentAppeals.findOneBy({ id });
    if (!row) throw new NotFoundException("申诉记录不存在");
    assertTenantAccessForActor(row, admin, "申诉记录不存在或不属于当前商家");
    if (row.status !== "pending") throw new BadRequestException("申诉已处理");
    row.status = dto.status === "approved" ? "approved" : "rejected";
    row.pendingKey = null;
    row.handleRemark = this.requiredText(dto.handleRemark, 2, 1000, "请填写处理说明");
    row.handledByAdminId = admin?.id || null;
    row.handledAt = new Date();
    if (row.status === "approved" && row.sanction?.status === "active") await this.revokeContentSanction(row.sanction.id, { remark: `申诉通过：${row.handleRemark}` }, admin);
    const saved = await this.contentAppeals.save(row);
    await this.ensureGovernanceMemberProfile(row.userId, row.tenant || null);
    await this.notifications.sendNotification({ userId: row.userId, channel: "site", title: `内容申诉${row.status === "approved" ? "已通过" : "未通过"}`, content: row.handleRemark, remark: `内容申诉:${row.id}` }, admin).catch(() => null);
    return saved;
  }

  private async markExpiredContentSanctions(now = new Date()) {
    await this.contentUserSanctions.createQueryBuilder()
      .update(ContentUserSanction)
      .set({ status: "expired" })
      .where("status = :status", { status: "active" })
      .andWhere("endsAt IS NOT NULL")
      .andWhere("endsAt <= :now", { now })
      .execute();
  }

  private async ensureGovernanceMemberProfile(userId: number, tenant: Tenant | null) {
    const repository = this.dataSource.getRepository(MemberProfile);
    const tenantScopeKey = tenant ? `tenant:${tenant.id}` : "platform";
    const existing = await repository.findOne({ where: { user: { id: userId }, tenantScopeKey } });
    if (existing) return existing;
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("用户不存在");
    const createdAt = new Date();
    try {
      return await repository.save(repository.create({
        user,
        tenant,
        tenantScopeKey,
        level: null,
        points: 0,
        growthValue: 0,
        growthCycleStartedAt: null,
        levelStartedAt: null,
        levelExpiresAt: null,
        levelSource: "growth",
        totalSpent: "0.00",
        registrationCount: 0,
        checkInCount: 0,
        reviewCount: 0,
        lastActiveAt: createdAt,
        createdAt,
        updatedAt: createdAt
      }));
    } catch (error: any) {
      if (!isDuplicateEntryError(error)) throw error;
      const raced = await repository.findOne({ where: { user: { id: userId }, tenantScopeKey } });
      if (!raced) throw error;
      return raced;
    }
  }

  private scopedCourseQuery(admin?: AdminContext, tenantId?: string | number) {
    const builder = this.courses.createQueryBuilder("course").leftJoinAndSelect("course.tenant", "tenant");
    this.applyStrictCourseTenantScope(builder, "course", admin);
    this.applyPlatformTenantFilter(builder, "course", tenantId, admin);
    return builder;
  }

  private scopedCourseOrderQuery(admin?: AdminContext, tenantId?: string | number) {
    const builder = this.courseOrders
      .createQueryBuilder("courseOrder")
      .leftJoinAndSelect("courseOrder.course", "course")
      .leftJoinAndSelect("course.teacher", "teacher")
      .leftJoinAndSelect("course.tenant", "tenant")
      .leftJoinAndSelect("courseOrder.user", "user");
    this.applyStrictCourseTenantScope(builder, "course", admin);
    this.applyPlatformTenantFilter(builder, "course", tenantId, admin);
    return builder;
  }

  private scopedCourseRefundQuery(admin?: AdminContext, tenantId?: string | number) {
    const builder = this.courseRefunds
      .createQueryBuilder("refund")
      .innerJoin("refund.order", "courseOrder")
      .innerJoin("courseOrder.course", "course")
      .leftJoin("course.tenant", "tenant");
    this.applyStrictCourseTenantScope(builder, "course", admin);
    this.applyPlatformTenantFilter(builder, "course", tenantId, admin);
    return builder;
  }

  private scopedCommunityActivityQuery(admin?: AdminContext, tenantId?: string | number) {
    const builder = this.communityActivities.createQueryBuilder("activity").leftJoinAndSelect("activity.tenant", "tenant");
    applyTenantScopeToQuery(builder, "activity", admin);
    this.applyPlatformTenantFilter(builder, "activity", tenantId, admin);
    return builder;
  }

  private scopedCheckinTaskQuery(admin?: AdminContext, tenantId?: string | number) {
    const builder = this.checkinTasks.createQueryBuilder("task").leftJoinAndSelect("task.tenant", "tenant");
    applyTenantScopeToQuery(builder, "task", admin);
    this.applyPlatformTenantFilter(builder, "task", tenantId, admin);
    return builder;
  }

  private scopedCommunityPostQuery(admin?: AdminContext, tenantId?: string | number) {
    const builder = this.communityPosts.createQueryBuilder("post").leftJoinAndSelect("post.tenant", "tenant").leftJoinAndSelect("post.activity", "activity");
    applyTenantScopeToQuery(builder, "post", admin);
    this.applyPlatformTenantFilter(builder, "post", tenantId, admin);
    return builder;
  }

  private scopedCommunityCommentQuery(admin?: AdminContext, tenantId?: string | number) {
    const builder = this.communityPostComments.createQueryBuilder("comment").innerJoin(CommunityPost, "post", "post.id = comment.postId").leftJoin("post.tenant", "tenant");
    applyTenantScopeToQuery(builder, "post", admin);
    this.applyPlatformTenantFilter(builder, "post", tenantId, admin);
    return builder;
  }

  private scopedCommunityLikeQuery(admin?: AdminContext, tenantId?: string | number) {
    const builder = this.communityPostLikes.createQueryBuilder("likeRow").innerJoin(CommunityPost, "post", "post.id = likeRow.postId").leftJoin("post.tenant", "tenant");
    applyTenantScopeToQuery(builder, "post", admin);
    this.applyPlatformTenantFilter(builder, "post", tenantId, admin);
    return builder;
  }

  private scopedForumCategoryQuery(admin?: AdminContext, tenantId?: string | number) {
    const builder = this.forumCategories.createQueryBuilder("category").leftJoinAndSelect("category.tenant", "tenant");
    applyTenantScopeToQuery(builder, "category", admin);
    this.applyPlatformTenantFilter(builder, "category", tenantId, admin);
    return builder;
  }

  private scopedForumModeratorQuery(admin?: AdminContext, tenantId?: string | number) {
    const builder = this.forumCategoryModerators
      .createQueryBuilder("moderator")
      .leftJoinAndSelect("moderator.tenant", "tenant")
      .leftJoinAndSelect("moderator.category", "category")
      .leftJoinAndSelect("moderator.admin", "assignedAdmin");
    applyTenantScopeToQuery(builder, "moderator", admin);
    this.applyPlatformTenantFilter(builder, "moderator", tenantId, admin);
    return builder;
  }

  private scopedForumTopicQuery(admin?: AdminContext, tenantId?: string | number) {
    const builder = this.forumTopics
      .createQueryBuilder("topic")
      .leftJoinAndSelect("topic.tenant", "tenant")
      .leftJoinAndSelect("topic.category", "category")
      .leftJoinAndSelect("topic.user", "user")
      .leftJoinAndSelect("topic.activity", "activity")
      .leftJoinAndSelect("topic.course", "course")
      .leftJoinAndSelect("topic.charityProject", "charityProject");
    applyTenantScopeToQuery(builder, "topic", admin);
    this.applyPlatformTenantFilter(builder, "topic", tenantId, admin);
    return builder;
  }

  private scopedForumReplyQuery(admin?: AdminContext, tenantId?: string | number) {
    const builder = this.forumReplies
      .createQueryBuilder("reply")
      .leftJoinAndSelect("reply.tenant", "tenant")
      .leftJoinAndSelect("reply.topic", "topic")
      .leftJoinAndSelect("reply.parent", "parent")
      .leftJoinAndSelect("reply.user", "user");
    applyTenantScopeToQuery(builder, "reply", admin);
    this.applyPlatformTenantFilter(builder, "reply", tenantId, admin);
    return builder;
  }

  private scopedForumReportQuery(admin?: AdminContext, tenantId?: string | number) {
    const builder = this.forumReports
      .createQueryBuilder("report")
      .leftJoinAndSelect("report.tenant", "tenant")
      .leftJoinAndSelect("report.topic", "topic")
      .leftJoinAndSelect("report.reply", "reply")
      .leftJoinAndSelect("report.reporter", "reporter")
      .leftJoinAndSelect("report.handler", "handler");
    applyTenantScopeToQuery(builder, "report", admin);
    this.applyPlatformTenantFilter(builder, "report", tenantId, admin);
    return builder;
  }

  private async duplicateCheckinTaskSummary(tenantId?: string | number, admin?: AdminContext) {
    const builder = this.checkinTasks
      .createQueryBuilder("task")
      .leftJoin("task.tenant", "tenant")
      .select("task.date", "date")
      .addSelect("COALESCE(tenant.name, '平台')", "scope")
      .addSelect("task.activityId", "activityId")
      .addSelect("COUNT(task.id)", "count")
      .groupBy("task.tenantId")
      .addGroupBy("task.activityId")
      .addGroupBy("task.date")
      .addGroupBy("tenant.name")
      .having("COUNT(task.id) > 1");
    applyTenantScopeToQuery(builder, "task", admin);
    this.applyPlatformTenantFilter(builder, "task", tenantId, admin);
    const rows = await builder.getRawMany();
    return rows.map((row) => ({ date: row.date, scope: row.scope, activityId: row.activityId === null ? null : Number(row.activityId), count: Number(row.count || 0) }));
  }

  private startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private optionalText(value: unknown, maxLength: number) {
    const text = String(value || "").trim();
    return text ? text.slice(0, maxLength) : null;
  }

  private requiredText(value: unknown, minLength: number, maxLength: number, message: string) {
    const text = String(value || "").trim();
    if (text.length < minLength) throw new BadRequestException(message);
    return text.slice(0, maxLength);
  }

  private normalizeChoice(value: unknown, allowed: string[], fallback: string) {
    const text = String(value || "").trim();
    return allowed.includes(text) ? text : fallback;
  }

  private normalizeStringArray(value: unknown, limit: number) {
    const rows = Array.isArray(value) ? value : String(value || "").split(/[,，、\s]+/);
    return rows.map((item) => String(item || "").trim()).filter(Boolean).slice(0, limit);
  }

  private async assertForumCategoryAccess(id: number, admin?: AdminContext) {
    const category = await this.forumCategories.findOne({ where: { id } });
    if (!category) throw new NotFoundException("论坛版块不存在");
    assertTenantAccessForActor(category, admin, "论坛版块不存在或不属于当前商家");
    return category;
  }

  private async assertForumTopicAccess(id: number, admin?: AdminContext) {
    const topic = await this.forumTopics.findOne({ where: { id } });
    if (!topic) throw new NotFoundException("论坛帖子不存在");
    assertTenantAccessForActor(topic, admin, "论坛帖子不存在或不属于当前商家");
    return topic;
  }

  private async assertForumReplyAccess(id: number, admin?: AdminContext) {
    const reply = await this.forumReplies.findOne({ where: { id } });
    if (!reply) throw new NotFoundException("论坛回复不存在");
    assertTenantAccessForActor(reply, admin, "论坛回复不存在或不属于当前商家");
    return reply;
  }

  private async assertForumReportAccess(id: number, admin?: AdminContext) {
    const report = await this.forumReports.findOne({ where: { id } });
    if (!report) throw new NotFoundException("论坛举报不存在");
    assertTenantAccessForActor(report, admin, "论坛举报不存在或不属于当前商家");
    return report;
  }

  private async resolveForumCategoryForTopic(categoryId: unknown, tenant: Tenant | null, admin?: AdminContext) {
    const category = await this.assertForumCategoryAccess(Number(categoryId || 0), admin);
    if (!category.enabled) throw new BadRequestException("版块已停用");
    if ((category.tenant?.id || null) !== (tenant?.id || null)) throw new BadRequestException("版块与帖子所属商家不一致");
    return category;
  }

  private async ensureDefaultForumCategory(tenant: Tenant | null, admin?: AdminContext) {
    const builder = this.forumCategories.createQueryBuilder("category").leftJoinAndSelect("category.tenant", "tenant").where("category.name = :name", { name: "共修交流" });
    if (tenant) builder.andWhere("category.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.andWhere("category.tenantId IS NULL");
    const existing = await builder.getOne();
    if (existing) return existing;
    if (admin?.tenantId && tenant?.id !== admin.tenantId) throw new BadRequestException("不能创建其它商家的默认版块");
    return this.forumCategories.save(this.forumCategories.create({ tenant, name: "共修交流", description: "活动心得、课程共学和公益共建交流", enabled: true, sortOrder: 0, postPermission: "user", auditMode: "pre" }));
  }

  private async adjustForumTopicReplyCount(topicId: number, oldStatus: ForumReplyStatus, newStatus: ForumReplyStatus, replyCreatedAt?: Date) {
    if (oldStatus === newStatus) return;
    const topic = await this.forumTopics.findOne({ where: { id: topicId } });
    if (!topic) return;
    if (oldStatus !== "approved" && newStatus === "approved") {
      topic.replyCount = Number(topic.replyCount || 0) + 1;
      topic.lastReplyAt = replyCreatedAt || new Date();
    } else if (oldStatus === "approved" && newStatus !== "approved") {
      topic.replyCount = Math.max(0, Number(topic.replyCount || 0) - 1);
    }
    topic.heat = Number(topic.viewCount || 0) + Number(topic.replyCount || 0) * 5 + Number(topic.favoriteCount || 0) * 3;
    await this.forumTopics.save(topic);
  }

  private async assertCourseAccess(id: number, admin?: AdminContext) {
    const course = await this.courses.findOne({ where: { id }, relations: { tenant: true } });
    if (!course) throw new NotFoundException("课程不存在");
    if (admin?.tenantId && course.tenant?.id !== admin.tenantId) throw new NotFoundException("课程不存在或不属于当前商家");
    if (this.isCourseTeacherScoped(admin)) {
      const ownTeacher = await this.linkedCourseTeacher(admin);
      if (!ownTeacher || course.teacher?.id !== ownTeacher.id) throw new NotFoundException("课程不存在或不属于当前讲师");
    }
    return course;
  }

  private async assertChapterAccess(id: number, admin?: AdminContext) {
    const chapter = await this.chapters.findOne({ where: { id } });
    if (!chapter) throw new NotFoundException("章节不存在");
    await this.assertCourseAccess(chapter.courseId, admin);
    return chapter;
  }

  private async assertLessonAccess(id: number, admin?: AdminContext) {
    const lesson = await this.lessons.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException("课时不存在");
    await this.assertChapterAccess(lesson.chapterId, admin);
    return lesson;
  }

  private async assertCommunityActivityAccess(id: number, admin?: AdminContext) {
    const item = await this.communityActivities.findOne({ where: { id } });
    if (!item) throw new NotFoundException("共修活动不存在");
    assertTenantAccessForActor(item, admin, "共修活动不存在或不属于当前商家");
    return item;
  }

  private async assertCheckinTaskAccess(id: number, admin?: AdminContext) {
    const item = await this.checkinTasks.findOne({ where: { id } });
    if (!item) throw new NotFoundException("打卡任务不存在");
    assertTenantAccessForActor(item, admin, "打卡任务不存在或不属于当前商家");
    return item;
  }

  private async assertCommunityPostAccess(id: number, admin?: AdminContext) {
    const item = await this.communityPosts.findOne({ where: { id } });
    if (!item) throw new NotFoundException("学员动态不存在");
    assertTenantAccessForActor(item, admin, "学员动态不存在或不属于当前商家");
    return item;
  }

  async notifyCourseAnnouncement(id:number,admin?:AdminContext){const notice=await this.courseAnnouncements.findOneBy({id});if(!notice||notice.status!=="published"||!notice.notifyLearners||notice.notifiedAt)return{sentCount:0,skipped:true};await this.assertCourseAccess(notice.courseId,admin);const learners=await this.userLearning.find({where:{courseId:notice.courseId,lessonId:0}});let sentCount=0,failedCount=0;for(const learner of learners){try{const row=await this.notifications.sendNotification({userId:learner.userId,channel:"site",title:notice.title,content:notice.content,remark:`课程公告:${notice.id}`},admin);if(row.status==="sent")sentCount++;else failedCount++;}catch{failedCount++;}}notice.notifiedAt=new Date();await this.courseAnnouncements.save(notice);return{sentCount,failedCount};}

  async runCourseLearningReminders(dto:any={},admin?:AdminContext){const idleDays=Math.min(Math.max(Math.trunc(Number(dto.idleDays||7)),1),90);const cutoff=new Date(Date.now()-idleDays*86400000),repeatCutoff=new Date(Date.now()-7*86400000);const builder=this.userLearning.createQueryBuilder("learning").innerJoin(Course,"course","course.id=learning.courseId").leftJoin("course.tenant","tenant").where("learning.lessonId=0").andWhere("learning.progress < 100").andWhere("learning.updatedAt < :cutoff",{cutoff}).andWhere("(learning.lastRemindedAt IS NULL OR learning.lastRemindedAt < :repeatCutoff)",{repeatCutoff}).select(["learning.id AS id","learning.userId AS userId","learning.courseId AS courseId","learning.progress AS progress","course.title AS courseTitle"]).take(500);this.applyStrictCourseTenantScope(builder,"course",admin);const rows=await builder.getRawMany<any>();let sentCount=0,failedCount=0;for(const raw of rows){const learning=await this.userLearning.findOneBy({id:Number(raw.id)});if(!learning)continue;try{const result=await this.notifications.sendNotification({userId:Number(raw.userId),channel:"site",title:`继续学习：${raw.courseTitle}`,content:`你的课程学习进度为 ${Number(raw.progress||0).toFixed(0)}%，回来继续完成课程吧。`,remark:`课程学习提醒:${raw.courseId}`},admin);if(result.status==="sent")sentCount++;else failedCount++;learning.lastRemindedAt=new Date();await this.userLearning.save(learning);}catch{failedCount++;}}return{checkedCount:rows.length,sentCount,failedCount,idleDays};}

  private async assignGovernanceTenant<T extends { tenant?: Tenant | null }>(row: T, dto: any, admin?: AdminContext) {
    const tenantId = admin?.tenantId || Number(dto?.tenantId || 0) || null;
    const tenant = tenantId ? await this.tenants.findOne({ where: { id: tenantId, enabled: true } }) : null;
    if (tenantId && !tenant) throw new NotFoundException("商家不存在或已停用");
    row.tenant = tenantRelationForActor<Tenant>(admin, tenant);
  }

  private async assignTenant<T extends { tenant?: Tenant | null }>(row: T, dto: any, admin: AdminContext | undefined, feature: TenantEntitlementFeature) {
    const tenantId = admin?.tenantId || Number(dto?.tenantId || dto?.tenant?.id || 0) || null;
    const tenant = tenantId ? await this.tenants.findOne({ where: { id: tenantId, enabled: true } }) : null;
    if (tenantId && !tenant) throw new NotFoundException("商家不存在或已停用");
    this.assertTenantFeatureWritable(tenant, feature);
    row.tenant = tenantRelationForActor<Tenant>(admin, tenant);
  }

  private async assertAssessmentAccess(id:number,admin?:AdminContext){ const row=await this.assessments.findOne({where:{id}}); if(!row) throw new NotFoundException("考核不存在"); await this.assertCourseAccess(row.course.id,admin); return row; }

  private assertTenantFeatureWritable(tenant: Tenant | null | undefined, feature: TenantEntitlementFeature) {
    if (!tenant) return;
    const settings = tenant.settings && typeof tenant.settings === "object" && !Array.isArray(tenant.settings) ? tenant.settings : {};
    const access = tenantFeatureAccess(settings, feature);
    if (!access.allowed) throw new ForbiddenException(access.reason || "当前套餐未开通此功能");
    const restriction = tenantSubscriptionWriteRestriction(settings);
    if (restriction) throw new ForbiddenException(restriction.message);
  }

  private applyPlatformTenantFilter(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, tenantId?: string | number, admin?: AdminContext) {
    if (admin?.tenantId || !tenantId) return;
    const id = Number(tenantId);
    if (Number.isFinite(id) && id > 0) builder.andWhere(`${alias}.tenantId = :platformTenantId`, { platformTenantId: id });
  }

  private applyStrictCourseTenantScope(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, admin?: AdminContext) {
    applyTenantScopeToQuery(builder as any, alias, admin);
    if (admin?.tenantId) builder.andWhere(`${alias}.tenantId = :strictCourseTenantId`, { strictCourseTenantId: admin.tenantId });
    if (this.isCourseTeacherScoped(admin)) builder.andWhere(`${alias}.teacherId IN (SELECT scoped_course_teacher.id FROM course_teachers scoped_course_teacher WHERE scoped_course_teacher.adminUserId = :courseTeacherAdminId)`, { courseTeacherAdminId: admin!.id });
  }

  private isCourseTeacherScoped(admin?: AdminContext) {
    return Boolean(admin?.id && !["super_admin", "admin"].includes(String(admin.role || "")) && admin.permissions?.includes("course.teacher_scope"));
  }

  private async linkedCourseTeacher(admin?: AdminContext) {
    if (!admin?.id) return null;
    return this.courseTeachers.findOne({ where: { adminUser: { id: admin.id } }, relations: { tenant: true } });
  }

  private async resolveCourseTeacherAdminUser(value: unknown, teacher: CourseTeacher, admin?: AdminContext) {
    const adminUserId = Number(value || 0);
    if (!adminUserId) return null;
    if (this.isCourseTeacherScoped(admin) && adminUserId !== admin?.id) throw new ForbiddenException("讲师账号不能改绑其他后台账号");
    const candidate = await this.adminUsers.findOne({ where: { id: adminUserId } });
    if (!candidate || !candidate.enabled) throw new BadRequestException("讲师后台账号不存在或已停用");
    if ((candidate.tenant?.id || null) !== (teacher.tenant?.id || null)) throw new BadRequestException("讲师档案和后台账号必须属于同一商家");
    const permissions = effectivePermissionsForAdmin({ role: candidate.role, tenantId: candidate.tenant?.id || null, permissions: candidate.permissions });
    if (!permissions.includes("course.teacher_scope")) throw new BadRequestException("后台账号未授予仅本人讲师课程范围");
    const occupied = await this.courseTeachers.findOne({ where: { adminUser: { id: adminUserId } }, relations: { tenant: true } });
    if (occupied && occupied.id !== teacher.id) throw new BadRequestException(`该后台账号已绑定讲师「${occupied.name}」`);
    return candidate;
  }

  private publicCourseTeacher(teacher: CourseTeacher) {
    return { id: teacher.id, tenant: teacher.tenant ? { id: teacher.tenant.id, code: teacher.tenant.code, name: teacher.tenant.name } : null, adminUser: teacher.adminUser ? { id: teacher.adminUser.id, username: teacher.adminUser.username, role: teacher.adminUser.role, enabled: teacher.adminUser.enabled } : null, name: teacher.name, avatarUrl: teacher.avatarUrl, title: teacher.title, bio: teacher.bio, status: teacher.status, createdAt: teacher.createdAt, updatedAt: teacher.updatedAt };
  }
}
