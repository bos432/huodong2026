import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, ParseIntPipe, Post, Query, Req, Res, UnauthorizedException, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, IsNull, Repository } from "typeorm";
import { createHmac, randomBytes } from "crypto";
import { Course } from "../../entities/course.entity";
import { CourseChapter } from "../../entities/course-chapter.entity";
import { CourseLesson } from "../../entities/course-lesson.entity";
import { CourseResourceAccessLog } from "../../entities/course-resource-access-log.entity";
import { CourseAssessment } from "../../entities/course-assessment.entity";
import { CourseQuestion } from "../../entities/course-question.entity";
import { CourseAssessmentAttempt } from "../../entities/course-assessment-attempt.entity";
import { CourseAssessmentAnswer } from "../../entities/course-assessment-answer.entity";
import { CourseAssessmentGrant } from "../../entities/course-assessment-grant.entity";
import { CourseReview } from "../../entities/course-review.entity";
import { CourseQa } from "../../entities/course-qa.entity";
import { CourseAnnouncement } from "../../entities/course-announcement.entity";
import { CourseCertificateTemplate } from "../../entities/course-certificate-template.entity";
import { Certificate } from "../../entities/certificate.entity";
import { CourseOrder, CourseOrderStatus } from "../../entities/course-order.entity";
import { CourseRefund } from "../../entities/course-refund.entity";
import { assessmentPassed, gradeObjectiveQuestion } from "../../shared/course-assessment-grading";
import { CommunityActivity } from "../../entities/community-activity.entity";
import { CommunityActivityMember } from "../../entities/community-activity-member.entity";
import { CommunityPost, type CommunityPostStatus } from "../../entities/community-post.entity";
import { CommunityPostComment } from "../../entities/community-post-comment.entity";
import { CommunityPostLike } from "../../entities/community-post-like.entity";
import { CommunityPostFavorite } from "../../entities/community-post-favorite.entity";
import { CommunityUserFollow } from "../../entities/community-user-follow.entity";
import { CommunityNotification } from "../../entities/community-notification.entity";
import { CommunityContentReport } from "../../entities/community-content-report.entity";
import { ContentAppeal } from "../../entities/content-appeal.entity";
import { ContentKeywordRule } from "../../entities/content-keyword-rule.entity";
import { ContentUserSanction } from "../../entities/content-user-sanction.entity";
import { CheckInTask } from "../../entities/checkin-task.entity";
import { CommunityCheckIn } from "../../entities/community-checkin.entity";
import { ForumCategory } from "../../entities/forum-category.entity";
import { ForumCategoryModerator } from "../../entities/forum-category-moderator.entity";
import { ForumFavorite } from "../../entities/forum-favorite.entity";
import { ForumNotification } from "../../entities/forum-notification.entity";
import { ForumReply } from "../../entities/forum-reply.entity";
import { ForumReport } from "../../entities/forum-report.entity";
import { ForumTopic } from "../../entities/forum-topic.entity";
import { ForumViewLog } from "../../entities/forum-view-log.entity";
import { Order } from "../../entities/order.entity";
import { Registration } from "../../entities/registration.entity";
import { UserLearning } from "../../entities/user-learning.entity";
import { User } from "../../entities/user.entity";
import { Tenant } from "../../entities/tenant.entity";
import { OrderStatus, RegistrationStatus } from "../../shared/domain";
import { normalizeTenantCode, normalizeTenantHost } from "../../shared/tenant-scope";
import { PublicService } from "../public/public.service";
import { ObjectStorageService } from "../../shared/object-storage.service";
import { courseAvailableToUser, protectedCourseLesson } from "../../shared/course-resource-access";
import { assertCommunityCheckinDate, communityCheckinStreak } from "../../shared/community-learning-policy";
import { forumQuoteSnapshot, forumReplyLockMessage, nextForumFloorNo } from "../../shared/forum-governance";
import { sanctionApplies, screenGovernedContent } from "../../shared/content-governance";
import { validatedUploadFile } from "../../shared/upload-security";
import { privateDocumentExists, readPrivateDocument } from "../../shared/private-document";
import { createPrivateAssetToken, verifyPrivateAssetToken } from "../../shared/private-asset-token";
import { assertUploadMalwareSafe, uploadMalwareScanConfig } from "../../shared/upload-malware-scan";
import { normalizeCredentialTemplate } from "../../shared/credential-template";
import { CredentialTemplateService } from "../credential-templates/credential-template.service";

const COMMUNITY_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const APPROVED_COMMUNITY_POST_STATUS = "approved" as CommunityPostStatus;

@Controller("public")
export class PublicCoursesController {
  constructor(
    @InjectRepository(Tenant) private tenants: Repository<Tenant>,
    @InjectRepository(Course) private courses: Repository<Course>,
    @InjectRepository(CourseChapter) private chapters: Repository<CourseChapter>,
    @InjectRepository(CourseLesson) private lessons: Repository<CourseLesson>,
    @InjectRepository(CommunityActivity) private communityActivities: Repository<CommunityActivity>,
    @InjectRepository(CommunityActivityMember) private communityActivityMembers: Repository<CommunityActivityMember>,
    @InjectRepository(CommunityPost) private communityPosts: Repository<CommunityPost>,
    @InjectRepository(CommunityPostLike) private communityPostLikes: Repository<CommunityPostLike>,
    @InjectRepository(CommunityPostFavorite) private communityPostFavorites: Repository<CommunityPostFavorite>,
    @InjectRepository(CommunityUserFollow) private communityUserFollows: Repository<CommunityUserFollow>,
    @InjectRepository(CommunityNotification) private communityNotifications: Repository<CommunityNotification>,
    @InjectRepository(CommunityContentReport) private communityContentReports: Repository<CommunityContentReport>,
    @InjectRepository(ContentKeywordRule) private contentKeywordRules: Repository<ContentKeywordRule>,
    @InjectRepository(ContentUserSanction) private contentUserSanctions: Repository<ContentUserSanction>,
    @InjectRepository(ContentAppeal) private contentAppeals: Repository<ContentAppeal>,
    @InjectRepository(CommunityPostComment) private communityPostComments: Repository<CommunityPostComment>,
    @InjectRepository(CheckInTask) private checkinTasks: Repository<CheckInTask>,
    @InjectRepository(CommunityCheckIn) private communityCheckins: Repository<CommunityCheckIn>,
    @InjectRepository(ForumCategory) private forumCategories: Repository<ForumCategory>,
    @InjectRepository(ForumCategoryModerator) private forumCategoryModerators: Repository<ForumCategoryModerator>,
    @InjectRepository(ForumTopic) private forumTopics: Repository<ForumTopic>,
    @InjectRepository(ForumReply) private forumReplies: Repository<ForumReply>,
    @InjectRepository(ForumReport) private forumReports: Repository<ForumReport>,
    @InjectRepository(ForumFavorite) private forumFavorites: Repository<ForumFavorite>,
    @InjectRepository(ForumViewLog) private forumViewLogs: Repository<ForumViewLog>,
    @InjectRepository(ForumNotification) private forumNotifications: Repository<ForumNotification>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Registration) private registrations: Repository<Registration>,
    @InjectRepository(UserLearning) private userLearning: Repository<UserLearning>,
    @InjectRepository(CourseResourceAccessLog) private courseResourceAccessLogs: Repository<CourseResourceAccessLog>,
    @InjectRepository(CourseAssessment) private assessments: Repository<CourseAssessment>,
    @InjectRepository(CourseQuestion) private questions: Repository<CourseQuestion>,
    @InjectRepository(CourseAssessmentAttempt) private attempts: Repository<CourseAssessmentAttempt>,
    @InjectRepository(CourseAssessmentAnswer) private assessmentAnswers: Repository<CourseAssessmentAnswer>,
    @InjectRepository(CourseAssessmentGrant) private assessmentGrants: Repository<CourseAssessmentGrant>,
    @InjectRepository(CourseReview) private courseReviews: Repository<CourseReview>,
    @InjectRepository(CourseQa) private courseQa: Repository<CourseQa>,
    @InjectRepository(CourseAnnouncement) private courseAnnouncements: Repository<CourseAnnouncement>,
    @InjectRepository(CourseCertificateTemplate) private courseCertificateTemplates: Repository<CourseCertificateTemplate>,
    @InjectRepository(Certificate) private certificates: Repository<Certificate>,
    @InjectRepository(CourseOrder) private courseOrders: Repository<CourseOrder>,
    @InjectRepository(CourseRefund) private courseRefunds: Repository<CourseRefund>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly publicService: PublicService,
    private readonly objectStorage: ObjectStorageService,
    private readonly credentialTemplates: CredentialTemplateService
  ) {}

  @Get("courses")
  async listCourses(@Query() q: { category?: string; sort?: string; tenantCode?: string }, @Req() req: any) {
    const tenant = await this.resolveTenant(req, q.tenantCode);
    const builder = this.courses.createQueryBuilder("course").where("course.status = :status", { status: "published" });
    if (tenant) builder.andWhere("course.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.andWhere("course.tenantId IS NULL");
    const category = String(q.category || "").trim().slice(0, 50);
    if (category && category !== "all") builder.andWhere("JSON_CONTAINS(course.tags, :category) = 1", { category: JSON.stringify(category) });
    if (q.sort === "hottest") builder.orderBy("course.hotCount", "DESC").addOrderBy("course.createdAt", "DESC");
    else if (q.sort === "price") builder.orderBy("course.price", "ASC").addOrderBy("course.createdAt", "DESC");
    else builder.orderBy("course.sortOrder", "ASC").addOrderBy("course.createdAt", "DESC");
    return (await builder.take(200).getMany()).map((course) => this.publicCourseListView(course));
  }

  @Get("courses/:id")
  async getCourse(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const tenant = await this.resolveTenant(req, tenantCode);
    const course = await this.courses.findOne({ where: this.tenantWhere({ id, status: "published" }, tenant) });
    if (!course) return null;
    const chapters = await this.chapters.find({ where: { courseId: id }, order: { sortOrder: "ASC" } });
    const chapterIds = chapters.map(c => c.id);
    const lessons = chapterIds.length ? await this.lessons.find({ where: chapterIds.map(id => ({ chapterId: id, status: "published" })), order: { sortOrder: "ASC" } }) : [];
    const userId = this.optionalUserId(req.headers?.authorization);
    const owned = userId ? await this.hasCourseAccess(userId, id) : false;
    const canAccess = owned || Number(course.price || 0) <= 0;
    return { ...course, owned, chapters: chapters.map(ch => ({ ...ch, lessons: lessons.filter(l => l.chapterId === ch.id).map((lesson) => this.publicLessonView(lesson, canAccess || lesson.isFree, userId || null)) })) };
  }

  @Get("courses/:id/player")
  async getCoursePlayer(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const course = await this.courses.findOne({ where: this.tenantWhere({ id }, tenant) });
    if (!course) return null;
    const owned = await this.hasCourseAccess(userId, id);
    if (!courseAvailableToUser(course.status, owned)) return null;
    const chapters = await this.chapters.find({ where: { courseId: id }, order: { sortOrder: "ASC" } });
    const chapterIds = chapters.map((chapter) => chapter.id);
    const lessons = chapterIds.length ? await this.lessons.find({ where: chapterIds.map((chapterId) => ({ chapterId, status: "published" })), order: { sortOrder: "ASC" } }) : [];
    const canPlayCourse = owned || Number(course.price || 0) <= 0;
    const playableLessons = lessons.filter((lesson) => canPlayCourse || lesson.isFree);
    if (!playableLessons.length && !owned) throw new BadRequestException("请先购买课程，后台确认收款后再学习");
    const learningRows = lessons.length ? await this.userLearning.find({ where: { userId, courseId: id, lessonId: In(lessons.map((lesson) => lesson.id)) } }) : [];
    const recentLessonId = learningRows.reduce((latest, row) => !latest || row.updatedAt.getTime() > latest.updatedAt.getTime() ? row : latest, null as UserLearning | null)?.lessonId || null;
    const deliveredLessons = lessons.filter((lesson) => (canPlayCourse || lesson.isFree) && this.lessonHasResource(lesson));
    if (deliveredLessons.length) await this.courseResourceAccessLogs.insert(deliveredLessons.map((lesson) => ({ userId, courseId: id, lessonId: lesson.id, resourceType: lesson.contentType, clientIp: this.clientIp(req), userAgent: String(req.headers?.["user-agent"] || "").slice(0, 255) || null })));
    return {
      ...course,
      owned,
      recentLessonId,
      chapters: chapters.map((chapter) => ({
        ...chapter,
        lessons: lessons
          .filter((lesson) => lesson.chapterId === chapter.id)
          .map((lesson) => ({
            ...this.publicLessonView(lesson, canPlayCourse || lesson.isFree, userId),
            progress: Number(learningRows.find((row) => row.lessonId === lesson.id)?.progress || 0),
            learningUpdatedAt: learningRows.find((row) => row.lessonId === lesson.id)?.updatedAt || null,
            locked: !(canPlayCourse || lesson.isFree)
          }))
      }))
    };
  }

  @Post("courses/:id/progress")
  async updateCourseProgress(@Param("id", ParseIntPipe) id: number, @Body() dto: { lessonId?: number; progress?: number }, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const course = await this.courses.findOne({ where: this.tenantWhere({ id }, tenant) });
    if (!course) throw new BadRequestException("课程不存在");
    const owned = await this.hasCourseAccess(userId, id);
    if (!courseAvailableToUser(course.status, owned)) throw new BadRequestException("课程不存在或未发布");
    const lessonId = Number(dto.lessonId || 0);
    const requestedProgress = Number(dto.progress ?? 0);
    if (!Number.isFinite(requestedProgress)) throw new BadRequestException("学习进度必须是 0 到 100 的数字");
    const progress = Math.max(0, Math.min(requestedProgress, 100));
    if (lessonId > 0) {
      const lesson = await this.lessons
        .createQueryBuilder("lesson")
        .innerJoin(CourseChapter, "chapter", "chapter.id = lesson.chapterId")
        .where("lesson.id = :lessonId", { lessonId })
        .andWhere("chapter.courseId = :courseId", { courseId: id })
        .getOne();
      if (!lesson) throw new BadRequestException("课时不存在");
    }
    if (!owned && Number(course.price || 0) > 0) throw new BadRequestException("请先购买课程，后台确认收款后再学习");
    const lessonRow = lessonId > 0 ? await this.saveLearning(userId, id, lessonId, progress) : null;
    const lessons = await this.lessons
      .createQueryBuilder("lesson")
      .innerJoin(CourseChapter, "chapter", "chapter.id = lesson.chapterId")
      .where("chapter.courseId = :courseId", { courseId: id })
      .getMany();
    const lessonRows = lessons.length ? await this.userLearning.find({ where: { userId, courseId: id, lessonId: In(lessons.map((lesson) => lesson.id)) } }) : [];
    const totalProgress = lessons.length
      ? lessonRows.reduce((sum, row) => sum + Number(row.progress || 0), 0) / lessons.length
      : progress;
    const courseRow = await this.saveLearning(userId, id, 0, totalProgress, Number(course.completionThreshold || 100));
    const certificate = courseRow.completedAt ? await this.issueCourseCertificate(userId, course) : null;
    return { courseLearning: this.publicLearning(courseRow), lessonLearning: this.publicLearning(lessonRow), certificate: this.publicIssuedCertificate(certificate) };
  }

  @Get("community/activities")
  async listActivities(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const tenant = await this.resolveTenant(req, tenantCode);
    const items = await this.communityActivities.find({ where: this.tenantWhere({ status: "published" }, tenant), order: { startTime: "ASC" }, take: 10 });
    return items.map((item) => this.publicCommunityActivity(item));
  }

  @Get("community/posts")
  async listPosts(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("activityId") activityId?: string) {
    const userId = this.optionalUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const where: any = this.tenantWhere({ visible: true, status: "approved",deletedAt:IsNull() }, tenant);
    if (activityId) where.activityId = Number(activityId);
    const items = await this.communityPosts.find({ where, order: { createdAt: "DESC" }, take: 20 });
    const ids = items.map((item) => item.id);
    const [likedRows,favoriteRows,followRows]=userId&&ids.length?await Promise.all([this.communityPostLikes.find({where:{userId,postId:In(ids)}}),this.communityPostFavorites.find({where:{userId,postId:In(ids)}}),this.communityUserFollows.find({where:{followerUserId:userId,followedUserId:In(Array.from(new Set(items.map(item=>item.userId).filter(id=>id&&id!==userId))))}})]):[[],[],[]];
    return items.map((item) => this.postView(item, {
      liked: likedRows.some((row) => row.postId === item.id),favorited:favoriteRows.some(row=>row.postId===item.id),following:followRows.some(row=>row.followedUserId===item.userId)
    }));
  }

  @Get("me/community/postable-activities")
  async listPostableActivities(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    return this.postableActivities(userId, tenant);
  }

  @Get("me/community/posts")
  async listMyPosts(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const builder = this.communityPosts
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.activity", "activity")
      .leftJoinAndSelect("post.tenant", "tenant")
      .where("post.userId = :userId", { userId })
      .andWhere("post.deletedAt IS NULL")
      .orderBy("post.createdAt", "DESC")
      .take(50);
    this.applyTenantOrGlobalScope(builder, tenant);
    const rows = await builder.getMany();
    return rows.map((item) => this.postView(item, { liked: false }));
  }

  @Get("course-resources/:token")
  async readCourseResource(@Param("token") token: string, @Req() req: any, @Res() res: any) {
    const payload = verifyPrivateAssetToken(token, this.privateAssetSecret());
    if (!payload || payload.purpose !== "course_resource" || !payload.expiresAt || payload.expiresAt < Date.now() || !privateDocumentExists(payload.reference)) throw new NotFoundException("课程资源不存在或访问链接已失效");
    const buffer = readPrivateDocument(payload.reference);
    const total = buffer.length;
    const range = String(req.headers?.range || "").match(/^bytes=(\d*)-(\d*)$/);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("Content-Type", payload.mimetype);
    res.setHeader("Content-Disposition", `${/^(video|audio)\//.test(payload.mimetype) ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(payload.originalName)}`);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const requestedEnd = range[2] ? Number(range[2]) : total - 1;
      const end = Math.min(requestedEnd, total - 1);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= total) {
        res.status(416).setHeader("Content-Range", `bytes */${total}`);
        return res.end();
      }
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
      res.setHeader("Content-Length", String(end - start + 1));
      return res.end(buffer.subarray(start, end + 1));
    }
    res.setHeader("Content-Length", String(total));
    return res.end(buffer);
  }

  @Delete("me/community/posts/:id")
  async deleteMyCommunityPost(@Param("id", ParseIntPipe) id: number, @Req() req: any) {
    const userId = this.requireUserId(req.headers?.authorization);
    const post = await this.communityPosts.findOneBy({ id, userId, deletedAt: IsNull() });
    if (!post) throw new NotFoundException("动态不存在或已删除");
    post.deletedAt = new Date();
    post.visible = false;
    await this.communityPosts.save(post);
    return { success: true };
  }

  @Post("me/community/post-images")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, COMMUNITY_IMAGE_MIMES.has(String(file.mimetype || "").toLowerCase()));
    }
  }))
  async uploadCommunityPostImage(@UploadedFile() file: Express.Multer.File, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    if (!file) throw new BadRequestException("请上传 JPG、PNG 或 WebP 图片");
    const validated = validatedUploadFile(file, COMMUNITY_IMAGE_MIMES);
    if (!validated) throw new BadRequestException("动态图片内容与格式不匹配，仅支持 JPG、PNG 或 WebP 图片");
    await assertUploadMalwareSafe(validated.buffer, uploadMalwareScanConfig(this.config));
    const tenant = await this.resolveTenant(req, tenantCode);
    const stored = await this.objectStorage.store(validated, `community-posts-t${tenant?.id || "platform"}-u${userId}`);
    return { url: stored.url, size: validated.size, mimetype: validated.mimetype };
  }

  @Get("courses/:id/assessments")
  async listCourseAssessments(@Param("id",ParseIntPipe) id:number,@Req() req:any,@Query("tenantCode") tenantCode?:string){ const userId=this.requireUserId(req.headers?.authorization); const tenant=await this.resolveTenant(req,tenantCode); const course=await this.courses.findOne({where:this.tenantWhere({id},tenant)}); if(!course) throw new NotFoundException("课程不存在"); if(!(await this.hasCourseAccess(userId,id))) throw new BadRequestException("请先获得课程学习权限"); const rows=await this.assessments.find({where:{course:{id},status:"published"},order:{sortOrder:"ASC",id:"ASC"}}); const attempts=rows.length?await this.attempts.find({where:{userId,assessmentId:In(rows.map(row=>row.id))},order:{attemptNo:"DESC"}}):[]; return rows.map(row=>({...this.publicCourseAssessment(row),attempts:attempts.filter(item=>item.assessmentId===row.id).map(item=>this.publicCourseAssessmentAttempt(item))})); }

  @Post("course-assessments/:id/start")
  async startAssessment(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    return this.dataSource.transaction(async manager => {
      const assessment = await manager.getRepository(CourseAssessment).findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!assessment || assessment.status !== "published" || !this.assessmentBelongsToTenant(assessment, tenant)) throw new NotFoundException("考核不存在或未发布");
      if (!(await manager.getRepository(UserLearning).count({ where: { userId, courseId: assessment.course.id, lessonId: 0 } }))) throw new ForbiddenException("请先获得课程学习权限");
      const existing = await manager.getRepository(CourseAssessmentAttempt).findOne({ where: [{ userId, assessmentId: id, status: "in_progress" }, { userId, assessmentId: id, status: "returned" }], order: { attemptNo: "DESC" }, lock: { mode: "pessimistic_write" } });
      let attempt = existing;
      if (!attempt) {
        const count = await manager.getRepository(CourseAssessmentAttempt).count({ where: { userId, assessmentId: id } });
        const grant = await manager.getRepository(CourseAssessmentGrant).findOne({ where: { assessmentId: id, userId }, lock: { mode: "pessimistic_write" } });
        if (count >= assessment.maxAttempts + Number(grant?.additionalAttempts || 0)) throw new BadRequestException("已达到最大作答次数");
        attempt = await manager.getRepository(CourseAssessmentAttempt).save(manager.getRepository(CourseAssessmentAttempt).create({ userId, courseId: assessment.course.id, assessmentId: id, attemptNo: count + 1, status: "in_progress", objectiveScore: "0", manualScore: "0", totalScore: "0", submittedAt: null, reviewedAt: null, reviewedByAdminId: null, reviewRemark: null, lateSubmission: false }));
      } else if (attempt.status === "returned") { attempt.status = "in_progress"; attempt = await manager.getRepository(CourseAssessmentAttempt).save(attempt); }
      const questions = await manager.getRepository(CourseQuestion).find({ where: { assessmentId: id }, order: { sortOrder: "ASC", id: "ASC" } });
      return { assessment: this.publicCourseAssessment(assessment), attempt: this.publicCourseAssessmentAttempt(attempt), questions: questions.map((question) => this.publicCourseQuestion(question, false)) };
    });
  }

  @Post("course-assessment-attempts/:id/submit")
  async submitAssessment(@Param("id", ParseIntPipe) id: number, @Body() dto: { answers?: Array<{ questionId: number; answer?: string[]; essayAnswer?: string }> }, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    return this.dataSource.transaction(async manager => {
      const attempt = await manager.getRepository(CourseAssessmentAttempt).findOne({ where: { id, userId }, lock: { mode: "pessimistic_write" } });
      if (!attempt) throw new BadRequestException("当前提交不可作答");
      const assessment = await manager.getRepository(CourseAssessment).findOneBy({ id: attempt.assessmentId });
      if (!assessment || attempt.courseId !== assessment.course.id || !this.assessmentBelongsToTenant(assessment, tenant)) throw new NotFoundException("考核不存在或未发布");
      const hasAccess = await manager.getRepository(UserLearning).count({ where: { userId, courseId: attempt.courseId, lessonId: 0 } });
      if (!hasAccess) throw new ForbiddenException("课程学习权限已失效，不能继续提交考核");
      if (attempt.status !== "in_progress") {
        if (["pending_review", "passed", "failed"].includes(attempt.status)) {
          const answers = await manager.getRepository(CourseAssessmentAnswer).find({ where: { attemptId: id } });
          return { attempt: this.publicCourseAssessmentAttempt(attempt), answers: answers.map((answer) => this.publicCourseAssessmentAnswer(answer)), idempotent: true };
        }
        throw new BadRequestException("当前提交不可作答");
      }
      const late = Boolean(assessment.dueAt && assessment.dueAt.getTime() < Date.now());
      const grant = late ? await manager.getRepository(CourseAssessmentGrant).findOne({ where: { assessmentId: assessment.id, userId }, lock: { mode: "pessimistic_write" } }) : null;
      if (late && !assessment.allowLateSubmission && !(grant?.lateUntil && grant.lateUntil.getTime() >= Date.now())) throw new BadRequestException("考核已截止，不能提交");
      const questions = await manager.getRepository(CourseQuestion).find({ where: { assessmentId: assessment.id } });
      const inputMap = new Map((dto.answers || []).map(item => [Number(item.questionId), item])); let objective = 0; let hasEssay = false; const savedAnswers = [];
      for (const question of questions) {
        const input = inputMap.get(question.id); const grade = gradeObjectiveQuestion({ type: question.type, correctAnswer: question.correctAnswer, score: Number(question.score) }, input?.answer);
        if (grade.manual) hasEssay = true; else objective += grade.score;
        let answer = await manager.getRepository(CourseAssessmentAnswer).findOne({ where: { attemptId: id, questionId: question.id }, lock: { mode: "pessimistic_write" } });
        if (!answer) answer = manager.getRepository(CourseAssessmentAnswer).create({ attemptId: id, questionId: question.id });
        Object.assign(answer, { answer: input?.answer || null, essayAnswer: String(input?.essayAnswer || "").trim().slice(0, 20000) || null, correct: grade.correct, score: grade.score.toFixed(2), feedback: null });
        savedAnswers.push(await manager.getRepository(CourseAssessmentAnswer).save(answer));
      }
      attempt.objectiveScore = objective.toFixed(2); attempt.manualScore = "0"; attempt.totalScore = objective.toFixed(2); attempt.submittedAt = new Date(); attempt.lateSubmission = late;
      const maximum = questions.reduce((sum, question) => sum + Number(question.score || 0), 0); attempt.status = hasEssay ? "pending_review" : assessmentPassed(objective, maximum, assessment.passScore) ? "passed" : "failed";
      await manager.getRepository(CourseAssessmentAttempt).save(attempt); return { attempt: this.publicCourseAssessmentAttempt(attempt), answers: savedAnswers.map((answer) => this.publicCourseAssessmentAnswer(answer)) };
    });
  }

  @Get("course-assessment-attempts/:id")
  async assessmentAttemptResult(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const attempt = await this.attempts.findOneBy({ id, userId });
    if (!attempt) throw new NotFoundException("提交记录不存在");
    const assessment = await this.assessments.findOneBy({ id: attempt.assessmentId });
    if (!assessment || attempt.courseId !== assessment.course.id || !this.assessmentBelongsToTenant(assessment, tenant)) throw new NotFoundException("提交记录不存在");
    if (!(await this.hasCourseAccess(userId, assessment.course.id))) throw new BadRequestException("课程学习权限已失效");
    const questions = await this.questions.find({ where: { assessmentId: assessment.id }, order: { sortOrder: "ASC", id: "ASC" } });
    const answers = await this.assessmentAnswers.find({ where: { attemptId: attempt.id } });
    const reviewed = ["passed", "failed", "returned"].includes(attempt.status);
    return {
      attempt: this.publicCourseAssessmentAttempt(attempt),
      assessment: { id: assessment.id, title: assessment.title, type: assessment.type, passScore: assessment.passScore },
      questions: questions.map(question => ({
        id: question.id,
        type: question.type,
        stem: question.stem,
        options: question.options,
        score: question.score,
        correctAnswer: reviewed ? question.correctAnswer : undefined,
        explanation: reviewed ? question.explanation : undefined,
        answer: this.publicCourseAssessmentAnswer(answers.find(answer => answer.questionId === question.id) || null)
      }))
    };
  }

  @Get("courses/:id/reviews")
  async courseReviewsList(@Param("id",ParseIntPipe) id:number,@Req() req:any,@Query("tenantCode") tenantCode?:string){const tenant=await this.resolveTenant(req,tenantCode);const course=await this.courses.findOne({where:this.tenantWhere({id,status:"published"},tenant)});if(!course)throw new NotFoundException("课程不存在");const rows=await this.courseReviews.find({where:{courseId:id,status:"approved"},order:{createdAt:"DESC"},take:100});return rows.map(row=>({id:row.id,authorName:`学员 ${String(row.id).padStart(4,"0").slice(-4)}`,rating:row.rating,content:row.content,images:row.images||[],reply:row.reply,repliedAt:row.repliedAt,createdAt:row.createdAt}));}

  @Post("courses/:id/reviews")
  async submitCourseReview(@Param("id",ParseIntPipe) id:number,@Body() dto:any,@Req() req:any,@Query("tenantCode") tenantCode?:string){const userId=this.requireUserId(req.headers?.authorization);const tenant=await this.resolveTenant(req,tenantCode);const course=await this.courses.findOne({where:this.tenantWhere({id},tenant)});if(!course||!(await this.hasCourseAccess(userId,id)))throw new BadRequestException("完成课程领取或购买后才能评价");const rating=Math.min(Math.max(Math.trunc(Number(dto.rating||0)),1),5);const content=String(dto.content||"").trim().slice(0,5000);if(content.length<5)throw new BadRequestException("评价内容至少 5 个字");let row=await this.courseReviews.findOneBy({userId,courseId:id});if(!row)row=this.courseReviews.create({userId,courseId:id,course,tenant:course.tenant,rating,content,images:null,status:"pending",reply:null,repliedAt:null,repliedByAdminId:null,moderationReason:null});row.rating=rating;row.content=content;row.images=Array.isArray(dto.images)?dto.images.map(String).slice(0,9):null;row.status="pending";row.moderationReason=null;return this.publicCourseReview(await this.courseReviews.save(row));}

  @Get("courses/:id/qa")
  async courseQaList(@Param("id",ParseIntPipe) id:number,@Req() req:any,@Query("tenantCode") tenantCode?:string){const userId=this.requireUserId(req.headers?.authorization);const tenant=await this.resolveTenant(req,tenantCode);const course=await this.courses.findOne({where:this.tenantWhere({id},tenant)});if(!course||!(await this.hasCourseAccess(userId,id)))throw new BadRequestException("请先获得课程学习权限");return (await this.courseQa.find({where:[{courseId:id,userId},{courseId:id,featured:true,status:"answered"}],order:{createdAt:"DESC"},take:100})).map((row)=>this.publicCourseQa(row));}

  @Post("courses/:id/qa")
  async submitCourseQa(@Param("id",ParseIntPipe) id:number,@Body() dto:any,@Req() req:any,@Query("tenantCode") tenantCode?:string){const userId=this.requireUserId(req.headers?.authorization);const tenant=await this.resolveTenant(req,tenantCode);const course=await this.courses.findOne({where:this.tenantWhere({id},tenant)});if(!course||!(await this.hasCourseAccess(userId,id)))throw new BadRequestException("请先获得课程学习权限");const title=String(dto.title||"").trim().slice(0,200),content=String(dto.content||"").trim().slice(0,10000);if(!title||content.length<5)throw new BadRequestException("请填写问题标题和至少 5 个字的问题描述");return this.publicCourseQa(await this.courseQa.save(this.courseQa.create({userId,courseId:id,lessonId:Number(dto.lessonId)||null,course,tenant:course.tenant,title,content,status:"open",answer:null,answeredAt:null,answeredByAdminId:null,featured:false})));}

  @Get("courses/:id/announcements")
  async learnerCourseAnnouncements(@Param("id",ParseIntPipe) id:number,@Req() req:any,@Query("tenantCode") tenantCode?:string){const userId=this.requireUserId(req.headers?.authorization);const tenant=await this.resolveTenant(req,tenantCode);const course=await this.courses.findOne({where:this.tenantWhere({id},tenant)});if(!course)throw new NotFoundException("课程不存在");if(!(await this.hasCourseAccess(userId,id)))throw new BadRequestException("请先获得课程学习权限");const now=new Date();const rows=await this.courseAnnouncements.find({where:{courseId:id,status:"published"},order:{publishAt:"DESC",createdAt:"DESC"}});return rows.filter(row=>(!row.publishAt||row.publishAt<=now)&&(!row.expiresAt||row.expiresAt>now)).map((row)=>this.publicCourseAnnouncement(row));}

  @Post("course-orders/:id/refunds")
  async requestCourseRefund(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const order = await this.courseOrders.findOne({ where: { id, user: { id: userId } } });
    if (!order || !this.courseBelongsToTenant(order.course, tenant)) throw new NotFoundException("课程订单不存在");
    return this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(CourseOrder);
      const refundRepo = manager.getRepository(CourseRefund);
      const lockedOrder = await orderRepo.findOne({ where: { id: order.id }, loadEagerRelations: false, lock: { mode: "pessimistic_write" } });
      if (!lockedOrder) throw new NotFoundException("课程订单不存在");
      if (![CourseOrderStatus.Paid, CourseOrderStatus.PartiallyRefunded].includes(lockedOrder.status)) throw new BadRequestException("当前订单不可申请退款");
      const rows = await refundRepo.createQueryBuilder("refund").where("refund.orderId = :orderId", { orderId: lockedOrder.id }).orderBy("refund.createdAt", "DESC").getMany();
      const active = rows.find((row) => ["pending", "approved", "processing", "failed"].includes(row.status));
      const completedFen = rows.filter((row) => row.status === "completed").reduce((sum, row) => sum + Number(row.amountFen || 0), 0);
      const refundableAmountFen = Math.max(Number(lockedOrder.amountFen || 0) - completedFen, 0);
      if (active) return { ...this.publicCourseRefund(active), idempotent: true, refundableAmountFen };
      const amountFen = dto.amountFen === undefined ? refundableAmountFen : Math.trunc(Number(dto.amountFen));
      if (amountFen <= 0 || amountFen > refundableAmountFen) throw new BadRequestException("退款金额超过可退金额");
      const reason = String(dto.reason || "").trim().slice(0, 500);
      if (reason.length < 2) throw new BadRequestException("请填写退款原因");
      const saved = await refundRepo.save(refundRepo.create({ refundNo: `CRF${Date.now()}${lockedOrder.id}`, order, amountFen, reason, status: "pending", reviewRemark: null, reviewedByAdminId: null, reviewedAt: null, completedAt: null, providerRefundNo: null, failureReason: null }));
      return { ...this.publicCourseRefund(saved), idempotent: false, refundableAmountFen };
    });
  }

  @Post("community/posts")
  async createParticipantPost(@Body() dto: { activityId?: number; content?: string; images?: string[]; city?: string; tags?: string[]; posterConfig?: Record<string, unknown> }, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    await this.assertContentWriteAllowed(userId, tenant, "community");
    const activityId = Number(dto.activityId || 0);
    if (!activityId) throw new BadRequestException("请选择参加过的活动");
    const activities = await this.postableActivities(userId, tenant);
    const activity = activities.find((item: any) => Number(item.id) === activityId);
    if (!activity) throw new BadRequestException("只有参加过的活动才能发布心得");
    const screened = await this.screenContent(String(dto.content || "").trim(), tenant, "community");
    const content = screened.text;
    if (content.length < 10) throw new BadRequestException("心得内容至少 10 个字");
    if (content.length > 2000) throw new BadRequestException("心得内容不能超过 2000 个字");
    const images = this.normalizeImageUrls(dto.images);
    if (!images.length) throw new BadRequestException("请至少上传 1 张活动照片");
    const post = await this.communityPosts.save(this.communityPosts.create({
      userId,
      activityId,
      content,
      images,
      city: this.optionalText(dto.city, 120),
      tags: this.normalizeTags(dto.tags),
      source: "participant",
      status: "pending",
      visible: true,
      posterConfig: this.safePosterConfig(dto.posterConfig),
      tenant
    }));
    (post as any).activity = activity;
    return { post: this.postView(post, { liked: false }), message: "心得已提交审核，通过后会展示在共修动态中" };
  }

  @Post("community/posts/:id/share")
  async recordPostShare(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const tenant = await this.resolveTenant(req, tenantCode);
    const post = await this.findVisibleApprovedPost(id, tenant);
    if (!post) throw new NotFoundException("动态不存在或已下架");
    post.shareCount = Number(post.shareCount || 0) + 1;
    await this.communityPosts.save(post);
    return { shareCount: post.shareCount };
  }

  private postView(item: CommunityPost, extra: { liked: boolean; favorited?:boolean; following?:boolean }) {
    return {
      id: item.id,
      userId: item.userId,
      content: item.content,
      images: item.images || [],
      likes: item.likes,
      comments: item.comments,
      shareCount: item.shareCount,
      favoriteCount: item.favoriteCount,
      source: item.source,
      status: item.status,
      city: item.city,
      tags: item.tags || [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      liked: extra.liked,
      favorited:Boolean(extra.favorited),
      following:Boolean(extra.following),
      activity: item.activity ? {
        id: item.activity.id,
        title: item.activity.title,
        coverUrl: item.activity.coverUrl,
        startTime: item.activity.startTime,
        endTime: item.activity.endTime,
        location: item.activity.location
      } : null
    };
  }

  @Get("community/posts/:id")
  async getPost(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.optionalUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const post = await this.findVisibleApprovedPost(id, tenant);
    if (!post) return null;
    const [liked,favorited,following]=userId?await Promise.all([this.communityPostLikes.findOneBy({postId:id,userId}),this.communityPostFavorites.findOneBy({postId:id,userId}),post.userId&&post.userId!==userId?this.communityUserFollows.findOneBy({followerUserId:userId,followedUserId:post.userId}):null]):[null,null,null];
    return this.postView(post, { liked: Boolean(liked),favorited:Boolean(favorited),following:Boolean(following) });
  }

  @Post("community/posts/:id/like")
  async togglePostLike(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const post = await this.findVisibleApprovedPost(id, tenant);
    if (!post) throw new BadRequestException("动态不存在或已下架");
    return this.dataSource.transaction(async manager=>{const postRepo=manager.getRepository(CommunityPost),likeRepo=manager.getRepository(CommunityPostLike);const locked=await postRepo.findOne({where:{id},lock:{mode:"pessimistic_write"}});if(!locked||locked.deletedAt)throw new BadRequestException("动态不存在或已下架");const row=await likeRepo.findOne({where:{postId:id,userId},lock:{mode:"pessimistic_write"}});let liked=false;if(row)await likeRepo.delete(row.id);else{try{await likeRepo.save(likeRepo.create({postId:id,userId}));liked=true;}catch(error:any){if(!this.isDuplicateKeyError(error))throw error;liked=true;}}locked.likes=await likeRepo.count({where:{postId:id}});await postRepo.save(locked);if(liked&&locked.userId!==userId){const notificationRepo=manager.getRepository(CommunityNotification);const existing=await notificationRepo.findOneBy({userId:locked.userId,type:"like",postId:id,actorUserId:userId});if(!existing)await notificationRepo.save(notificationRepo.create({userId:locked.userId,type:"like",postId:id,commentId:null,actorUserId:userId,title:"你的动态收到点赞",content:locked.content.slice(0,120),readAt:null}));}return{liked,likes:locked.likes};});
  }

  @Post("community/posts/:id/favorite")
  async togglePostFavorite(@Param("id",ParseIntPipe) id:number,@Req() req:any,@Query("tenantCode") tenantCode?:string){const userId=this.requireUserId(req.headers?.authorization);const tenant=await this.resolveTenant(req,tenantCode);if(!(await this.findVisibleApprovedPost(id,tenant)))throw new NotFoundException("动态不存在或已下架");return this.dataSource.transaction(async manager=>{const postRepo=manager.getRepository(CommunityPost),repo=manager.getRepository(CommunityPostFavorite);const post=await postRepo.findOne({where:{id},lock:{mode:"pessimistic_write"}});if(!post)throw new NotFoundException("动态不存在");const row=await repo.findOne({where:{postId:id,userId},lock:{mode:"pessimistic_write"}});let favorited=false;if(row)await repo.delete(row.id);else{try{await repo.save(repo.create({postId:id,userId}));favorited=true;}catch(error:any){if(!this.isDuplicateKeyError(error))throw error;favorited=true;}}post.favoriteCount=await repo.count({where:{postId:id}});await postRepo.save(post);return{favorited,favoriteCount:post.favoriteCount};});}

  @Post("community/posts/:id/report")
  async reportCommunityPost(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const reporterId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const post = await this.findVisibleApprovedPost(id, tenant);
    if (!post) throw new NotFoundException("动态不存在或已下架");
    if (post.userId === reporterId) throw new BadRequestException("不能举报自己的动态");
    const existing = await this.communityContentReports.findOneBy({ reporterId, targetType: "post", targetId: id, status: "pending" });
    if (existing) throw new BadRequestException("该动态已在处理你的举报");
    const createdAt = new Date();
    return this.publicCommunityReport(await this.communityContentReports.save(this.communityContentReports.create({ tenant: post.tenant || null, reporterId, targetType: "post", targetId: id, targetUserId: post.userId, type: this.requiredText(dto.type || "other", 1, 40, "请选择举报类型"), description: this.optionalText(dto.description, 1000), status: "pending", action: null, handleRemark: null, handledByAdminId: null, handledAt: null, createdAt, updatedAt: createdAt })));
  }

  @Post("community/comments/:id/report")
  async reportCommunityComment(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const reporterId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const comment = await this.communityPostComments.findOneBy({ id, status: "approved", deletedAt: IsNull() });
    const post = comment ? await this.findVisibleApprovedPost(comment.postId, tenant) : null;
    if (!comment || !post) throw new NotFoundException("评论不存在或已下架");
    if (comment.userId === reporterId) throw new BadRequestException("不能举报自己的评论");
    const existing = await this.communityContentReports.findOneBy({ reporterId, targetType: "comment", targetId: id, status: "pending" });
    if (existing) throw new BadRequestException("该评论已在处理你的举报");
    const createdAt = new Date();
    return this.publicCommunityReport(await this.communityContentReports.save(this.communityContentReports.create({ tenant: post.tenant || null, reporterId, targetType: "comment", targetId: id, targetUserId: comment.userId, type: this.requiredText(dto.type || "other", 1, 40, "请选择举报类型"), description: this.optionalText(dto.description, 1000), status: "pending", action: null, handleRemark: null, handledByAdminId: null, handledAt: null, createdAt, updatedAt: createdAt })));
  }

  @Post("community/users/:id/follow")
  async toggleCommunityFollow(@Param("id",ParseIntPipe) followedUserId:number,@Req() req:any,@Query("tenantCode") tenantCode?:string){const followerUserId=this.requireUserId(req.headers?.authorization);if(followerUserId===followedUserId)throw new BadRequestException("不能关注自己");const tenant=await this.resolveTenant(req,tenantCode);const visibleAuthorPost=await this.communityPosts.findOne({where:this.exactTenantWhere({userId:followedUserId,status:"approved",visible:true,deletedAt:IsNull()},tenant)});if(!visibleAuthorPost)throw new NotFoundException("用户在当前机构没有可见内容");const row=await this.communityUserFollows.findOneBy({followerUserId,followedUserId});if(row){await this.communityUserFollows.delete(row.id);return{following:false};}try{await this.communityUserFollows.save(this.communityUserFollows.create({followerUserId,followedUserId}));await this.communityNotifications.save(this.communityNotifications.create({userId:followedUserId,type:"follow",postId:null,commentId:null,actorUserId:followerUserId,title:"你有新的关注者",content:"你有一位新的社区关注者",readAt:null}));}catch(error:any){if(!this.isDuplicateKeyError(error))throw error;}return{following:true};}

  @Get("me/community/favorites")
  async myCommunityFavorites(@Req() req:any,@Query("tenantCode") tenantCode?:string){const userId=this.requireUserId(req.headers?.authorization);const tenant=await this.resolveTenant(req,tenantCode);const rows=await this.communityPostFavorites.find({where:{userId},order:{createdAt:"DESC"},take:100});if(!rows.length)return[];const posts=await this.communityPosts.find({where:this.exactTenantWhere({id:In(rows.map(row=>row.postId)),status:"approved",visible:true,deletedAt:IsNull()},tenant),order:{createdAt:"DESC"}});return posts.map(post=>this.postView(post,{liked:false,favorited:true}));}

  @Get("me/community/notifications")
  async myCommunityNotifications(@Req() req:any,@Query("tenantCode") tenantCode?:string){const userId=this.requireUserId(req.headers?.authorization);const tenant=await this.resolveTenant(req,tenantCode);const rows=await this.communityNotifications.find({where:{userId},order:{createdAt:"DESC"},take:100});const postIds=Array.from(new Set(rows.filter(row=>row.postId).map(row=>Number(row.postId))));const visiblePosts=postIds.length?await this.communityPosts.find({where:this.exactTenantWhere({id:In(postIds),status:"approved",visible:true,deletedAt:IsNull()},tenant)}):[];const visiblePostIds=new Set(visiblePosts.map(post=>post.id));const actorIds=Array.from(new Set(rows.filter(row=>!row.postId&&row.actorUserId).map(row=>Number(row.actorUserId))));const visibleActors=actorIds.length?await this.communityPosts.find({where:this.exactTenantWhere({userId:In(actorIds),status:"approved",visible:true,deletedAt:IsNull()},tenant)}):[];const visibleActorIds=new Set(visibleActors.map(post=>post.userId));return rows.filter(row=>row.postId?visiblePostIds.has(row.postId):Boolean(row.actorUserId&&visibleActorIds.has(row.actorUserId))).map(row=>this.publicCommunityNotification(row));}
  @Post("me/community/notifications/:id/read") async readCommunityNotification(@Param("id",ParseIntPipe) id:number,@Req() req:any,@Query("tenantCode") tenantCode?:string){const userId=this.requireUserId(req.headers?.authorization);const tenant=await this.resolveTenant(req,tenantCode);const row=await this.communityNotifications.findOneBy({id,userId});if(!row)throw new NotFoundException("消息不存在");if(row.postId&&!(await this.communityPosts.findOne({where:this.exactTenantWhere({id:row.postId},tenant)})))throw new NotFoundException("消息不存在");if(!row.postId&&(!row.actorUserId||!(await this.communityPosts.findOne({where:this.exactTenantWhere({userId:row.actorUserId,status:"approved",visible:true,deletedAt:IsNull()},tenant)}))))throw new NotFoundException("消息不存在");row.readAt=row.readAt||new Date();return this.publicCommunityNotification(await this.communityNotifications.save(row));}
  @Get("me/community/follows") async myCommunityFollows(@Req() req:any,@Query("tenantCode") tenantCode?:string){const userId=this.requireUserId(req.headers?.authorization);const tenant=await this.resolveTenant(req,tenantCode);const rows=await this.communityUserFollows.find({where:{followerUserId:userId},order:{createdAt:"DESC"},take:200});const ids=Array.from(new Set(rows.map(row=>row.followedUserId)));const visiblePosts=ids.length?await this.communityPosts.find({where:this.exactTenantWhere({userId:In(ids),status:"approved",visible:true,deletedAt:IsNull()},tenant)}):[];const visibleIds=new Set(visiblePosts.map(post=>post.userId));const scopedRows=rows.filter(row=>visibleIds.has(row.followedUserId));const users=scopedRows.length?await this.dataSource.getRepository(User).find({where:{id:In(scopedRows.map(row=>row.followedUserId))}}):[];return scopedRows.map(row=>({id:row.id,followedName:users.find(user=>user.id===row.followedUserId)?.nickname||`用户${String(row.followedUserId).padStart(4,"0").slice(-4)}`,createdAt:row.createdAt}));}

  @Get("me/content/sanctions")
  async myContentSanctions(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    await this.markExpiredContentSanctions();
    const builder = this.contentUserSanctions.createQueryBuilder("sanction").leftJoinAndSelect("sanction.tenant", "tenant")
      .where("sanction.userId = :userId", { userId }).orderBy("sanction.createdAt", "DESC").take(100);
    if (tenant) builder.andWhere("(sanction.tenantId = :tenantId OR sanction.tenantId IS NULL)", { tenantId: tenant.id });
    else builder.andWhere("sanction.tenantId IS NULL");
    return (await builder.getMany()).map((row) => this.publicContentSanction(row));
  }

  @Get("me/content/appeals")
  async myContentAppeals(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const builder = this.contentAppeals.createQueryBuilder("appeal").leftJoinAndSelect("appeal.tenant", "tenant").leftJoinAndSelect("appeal.sanction", "sanction")
      .where("appeal.userId = :userId", { userId }).orderBy("appeal.createdAt", "DESC").take(100);
    if (tenant) builder.andWhere("(appeal.tenantId = :tenantId OR appeal.tenantId IS NULL)", { tenantId: tenant.id });
    else builder.andWhere("appeal.tenantId IS NULL");
    return (await builder.getMany()).map((row) => this.publicContentAppeal(row));
  }

  @Post("me/content/appeals")
  async submitContentAppeal(@Body() dto: any, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const suppliedKey = String(req.headers?.["x-idempotency-key"] || "").trim();
    if (suppliedKey && !/^[A-Za-z0-9:_-]{8,80}$/.test(suppliedKey)) throw new BadRequestException("幂等键格式不正确");
    const clientKey = suppliedKey || randomBytes(12).toString("hex");
    const businessKey = `content-appeal:${tenant?.id || 0}:${userId}:${clientKey}`;
    const replay = await this.contentAppeals.findOneBy({ businessKey });
    if (replay) return { ...this.publicContentAppeal(replay), idempotent: true };
    const sanctionId = Number(dto.sanctionId || 0) || null;
    const sanction = sanctionId ? await this.contentUserSanctions.findOneBy({ id: sanctionId, userId }) : null;
    if (sanctionId && !sanction) throw new NotFoundException("处罚记录不存在");
    if (sanction?.tenant && sanction.tenant.id !== tenant?.id) throw new NotFoundException("处罚记录不存在");
    const targetType = this.optionalText(dto.targetType, 40);
    const targetId = Number(dto.targetId || 0) || null;
    const pendingIdentity = sanctionId ? `sanction:${sanctionId}` : targetType && targetId ? `${targetType}:${targetId}` : "general";
    const pendingKey = `content-appeal-pending:${tenant?.id || 0}:${userId}:${pendingIdentity}`;
    const pending = await this.contentAppeals.findOneBy({ pendingKey });
    if (pending) return { ...this.publicContentAppeal(pending), idempotent: true };
    const reason = this.requiredText(dto.reason, 5, 2000, "请填写至少 5 个字的申诉说明");
    const appeal = this.contentAppeals.create({
      businessKey,
      pendingKey,
      tenant: sanction?.tenant || tenant || null,
      userId,
      sanction,
      targetType,
      targetId,
      reason,
      evidenceUrls: this.normalizeForumImages(dto.evidenceUrls),
      status: "pending",
      handleRemark: null,
      handledByAdminId: null,
      handledAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    try {
      return { ...this.publicContentAppeal(await this.contentAppeals.save(appeal)), idempotent: false };
    } catch (error: any) {
      if (!this.isDuplicateKeyError(error)) throw error;
      const existing = await this.contentAppeals.findOne({ where: [{ businessKey }, { pendingKey }] });
      if (!existing) throw error;
      return { ...this.publicContentAppeal(existing), idempotent: true };
    }
  }

  @Get("community/posts/:id/comments")
  async listPostComments(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const tenant = await this.resolveTenant(req, tenantCode);
    const post = await this.findVisibleApprovedPost(id, tenant);
    if (!post) throw new NotFoundException("动态不存在或已下架");
    const comments = await this.communityPostComments.find({ where: { postId: id, status: "approved",deletedAt:IsNull() }, order: { createdAt: "ASC" }, take: 50 });
    const users = comments.length ? await this.users.find({ where: { id: In(Array.from(new Set(comments.map((comment) => comment.userId)))) } }) : [];
    return comments.map((comment) => this.publicCommunityComment(comment, users.find((user) => user.id === comment.userId)));
  }

  @Post("community/posts/:id/comments")
  async createPostComment(@Param("id", ParseIntPipe) id: number, @Body() dto: { content?: string; parentId?:number; mentionUserIds?:number[] }, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    await this.assertContentWriteAllowed(userId, tenant, "community");
    const post = await this.findVisibleApprovedPost(id, tenant);
    if (!post) throw new BadRequestException("动态不存在或已下架");
    const screened = await this.screenContent(String(dto.content || "").trim(), tenant, "community");
    const content = screened.text;
    if (!content) throw new BadRequestException("请输入评论内容");
    if (content.length > 300) throw new BadRequestException("评论不能超过 300 个字");
    const parentId=Number(dto.parentId||0)||null;if(parentId){const parent=await this.communityPostComments.findOneBy({id:parentId,postId:id,deletedAt:IsNull()});if(!parent)throw new BadRequestException("被回复的评论不存在");}
    const mentionUserIds=Array.from(new Set((Array.isArray(dto.mentionUserIds)?dto.mentionUserIds:[]).map(Number).filter(value=>value>0&&value!==userId))).slice(0,20);
    const comment = await this.communityPostComments.save(this.communityPostComments.create({ postId: id, userId, parentId, mentionUserIds:mentionUserIds.length?mentionUserIds:null, content, status: "pending",reviewRemark:null,deletedAt:null }));
    return { comment: this.publicCommunityComment(comment), message: "评论已提交，审核通过后展示" };
  }

  @Get("forum/categories")
  async listForumCategories(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertForumEnabled(req, tenantCode);
    const tenant = await this.resolveTenant(req, tenantCode);
    const builder = this.forumCategories
      .createQueryBuilder("category")
      .leftJoinAndSelect("category.tenant", "tenant")
      .where("category.enabled = :enabled", { enabled: true })
      .orderBy("category.sortOrder", "ASC")
      .addOrderBy("category.id", "ASC");
    this.applyTenantOrGlobalAliasScope(builder, "category", tenant);
    let rows = await builder.getMany();
    if (!rows.length) rows = [await this.ensurePublicDefaultForumCategory(tenant)];
    const moderators = rows.length ? await this.forumCategoryModerators.find({ where: { category: { id: In(rows.map((row) => row.id)) } } }) : [];
    return rows.map((row) => ({ ...this.publicForumCategory(row), moderatorCount: moderators.filter((item) => item.category.id === row.id).length }));
  }

  @Get("forum/topics")
  async listForumTopics(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("categoryId") categoryId?: string, @Query("keyword") keyword?: string) {
    await this.assertForumEnabled(req, tenantCode);
    const userId = this.optionalUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const builder = this.forumTopics
      .createQueryBuilder("topic")
      .leftJoinAndSelect("topic.tenant", "tenant")
      .leftJoinAndSelect("topic.category", "category")
      .leftJoinAndSelect("topic.user", "user")
      .where("topic.status = :status", { status: "approved" })
      .orderBy("topic.pinned", "DESC")
      .addOrderBy("topic.featured", "DESC")
      .addOrderBy("topic.lastReplyAt", "DESC")
      .addOrderBy("topic.createdAt", "DESC")
      .take(30);
    this.applyTenantOrGlobalAliasScope(builder, "topic", tenant);
    if (categoryId) builder.andWhere("topic.categoryId = :categoryId", { categoryId: Number(categoryId) });
    const text = String(keyword || "").trim();
    if (text) builder.andWhere("(topic.title LIKE :keyword OR topic.content LIKE :keyword)", { keyword: `%${text}%` });
    const rows = await builder.getMany();
    const favorites = userId && rows.length ? await this.forumFavorites.find({ where: rows.map((topic) => ({ topic: { id: topic.id }, user: { id: userId } })) }) : [];
    return rows.map((topic) => this.forumTopicView(topic, { favorited: favorites.some((row) => row.topic.id === topic.id) }));
  }

  @Get("forum/topics/:id")
  async getForumTopic(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertForumEnabled(req, tenantCode);
    const userId = this.optionalUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const topic = await this.findPublicForumTopic(id, tenant);
    if (!topic) return null;
    topic.viewCount = Number(topic.viewCount || 0) + 1;
    topic.heat = Number(topic.heat || 0) + 1;
    await this.forumTopics.save(topic);
    void this.forumViewLogs.save(this.forumViewLogs.create({ tenant: topic.tenant || null, topic, user: userId ? ({ id: userId } as any) : null, clientIp: this.clientIp(req), userAgent: String(req.headers?.["user-agent"] || "").slice(0, 255) || null })).catch(() => null);
    const [favorite, replies] = await Promise.all([
      userId ? this.forumFavorites.findOne({ where: { topic: { id }, user: { id: userId } } }) : Promise.resolve(null),
      this.forumReplies.find({ where: { topic: { id }, status: "approved" }, order: { createdAt: "ASC" } })
    ]);
    return { ...this.forumTopicView(topic, { favorited: Boolean(favorite) }), replies: this.threadedForumReplies(replies) };
  }

  @Post("forum/topics")
  async createForumTopic(@Body() dto: any, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertForumPostEnabled(req, tenantCode);
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    await this.assertContentWriteAllowed(userId, tenant, "forum");
    const category = await this.resolvePublicForumCategory(dto.categoryId, tenant);
    if (category.postPermission === "admin" || category.auditMode === "closed") throw new BadRequestException("当前版块暂不开放用户发帖");
    const titleResult = await this.screenContent(this.requiredText(dto.title, 2, 120, "请填写帖子标题"), tenant, "forum");
    const contentResult = await this.screenContent(this.requiredText(dto.content, 2, 10000, "请填写帖子内容"), tenant, "forum");
    const title = titleResult.text;
    const content = contentResult.text;
    const approved = category.auditMode === "post" && !titleResult.requiresReview && !contentResult.requiresReview;
    const topic = await this.forumTopics.save(this.forumTopics.create({
      tenant,
      category,
      userId,
      title,
      content,
      images: this.normalizeForumImages(dto.images),
      tags: this.normalizeForumTags(dto.tags),
      activityId: Number(dto.activityId || 0) || null,
      courseId: Number(dto.courseId || 0) || null,
      charityProjectId: Number(dto.charityProjectId || 0) || null,
      status: approved ? "approved" : "pending",
      approvedAt: approved ? new Date() : null,
      lastReplyAt: new Date()
    }));
    return { topic: this.forumTopicView(topic, { favorited: false }), message: approved ? "帖子已发布" : "帖子已提交审核，通过后展示" };
  }

  @Post("forum/topics/:id/replies")
  async createForumReply(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertForumPostEnabled(req, tenantCode);
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const topic = await this.findPublicForumTopic(id, tenant);
    if (!topic) throw new NotFoundException("帖子不存在或未通过审核");
    const lockMessage = forumReplyLockMessage(topic);
    if (lockMessage) throw new BadRequestException(lockMessage);
    return this.createForumReplyRow(topic, null, userId, dto);
  }

  @Post("forum/replies/:id/replies")
  async createForumChildReply(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertForumPostEnabled(req, tenantCode);
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const parent = await this.forumReplies.findOne({ where: { id, status: "approved" }, relations: ["topic", "parent", "user"], loadEagerRelations: false });
    const topic = parent?.topic ? await this.findPublicForumTopic(parent.topic.id, tenant) : null;
    if (!parent || !topic) throw new NotFoundException("回复不存在或未通过审核");
    const lockMessage = forumReplyLockMessage(topic);
    if (lockMessage) throw new BadRequestException(lockMessage);
    const rootParent = parent.depth >= 2 && parent.parent ? parent.parent : parent;
    return this.createForumReplyRow(topic, rootParent, userId, { ...dto, quoteReply: parent });
  }

  @Post("forum/topics/:id/favorite")
  async toggleForumFavorite(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertForumPostEnabled(req, tenantCode);
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const topic = await this.findPublicForumTopic(id, tenant);
    if (!topic) throw new NotFoundException("帖子不存在或未通过审核");
    const existing = await this.forumFavorites.findOne({ where: { topic: { id }, user: { id: userId } } });
    if (existing) {
      await this.forumFavorites.delete(existing.id);
      topic.favoriteCount = Math.max(0, Number(topic.favoriteCount || 0) - 1);
      await this.forumTopics.save(topic);
      return { favorited: false, favoriteCount: topic.favoriteCount };
    }
    try {
      await this.forumFavorites.save(this.forumFavorites.create({ tenant: topic.tenant || null, topic, user: { id: userId } as any }));
      topic.favoriteCount = Number(topic.favoriteCount || 0) + 1;
      topic.heat = Number(topic.heat || 0) + 3;
      await this.forumTopics.save(topic);
    } catch (error: any) {
      if (!this.isDuplicateKeyError(error)) throw error;
    }
    return { favorited: true, favoriteCount: topic.favoriteCount };
  }

  @Post("forum/topics/:id/report")
  async reportForumTopic(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertForumPostEnabled(req, tenantCode);
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const topic = await this.findPublicForumTopic(id, tenant);
    if (!topic) throw new NotFoundException("帖子不存在或未通过审核");
    if (await this.forumReports.findOne({ where: { topic: { id }, reporterId: userId, status: "pending" } })) throw new BadRequestException("该帖子已在处理你的举报");
    const report = await this.forumReports.save(this.forumReports.create({ tenant: topic.tenant || null, topic, reply: null, reporterId: userId, type: this.requiredText(dto.type || "other", 1, 40, "请选择举报类型"), description: this.optionalText(dto.description, 1000), status: "pending" }));
    topic.reportCount = Number(topic.reportCount || 0) + 1;
    await this.forumTopics.save(topic);
    return { report, message: "举报已提交，平台会尽快处理" };
  }

  @Post("forum/replies/:id/report")
  async reportForumReply(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertForumPostEnabled(req, tenantCode);
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const reply = await this.forumReplies.findOne({ where: { id, status: "approved" }, relations: ["topic"], loadEagerRelations: false });
    if (!reply?.topic) throw new NotFoundException("回复不存在或未通过审核");
    const topic = await this.findPublicForumTopic(reply.topic.id, tenant);
    if (!topic) throw new NotFoundException("回复不存在或未通过审核");
    if (await this.forumReports.findOne({ where: { reply: { id }, reporterId: userId, status: "pending" } })) throw new BadRequestException("该回复已在处理你的举报");
    const report = await this.forumReports.save(this.forumReports.create({ tenant: topic.tenant || null, topic, reply, reporterId: userId, type: this.requiredText(dto.type || "other", 1, 40, "请选择举报类型"), description: this.optionalText(dto.description, 1000), status: "pending" }));
    topic.reportCount = Number(topic.reportCount || 0) + 1;
    await this.forumTopics.save(topic);
    return { report, message: "举报已提交，平台会尽快处理" };
  }

  @Get("me/forum/topics")
  async listMyForumTopics(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertForumEnabled(req, tenantCode);
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const builder = this.forumTopics.createQueryBuilder("topic").leftJoinAndSelect("topic.category", "category").leftJoinAndSelect("topic.tenant", "tenant").where("topic.userId = :userId", { userId }).orderBy("topic.createdAt", "DESC").take(50);
    this.applyTenantOrGlobalAliasScope(builder, "topic", tenant);
    return (await builder.getMany()).map((topic) => this.forumTopicView(topic, { favorited: false }));
  }

  @Get("me/forum/replies")
  async listMyForumReplies(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertForumEnabled(req, tenantCode);
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const builder = this.forumReplies.createQueryBuilder("reply").leftJoinAndSelect("reply.topic", "topic").leftJoinAndSelect("reply.tenant", "tenant").where("reply.userId = :userId", { userId }).orderBy("reply.createdAt", "DESC").take(50);
    this.applyTenantOrGlobalAliasScope(builder, "reply", tenant);
    return (await builder.getMany()).map((reply) => ({
      ...this.forumReplyView(reply),
      status: reply.status,
      reviewRemark: reply.reviewRemark,
      updatedAt: reply.updatedAt,
      topic: this.forumTopicView(reply.topic, { favorited: false })
    }));
  }

  @Get("me/forum/favorites")
  async listMyForumFavorites(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertForumEnabled(req, tenantCode);
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const rows = await this.forumFavorites.find({ where: { user: { id: userId } }, order: { createdAt: "DESC" }, take: 50 });
    return rows
      .filter((row) => tenant ? row.topic.tenant?.id === tenant.id : !row.topic.tenant)
      .map((row) => ({ id: row.id, topic: this.forumTopicView(row.topic, { favorited: true }), createdAt: row.createdAt }));
  }

  @Get("checkin/today")
  async getTodayCheckin(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertCommunityEnabled(req, tenantCode);
    const today = this.today();
    const tenant = await this.resolveTenant(req, tenantCode);
    const task = await this.findTodayCheckinTask(today, tenant);
    if (!task) return null;
    const userId = this.optionalUserId(req.headers?.authorization);
    const monthStart = `${today.slice(0, 7)}-01`;
    const monthEnd = this.monthEndDate(today);
    const rows = userId ? await this.listUserMonthlyCheckins(userId, monthStart, monthEnd, tenant) : [];
    const checkedDates = rows.map((row) => this.dateOnly(row.date)).filter(Boolean);
    const checkedToday = Boolean(userId && checkedDates.includes(today));
    const completedCount = await this.countTaskCheckins(task.id, tenant);
    return {
      ...this.publicCheckinTask(task),
      completedCount,
      checkedToday,
      checkedDates,
      checkedDays: checkedDates.map((date) => Number(date.slice(8, 10))).filter((day) => Number.isFinite(day)),
      today
    };
  }

  @Post("checkin/today/complete")
  async completeTodayCheckin(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertCommunityEnabled(req, tenantCode);
    const userId = this.requireUserId(req.headers?.authorization);
    const today = this.today();
    const tenant = await this.resolveTenant(req, tenantCode);
    return this.dataSource.transaction(async (manager) => {
      const task = await this.findTodayCheckinTask(today, tenant, manager.getRepository(CheckInTask));
      if (!task) return { checkedToday: false, message: "暂无今日打卡任务", today };
      const taskRepo = manager.getRepository(CheckInTask);
      const checkinRepo = manager.getRepository(CommunityCheckIn);
      const lockedTask = await taskRepo.findOne({
        where: this.exactTenantWhere({ id: task.id, activityId: IsNull(), enabled: true }, tenant),
        lock: { mode: "pessimistic_write" }
      });
      if (!lockedTask) return { checkedToday: false, message: "暂无今日打卡任务", today };
      let row = await this.findUserTaskCheckin(userId, lockedTask.id, today, tenant, checkinRepo);
      if (!row) {
        try {
          row = await checkinRepo.save(checkinRepo.create({ userId, taskId: lockedTask.id, activityId: null, date: today, tenant }));
        } catch (error: any) {
          if (!this.isDuplicateKeyError(error)) throw error;
          row = await this.findUserTaskCheckin(userId, lockedTask.id, today, tenant, checkinRepo);
        }
      }
      const completedCount = await this.countTaskCheckins(lockedTask.id, tenant, checkinRepo);
      if (Number(lockedTask.completedCount || 0) !== completedCount) {
        lockedTask.completedCount = completedCount;
        await taskRepo.save(lockedTask);
      }
      return {
        checkedToday: true,
        checkin: row ? this.publicCommunityCheckin(row) : null,
        task: { ...this.publicCheckinTask(lockedTask), completedCount },
        today
      };
    });
  }

  @Get("community/activities/:id/program")
  async communityProgram(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertCommunityEnabled(req, tenantCode);
    const tenant = await this.resolveTenant(req, tenantCode);
    const activity = await this.communityActivities.findOne({ where: this.exactTenantWhere({ id, status: "published" }, tenant) });
    if (!activity) throw new NotFoundException("共学活动不存在");
    const userId = this.optionalUserId(req.headers?.authorization);
    const membership = userId
      ? await this.communityActivityMembers.findOne({ where: this.exactTenantWhere({ activityId: id, userId }, tenant) })
      : null;
    const tasks = membership?.status === "joined"
      ? await this.checkinTasks.find({ where: this.exactTenantWhere({ activityId: id, enabled: true }, tenant), order: { date: "ASC" } })
      : [];
    const checkins = userId
      ? await this.communityCheckins.find({ where: this.exactTenantWhere({ activityId: id, userId }, tenant), order: { date: "ASC" } })
      : [];
    return {
      activity: this.publicCommunityActivity(activity),
      membership: membership ? this.publicCommunityMembership(membership) : null,
      tasks: tasks.map((task) => this.publicCheckinTask(task)),
      checkins: checkins.map((row) => this.publicCommunityCheckin(row)),
      streak: this.checkinStreak(checkins.filter((row) => row.status === "approved").map((row) => this.dateOnly(row.date)))
    };
  }

  @Post("community/activities/:id/join")
  async joinCommunityProgram(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertCommunityEnabled(req, tenantCode);
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    return this.dataSource.transaction(async (manager) => {
      const activityRepo = manager.getRepository(CommunityActivity);
      const memberRepo = manager.getRepository(CommunityActivityMember);
      const activity = await activityRepo.findOne({
        where: this.exactTenantWhere({ id, status: "published" }, tenant),
        lock: { mode: "pessimistic_write" }
      });
      if (!activity) throw new NotFoundException("共学活动不存在");
      if (activity.endTime && activity.endTime < new Date()) throw new BadRequestException("共学活动已结束");
      let member = await memberRepo.findOne({
        where: this.exactTenantWhere({ activityId: id, userId }, tenant),
        lock: { mode: "pessimistic_write" }
      });
      if (member?.status === "joined" || member?.status === "pending") return this.publicCommunityMembership(member);
      const count = await memberRepo.count({ where: this.exactTenantWhere({ activityId: id, status: "joined" }, tenant) });
      if (activity.memberLimit && count >= activity.memberLimit) throw new BadRequestException("共学名额已满");
      if (activity.joinMode === "invite" && String(dto.inviteCode || "").trim() !== String(activity.inviteCode || "")) {
        throw new BadRequestException("邀请码不正确");
      }
      const status = activity.joinMode === "approval" ? "pending" : "joined";
      const applyRemark = String(dto.applyRemark || "").trim().slice(0, 500) || null;
      if (!member) {
        member = memberRepo.create({ activityId: id, userId, activity, tenant: activity.tenant, status, applyRemark, reviewRemark: null, reviewedByAdminId: null, reviewedAt: null, joinedAt: status === "joined" ? new Date() : null });
      } else {
        member.status = status;
        member.applyRemark = applyRemark;
        member.reviewRemark = null;
        member.reviewedAt = null;
        member.reviewedByAdminId = null;
        member.joinedAt = status === "joined" ? new Date() : null;
      }
      const saved = await memberRepo.save(member);
      if (status === "joined") {
        activity.registeredCount = count + 1;
        await activityRepo.save(activity);
      }
      return this.publicCommunityMembership(saved);
    });
  }

  @Post("community/activities/:id/checkins")
  async submitProgramCheckin(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertCommunityEnabled(req, tenantCode);
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    return this.dataSource.transaction(async (manager) => {
      const activity = await manager.getRepository(CommunityActivity).findOne({
        where: this.exactTenantWhere({ id, status: "published" }, tenant)
      });
      if (!activity) throw new NotFoundException("共学活动不存在");
      const memberRepo = manager.getRepository(CommunityActivityMember);
      const taskRepo = manager.getRepository(CheckInTask);
      const checkinRepo = manager.getRepository(CommunityCheckIn);
      const membership = await memberRepo.findOne({ where: this.exactTenantWhere({ activityId: id, userId, status: "joined" }, tenant) });
      if (!membership) throw new ForbiddenException("请先加入共学活动");
      const task = await taskRepo.findOne({
        where: this.exactTenantWhere({ id: Number(dto.taskId || 0), activityId: id, enabled: true }, tenant),
        lock: { mode: "pessimistic_write" }
      });
      if (!task) throw new NotFoundException("打卡任务不存在");
      const today = this.today();
      const date = this.dateOnly(dto.date || task.date);
      let row = await checkinRepo.findOne({
        where: this.exactTenantWhere({ userId, taskId: task.id, activityId: id, date }, tenant),
        lock: { mode: "pessimistic_write" }
      });
      let makeup = false;
      if (!row || row.status !== "rejected") {
        try {
          makeup = assertCommunityCheckinDate({ taskDate: this.dateOnly(task.date), submitDate: date, today, allowMakeup: task.allowMakeup, makeupWithinDays: task.makeupWithinDays }).makeup;
        } catch (error: any) {
          throw new BadRequestException(error.message);
        }
      } else {
        makeup = row.makeup;
      }
      const content = String(dto.content || "").trim().slice(0, 5000);
      const images = Array.isArray(dto.images) ? dto.images.map(String).filter(Boolean).slice(0, 9) : [];
      if (["text", "question"].includes(task.checkinType) && content.length < 2) throw new BadRequestException("请填写打卡内容");
      if (task.checkinType === "image" && !images.length) throw new BadRequestException("请上传打卡图片");
      if (task.checkinType === "location" && (!Number.isFinite(Number(dto.latitude)) || !Number.isFinite(Number(dto.longitude)))) {
        throw new BadRequestException("请获取打卡位置");
      }
      if (row && row.status !== "rejected") {
        const approvedRows = await checkinRepo.find({ where: this.exactTenantWhere({ activityId: id, userId, status: "approved" }, tenant), order: { date: "ASC" } });
        return { checkin: this.publicCommunityCheckin(row), streak: this.checkinStreak(approvedRows.map((item) => this.dateOnly(item.date))), idempotent: true };
      }
      const values = {
        content: content || null,
        images: images.length ? images : null,
        answers: dto.answers && typeof dto.answers === "object" ? dto.answers : null,
        locationName: String(dto.locationName || "").trim().slice(0, 200) || null,
        latitude: Number.isFinite(Number(dto.latitude)) ? Number(dto.latitude).toFixed(6) : null,
        longitude: Number.isFinite(Number(dto.longitude)) ? Number(dto.longitude).toFixed(6) : null,
        status: task.requireApproval ? "pending" as const : "approved" as const,
        makeup,
        reviewRemark: null,
        reviewedByAdminId: null,
        reviewedAt: task.requireApproval ? null : new Date()
      };
      if (row) Object.assign(row, values);
      else row = checkinRepo.create({ userId, taskId: task.id, activityId: id, date, tenant: membership.tenant, ...values });
      try {
        row = await checkinRepo.save(row);
      } catch (error: any) {
        if (!this.isDuplicateKeyError(error)) throw error;
        const existing = await checkinRepo.findOne({ where: this.exactTenantWhere({ userId, taskId: task.id, activityId: id, date }, tenant) });
        if (!existing) throw error;
        row = existing;
      }
      task.completedCount = await checkinRepo.count({ where: this.exactTenantWhere({ taskId: task.id, status: "approved" }, tenant) });
      await taskRepo.save(task);
      const rows = await checkinRepo.find({ where: this.exactTenantWhere({ activityId: id, userId, status: "approved" }, tenant), order: { date: "ASC" } });
      return { checkin: this.publicCommunityCheckin(row), streak: this.checkinStreak(rows.map((item) => this.dateOnly(item.date))) };
    });
  }

  private applyTenantOrGlobalAliasScope(builder: any, alias: string, tenant?: Tenant | null) {
    if (tenant) builder.andWhere(`(${alias}.tenantId = :tenantId OR ${alias}.tenantId IS NULL)`, { tenantId: tenant.id });
    return builder;
  }

  private async assertContentWriteAllowed(userId: number, tenant: Tenant | null | undefined, scope: "community" | "forum") {
    const now = new Date();
    await this.markExpiredContentSanctions(now);
    const builder = this.contentUserSanctions.createQueryBuilder("sanction")
      .where("sanction.userId = :userId", { userId })
      .andWhere("sanction.status = :status", { status: "active" })
      .andWhere("sanction.scope IN (:...scopes)", { scopes: ["all", scope] })
      .andWhere("sanction.startsAt <= :now", { now })
      .andWhere("(sanction.endsAt IS NULL OR sanction.endsAt > :now)", { now })
      .orderBy("sanction.id", "DESC");
    if (tenant) builder.andWhere("(sanction.tenantId = :tenantId OR sanction.tenantId IS NULL)", { tenantId: tenant.id });
    else builder.andWhere("sanction.tenantId IS NULL");
    const sanction = await builder.getOne();
    if (sanction && sanctionApplies(sanction, scope, now)) {
      const until = sanction.endsAt ? `，至 ${sanction.endsAt.toLocaleString("zh-CN", { hour12: false })}` : "";
      throw new ForbiddenException(`当前账号已被${sanction.type === "ban" ? "禁用" : "禁言"}${until}：${sanction.reason}`);
    }
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

  private async screenContent(text: string, tenant: Tenant | null | undefined, scope: "community" | "forum") {
    const builder = this.contentKeywordRules.createQueryBuilder("rule")
      .where("rule.enabled = :enabled", { enabled: true })
      .andWhere("rule.scope IN (:...scopes)", { scopes: ["all", scope] })
      .orderBy("rule.tenantId", "DESC")
      .addOrderBy("rule.id", "ASC");
    if (tenant) builder.andWhere("(rule.tenantId = :tenantId OR rule.tenantId IS NULL)", { tenantId: tenant.id });
    else builder.andWhere("rule.tenantId IS NULL");
    const result = screenGovernedContent(text, await builder.getMany());
    if (result.rejected) throw new BadRequestException(`内容包含禁止发布的词语：${result.matches.join("、")}`);
    return result;
  }

  private async ensurePublicDefaultForumCategory(tenant?: Tenant | null) {
    const builder = this.forumCategories.createQueryBuilder("category").leftJoinAndSelect("category.tenant", "tenant").where("category.name = :name", { name: "共修交流" });
    if (tenant) builder.andWhere("category.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.andWhere("category.tenantId IS NULL");
    const existing = await builder.getOne();
    if (existing) return existing;
    return this.forumCategories.save(this.forumCategories.create({ tenant: tenant || null, name: "共修交流", description: "活动心得、课程共学和公益共建交流", sortOrder: 0, enabled: true, postPermission: "user", auditMode: "pre" }));
  }

  private async resolvePublicForumCategory(categoryId: unknown, tenant?: Tenant | null) {
    const id = Number(categoryId || 0);
    if (!id) return this.ensurePublicDefaultForumCategory(tenant);
    const category = await this.forumCategories.findOne({ where: { id } });
    if (!category || !category.enabled) throw new BadRequestException("论坛版块不存在或已停用");
    if (category.tenant && tenant && category.tenant.id !== tenant.id) throw new BadRequestException("不能向其它城市版块发帖");
    if (category.tenant && !tenant) throw new BadRequestException("请先选择当前城市");
    return category;
  }

  private async findPublicForumTopic(id: number, tenant?: Tenant | null) {
    const builder = this.forumTopics
      .createQueryBuilder("topic")
      .leftJoinAndSelect("topic.tenant", "tenant")
      .leftJoinAndSelect("topic.category", "category")
      .leftJoinAndSelect("topic.user", "user")
      .leftJoinAndSelect("topic.activity", "activity")
      .leftJoinAndSelect("topic.course", "course")
      .leftJoinAndSelect("topic.charityProject", "charityProject")
      .where("topic.id = :id", { id })
      .andWhere("topic.status = :status", { status: "approved" });
    return this.applyTenantOrGlobalAliasScope(builder, "topic", tenant).getOne();
  }

  private async createForumReplyRow(topic: ForumTopic, parent: ForumReply | null, userId: number, dto: any) {
    await this.assertContentWriteAllowed(userId, topic.tenant || null, "forum");
    const contentResult = await this.screenContent(this.requiredText(dto.content, 1, 5000, "请输入回复内容"), topic.tenant || null, "forum");
    const content = contentResult.text;
    const approved = topic.category?.auditMode === "post" && !contentResult.requiresReview;
    const quoteReply = dto.quoteReply instanceof ForumReply ? dto.quoteReply as ForumReply : null;
    const reply = await this.dataSource.transaction(async (manager) => {
      const topicRepo = manager.getRepository(ForumTopic);
      const replyRepo = manager.getRepository(ForumReply);
      const lockedTopic = await topicRepo.findOne({ where: { id: topic.id }, lock: { mode: "pessimistic_write" } });
      if (!lockedTopic || lockedTopic.status !== "approved") throw new NotFoundException("帖子不存在或未通过审核");
      const lockMessage = forumReplyLockMessage(lockedTopic);
      if (lockMessage) throw new BadRequestException(lockMessage);
      const floorNo = parent ? null : nextForumFloorNo(lockedTopic.nextFloorNo);
      if (floorNo) lockedTopic.nextFloorNo = floorNo + 1;
      const quote = quoteReply ? forumQuoteSnapshot(quoteReply) : null;
      const row = await replyRepo.save(replyRepo.create({
        tenant: topic.tenant || null,
        topic: lockedTopic,
        parent,
        depth: parent ? 2 : 1,
        floorNo,
        quoteReplyId: quote?.replyId || null,
        quoteFloorNo: quote?.floorNo || null,
        quoteAuthorName: quote?.authorName || null,
        quoteContent: quote?.content || null,
        userId,
        content,
        images: this.normalizeForumImages(dto.images),
        authorRole: lockedTopic.userId === userId ? "author" : "user",
        status: approved ? "approved" : "pending",
        approvedAt: approved ? new Date() : null
      }));
      if (approved) {
        lockedTopic.replyCount = Number(lockedTopic.replyCount || 0) + 1;
        lockedTopic.lastReplyAt = new Date();
        lockedTopic.heat = Number(lockedTopic.viewCount || 0) + Number(lockedTopic.replyCount || 0) * 5 + Number(lockedTopic.favoriteCount || 0) * 3;
      }
      await topicRepo.save(lockedTopic);
      return row;
    });
    if (approved) await this.createForumReplyNotifications(topic, reply, quoteReply || parent, userId);
    return { reply: this.forumReplyView(reply), message: approved ? "回复已发布" : "回复已提交审核，通过后展示" };
  }

  private async createForumReplyNotifications(topic: ForumTopic, reply: ForumReply, parent: ForumReply | null, senderId: number) {
    const targets = new Set<number>();
    if (topic.userId && topic.userId !== senderId) targets.add(topic.userId);
    if (parent?.userId && parent.userId !== senderId) targets.add(parent.userId);
    if (!targets.size) return;
    await this.forumNotifications.save(Array.from(targets).map((userId) => this.forumNotifications.create({
      tenant: topic.tenant || null,
      user: { id: userId } as any,
      topic,
      reply,
      type: "reply",
      title: "你的帖子有新回复",
      content: reply.content.slice(0, 120),
      readAt: null
    })));
  }

  private forumTopicView(topic: ForumTopic, extra: { favorited: boolean }) {
    return {
      id: topic.id,
      tenant: topic.tenant ? { id: topic.tenant.id, code: topic.tenant.code, name: topic.tenant.name, region: topic.tenant.region } : null,
      category: topic.category ? { id: topic.category.id, name: topic.category.name, auditMode: topic.category.auditMode } : null,
      author: topic.user ? { nickname: this.publicDisplayName(topic.user.nickname, topic.user.id), avatarUrl: topic.user.avatarUrl } : { nickname: topic.userId ? `用户${topic.userId}` : "平台运营", avatarUrl: null },
      title: topic.title,
      content: topic.content,
      images: topic.images || [],
      tags: topic.tags || [],
      activity: topic.activity ? { id: topic.activity.id, title: topic.activity.title } : null,
      course: topic.course ? { id: topic.course.id, title: topic.course.title } : null,
      charityProject: topic.charityProject ? { id: topic.charityProject.id, title: topic.charityProject.title } : null,
      pinned: topic.pinned,
      featured: topic.featured,
      locked: topic.locked,
      lockReason: topic.lockReason,
      lockedAt: topic.lockedAt,
      heat: topic.heat,
      viewCount: topic.viewCount,
      replyCount: topic.replyCount,
      favoriteCount: topic.favoriteCount,
      reportCount: topic.reportCount,
      status: topic.status,
      favorited: extra.favorited,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
      lastReplyAt: topic.lastReplyAt
    };
  }

  private threadedForumReplies(replies: ForumReply[]): any[] {
    const children = new Map<number, ForumReply[]>();
    for (const reply of replies) {
      const parentId = reply.parent?.id || reply.parentId || 0;
      if (!parentId) continue;
      children.set(parentId, [...(children.get(parentId) || []), reply]);
    }
    return replies
      .filter((reply) => !reply.parent && !reply.parentId)
      .map((reply) => this.forumReplyView(reply, children.get(reply.id) || []));
  }

  private forumReplyView(reply: ForumReply, children: ForumReply[] = []): any {
    return {
      id: reply.id,
      author: reply.user ? { nickname: this.publicDisplayName(reply.user.nickname, reply.user.id), avatarUrl: reply.user.avatarUrl } : { nickname: reply.userId ? `用户${reply.userId}` : "平台运营", avatarUrl: null },
      content: reply.content,
      images: reply.images || [],
      authorRole: reply.authorRole,
      status: reply.status,
      depth: reply.depth,
      floorNo: reply.floorNo,
      quote: reply.quoteReplyId ? { replyId: reply.quoteReplyId, floorNo: reply.quoteFloorNo, authorName: reply.quoteAuthorName, content: reply.quoteContent } : null,
      createdAt: reply.createdAt,
      children: children.map((child) => this.forumReplyView(child))
    };
  }

  private requiredText(value: unknown, minLength: number, maxLength: number, message: string) {
    const text = String(value || "").trim();
    if (text.length < minLength) throw new BadRequestException(message);
    return text.slice(0, maxLength);
  }

  private normalizeForumImages(value: unknown) {
    const rows = Array.isArray(value) ? value : [];
    const normalized = rows.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 9);
    for (const url of normalized) {
      if (!/^\/uploads\/community-posts\/|^https?:\/\//i.test(url)) throw new BadRequestException("图片地址不合法");
    }
    return normalized;
  }

  private normalizeForumTags(value: unknown) {
    const rows = Array.isArray(value) ? value : String(value || "").split(/[,，、\s]+/);
    return rows.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 10);
  }

  private clientIp(req: any) {
    const forwarded = String(req.headers?.["x-forwarded-for"] || "").split(",")[0]?.trim();
    return forwarded || req.ip || req.socket?.remoteAddress || null;
  }

  private findTodayCheckinTask(date: string, tenant?: Tenant | null, repository = this.checkinTasks) {
    const builder = repository
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.tenant", "tenant")
      .where("task.date = :date", { date })
      .andWhere("task.enabled = :enabled", { enabled: true })
      .andWhere("task.activityId IS NULL")
      .orderBy("task.updatedAt", "DESC")
      .addOrderBy("task.id", "DESC");
    if (tenant) builder.andWhere("task.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.andWhere("task.tenantId IS NULL");
    return builder.getOne();
  }

  private countTaskCheckins(taskId: number, tenant?: Tenant | null, repository = this.communityCheckins) {
    const builder = repository
      .createQueryBuilder("checkin")
      .where("checkin.taskId = :taskId", { taskId });
    if (tenant) builder.andWhere("checkin.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.andWhere("checkin.tenantId IS NULL");
    return builder.getCount();
  }

  private listUserMonthlyCheckins(userId: number, monthStart: string, monthEnd: string, tenant?: Tenant | null) {
    const builder = this.communityCheckins
      .createQueryBuilder("checkin")
      .leftJoinAndSelect("checkin.tenant", "tenant")
      .where("checkin.userId = :userId", { userId })
      .andWhere("checkin.activityId IS NULL")
      .andWhere("checkin.date BETWEEN :monthStart AND :monthEnd", { monthStart, monthEnd })
      .orderBy("checkin.date", "ASC");
    if (tenant) builder.andWhere("checkin.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.andWhere("checkin.tenantId IS NULL");
    return builder.getMany();
  }

  private findUserTaskCheckin(userId: number, taskId: number, date: string, tenant?: Tenant | null, repository = this.communityCheckins) {
    const builder = repository
      .createQueryBuilder("checkin")
      .leftJoinAndSelect("checkin.tenant", "tenant")
      .where("checkin.userId = :userId", { userId })
      .andWhere("checkin.taskId = :taskId", { taskId })
      .andWhere("checkin.activityId IS NULL")
      .andWhere("checkin.date = :date", { date });
    if (tenant) builder.andWhere("checkin.tenantId = :tenantId", { tenantId: tenant.id });
    else builder.andWhere("checkin.tenantId IS NULL");
    return builder.getOne();
  }

  private async hasCourseAccess(userId: number, courseId: number) {
    const count = await this.userLearning.count({ where: { userId, courseId, lessonId: 0 } });
    return count > 0;
  }

  private async postableActivities(userId: number, tenant?: Tenant | null) {
    const now = new Date();
    const builder = this.registrations
      .createQueryBuilder("registration")
      .innerJoinAndSelect("registration.activity", "activity")
      .leftJoin(Order, "linkedOrder", "linkedOrder.registrationId = registration.id")
      .where("registration.userId = :userId", { userId })
      .andWhere(
        "(registration.status = :checkedIn OR (activity.endTime <= :now AND (registration.status = :approved OR linkedOrder.status = :paid)))",
        { checkedIn: RegistrationStatus.CheckedIn, approved: RegistrationStatus.Approved, paid: OrderStatus.Paid, now }
      )
      .orderBy("activity.endTime", "DESC");
    if (tenant) builder.andWhere("(registration.tenantId = :tenantId OR activity.tenantId = :tenantId)", { tenantId: tenant.id });
    const rows = await builder.getMany();
    const seen = new Set<number>();
    return rows
      .map((row) => row.activity)
      .filter((activity) => {
        if (!activity || seen.has(activity.id)) return false;
        seen.add(activity.id);
        return true;
      })
      .map((activity) => ({
        id: activity.id,
        title: activity.title,
        coverUrl: activity.coverUrl,
        location: activity.location,
        startTime: activity.startTime,
        endTime: activity.endTime
      }));
  }

  private normalizeImageUrls(value: unknown) {
    const rows = Array.isArray(value) ? value : [];
    const normalized = rows.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 9);
    for (const url of normalized) {
      if (!/^\/uploads\/community-posts\/|^https?:\/\//i.test(url)) throw new BadRequestException("心得图片地址不合法");
    }
    return normalized;
  }

  private publicLessonView(lesson: CourseLesson, canAccess: boolean, userId: number | null) {
    const view = protectedCourseLesson(lesson, canAccess);
    if (!canAccess) return view;
    return {
      ...view,
      videoUrl: this.courseResourceAccessUrl(view.videoUrl, userId),
      audioUrl: this.courseResourceAccessUrl(view.audioUrl, userId),
      attachmentUrl: this.courseResourceAccessUrl(view.attachmentUrl, userId)
    };
  }

  private courseResourceAccessUrl(value: unknown, userId: number | null) {
    const token = String(value || "").match(/^private-course-resource:\/\/([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/)?.[1];
    if (!token) return value || null;
    const stored = verifyPrivateAssetToken(token, this.privateAssetSecret());
    if (!stored || stored.purpose !== "course_resource" || !privateDocumentExists(stored.reference)) return null;
    const grant = createPrivateAssetToken({ ...stored, ownerUserId: userId, expiresAt: Date.now() + 15 * 60 * 1000 }, this.privateAssetSecret());
    return `/api/public/course-resources/${grant}`;
  }

  private privateAssetSecret() {
    return this.config.get<string>("PRIVATE_ASSET_SIGNING_SECRET") || this.config.get<string>("JWT_SECRET", "dev-secret-change-me");
  }

  private lessonHasResource(lesson: CourseLesson) {
    return Boolean(lesson.videoUrl || lesson.audioUrl || lesson.attachmentUrl || lesson.content);
  }

  private normalizeTags(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6);
  }

  private optionalText(value: unknown, maxLength: number) {
    const text = String(value || "").trim();
    if (!text) return null;
    return text.slice(0, maxLength);
  }

  private safePosterConfig(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    return {
      theme: this.optionalText(record.theme, 40) || "classic",
      title: this.optionalText(record.title, 80),
      subtitle: this.optionalText(record.subtitle, 120)
    };
  }

  private async saveLearning(userId: number, courseId: number, lessonId: number, progress: number, completionThreshold = 100) {
    const normalizedProgress = Math.max(0, Math.min(Number(progress.toFixed(2)), 100));
    const normalizedThreshold = Math.max(0, Math.min(Number(completionThreshold || 100), 100));
    await this.dataSource.query(
      `INSERT INTO user_learning (userId, courseId, lessonId, progress, completedAt, lastRemindedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, IF(? >= ?, CURRENT_TIMESTAMP, NULL), NULL, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))
       ON DUPLICATE KEY UPDATE
         progress = GREATEST(progress, ?),
         completedAt = CASE WHEN completedAt IS NOT NULL THEN completedAt WHEN GREATEST(progress, ?) >= ? THEN CURRENT_TIMESTAMP ELSE NULL END,
         updatedAt = CURRENT_TIMESTAMP(6)`,
      [userId, courseId, lessonId, normalizedProgress, normalizedProgress, normalizedThreshold, normalizedProgress, normalizedProgress, normalizedThreshold]
    );
    const row = await this.userLearning.findOne({ where: { userId, courseId, lessonId } });
    if (!row) throw new BadRequestException("学习进度保存失败");
    return row;
  }

  private checkinStreak(values:string[]){return communityCheckinStreak(values);}

  private async issueCourseCertificate(userId: number, course: Course) {
    const template = await this.courseCertificateTemplates.findOneBy({ courseId: course.id, enabled: true });
    if (!template) return null;
    const learning = await this.userLearning.findOneBy({ userId, courseId: course.id, lessonId: 0 });
    if (!learning || Number(learning.progress || 0) < template.completionThreshold) return null;
    if (template.requireAssessmentPass) {
      const published = await this.assessments.find({ where: { course: { id: course.id }, status: "published" } });
      for (const assessment of published) {
        const passed = await this.attempts.count({ where: { userId, assessmentId: assessment.id, status: "passed" } });
        if (!passed) return null;
      }
    }
    const issueBusinessKey = `course_completion:${course.id}:${userId}:${learning.id}`;
    let certificate = await this.certificates.findOne({ where: [{ userId, courseId: course.id, status: "active" }, { issueBusinessKey }], loadEagerRelations: false });
    if (certificate) {
      await this.credentialTemplates.ensureCertificateSnapshot(certificate);
      return certificate;
    }
    const baseTemplate = await this.credentialTemplates.publishedSnapshot("course_completion", course.tenant?.id || null);
    const templateSnapshot = normalizeCredentialTemplate("course_completion", {
      ...baseTemplate.config,
      title: template.name || baseTemplate.config.title,
      issuerName: template.issuerName || baseTemplate.config.issuerName,
      description: template.description || baseTemplate.config.description,
      backgroundImageUrl: template.backgroundUrl || baseTemplate.config.backgroundImageUrl
    });
    const prefix = templateSnapshot.numberPrefix || "CRS";
    certificate = this.certificates.create({ userId, tenantId: course.tenant?.id || null, courseId: course.id, courseTemplateId: template.id, name: template.name, certificateNo: `${prefix}-${course.id}-${userId}-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`, issueBusinessKey, certificateVersion: 1, templateVersion: baseTemplate.version, templateSnapshot, templateKey: "course_completion", holderName: null, serviceHours: "0", level: null, imageUrl: template.backgroundUrl, threshold: template.completionThreshold, serviceRecord: null, issuer: null, status: "active", revokedAt: null, revokedBy: null, revokeReason: null, revokeReasonEncrypted: null, businessSnapshot: { courseId: course.id, courseTitle: course.title, templateId: template.id, templateName: template.name, issuerName: template.issuerName, completionProgress: Number(learning.progress || 0), requireAssessmentPass: template.requireAssessmentPass, issuedReason: "course_completed" } });
    try {
      return await this.certificates.save(certificate);
    } catch (error: any) {
      if (!this.isDuplicateKeyError(error)) throw error;
      return this.certificates.findOne({ where: { issueBusinessKey }, loadEagerRelations: false });
    }
  }

  private isDuplicateKeyError(error: any) {
    return error?.code === "ER_DUP_ENTRY" || error?.errno === 1062;
  }

  private today() {
    return this.localDateString(new Date());
  }

  private localDateString(date: Date) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }

  private monthEndDate(dateText: string) {
    const year = Number(dateText.slice(0, 4));
    const month = Number(dateText.slice(5, 7));
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return this.dateOnly(dateText);
    const lastDay = new Date(year, month, 0).getDate();
    return `${dateText.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
  }

  private dateOnly(value: unknown) {
    if (value instanceof Date) return this.localDateString(value);
    return String(value || "").slice(0, 10);
  }

  private optionalUserId(authorization?: string | string[] | null) {
    try {
      return this.requireUserId(authorization);
    } catch {
      return 0;
    }
  }

  private requireUserId(authorization?: string | string[] | null) {
    const header = Array.isArray(authorization) ? authorization[0] : authorization;
    const token = String(header || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new UnauthorizedException("请先登录");
    const [payloadText, sign] = token.split(".");
    if (!payloadText || !sign) throw new UnauthorizedException("登录凭证无效");
    const expected = createHmac("sha256", this.userAccessTokenSecret()).update(payloadText).digest("base64url");
    if (sign !== expected) throw new UnauthorizedException("登录凭证无效");
    let payload: any;
    try {
      payload = JSON.parse(Buffer.from(payloadText, "base64url").toString("utf8"));
    } catch {
      throw new UnauthorizedException("登录凭证无效");
    }
    if (payload?.scope !== "user" || !Number.isInteger(payload.sub)) throw new UnauthorizedException("登录凭证无效");
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) throw new UnauthorizedException("登录已过期，请重新登录");
    return Number(payload.sub);
  }

  private userAccessTokenSecret() {
    return this.config.get<string>("USER_ACCESS_TOKEN_SECRET") || this.config.get<string>("JWT_SECRET") || this.config.get<string>("H5_AUTH_SECRET") || "dev-secret-change-me";
  }

  private tenantWhere<T extends Record<string, unknown>>(where: T, tenant?: Tenant | null) {
    return { ...where, tenant: tenant ? { id: tenant.id } : IsNull() } as any;
  }

  private exactTenantWhere<T extends Record<string, unknown>>(where: T, tenant?: Tenant | null) {
    return { ...where, tenant: tenant ? { id: tenant.id } : IsNull() } as any;
  }

  private courseBelongsToTenant(course: Course | null | undefined, tenant?: Tenant | null) {
    const courseTenantId = course?.tenant?.id || null;
    return tenant ? courseTenantId === tenant.id : courseTenantId === null;
  }

  private assessmentBelongsToTenant(assessment: CourseAssessment, tenant?: Tenant | null) {
    const tenantIds = [assessment.tenant?.id, assessment.course?.tenant?.id].filter((value): value is number => Number.isInteger(value));
    return tenant ? tenantIds.length > 0 && tenantIds.every((value) => value === tenant.id) : tenantIds.length === 0;
  }

  private publicCourseAssessment(assessment: CourseAssessment) {
    return {
      id: assessment.id,
      courseId: assessment.course.id,
      title: assessment.title,
      description: assessment.description,
      type: assessment.type,
      passScore: assessment.passScore,
      maxAttempts: assessment.maxAttempts,
      dueAt: assessment.dueAt,
      allowLateSubmission: assessment.allowLateSubmission,
      status: assessment.status,
      sortOrder: assessment.sortOrder,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt
    };
  }

  private publicCourseAssessmentAttempt(attempt: CourseAssessmentAttempt) {
    return {
      id: attempt.id,
      attemptNo: attempt.attemptNo,
      status: attempt.status,
      objectiveScore: attempt.objectiveScore,
      manualScore: attempt.manualScore,
      totalScore: attempt.totalScore,
      submittedAt: attempt.submittedAt,
      reviewedAt: attempt.reviewedAt,
      reviewRemark: attempt.reviewRemark,
      lateSubmission: attempt.lateSubmission,
      createdAt: attempt.createdAt,
      updatedAt: attempt.updatedAt
    };
  }

  private publicCourseAssessmentAnswer(answer?: CourseAssessmentAnswer | null) {
    if (!answer) return null;
    return {
      id: answer.id,
      questionId: answer.questionId,
      answer: answer.answer,
      essayAnswer: answer.essayAnswer,
      correct: answer.correct,
      score: answer.score,
      feedback: answer.feedback,
      createdAt: answer.createdAt,
      updatedAt: answer.updatedAt
    };
  }

  private publicCourseQuestion(question: CourseQuestion, reviewed: boolean) {
    return {
      id: question.id,
      type: question.type,
      stem: question.stem,
      options: question.options,
      score: question.score,
      sortOrder: question.sortOrder,
      correctAnswer: reviewed ? question.correctAnswer : undefined,
      explanation: reviewed ? question.explanation : undefined
    };
  }

  private publicCourseAnnouncement(announcement: CourseAnnouncement) {
    return {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      publishAt: announcement.publishAt,
      expiresAt: announcement.expiresAt,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt
    };
  }

  private publicCourseReview(review: CourseReview) {
    return {
      id: review.id,
      rating: review.rating,
      content: review.content,
      images: review.images || [],
      status: review.status,
      reply: review.reply,
      repliedAt: review.repliedAt,
      moderationReason: review.moderationReason,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    };
  }

  private publicCourseQa(qa: CourseQa) {
    return {
      id: qa.id,
      lessonId: qa.lessonId,
      title: qa.title,
      content: qa.content,
      status: qa.status,
      answer: qa.answer,
      answeredAt: qa.answeredAt,
      featured: qa.featured,
      createdAt: qa.createdAt,
      updatedAt: qa.updatedAt
    };
  }

  private publicCourseRefund(refund: CourseRefund) {
    return {
      id: refund.id,
      refundNo: refund.refundNo,
      amountFen: Number(refund.amountFen || 0),
      reason: refund.reason,
      status: refund.status,
      reviewRemark: refund.reviewRemark,
      reviewedAt: refund.reviewedAt,
      completedAt: refund.completedAt,
      failureReason: refund.failureReason,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt
    };
  }

  private publicLearning(learning?: UserLearning | null) {
    if (!learning) return null;
    return { id: learning.id, lessonId: learning.lessonId, progress: learning.progress, completedAt: learning.completedAt, createdAt: learning.createdAt, updatedAt: learning.updatedAt };
  }

  private publicIssuedCertificate(certificate?: Certificate | null) {
    if (!certificate) return null;
    return {
      id: certificate.id,
      name: certificate.name,
      certificateNo: certificate.certificateNo,
      certificateVersion: certificate.certificateVersion,
      templateKey: certificate.templateKey,
      imageUrl: certificate.imageUrl,
      threshold: certificate.threshold,
      status: certificate.status,
      issuedAt: certificate.issuedAt,
      revokedAt: certificate.revokedAt
    };
  }

  private publicCommunityComment(comment: CommunityPostComment, user?: User | null) {
    return { id: comment.id, postId: comment.postId, parentId: comment.parentId, author: user ? { nickname: this.publicDisplayName(user.nickname, user.id), avatarUrl: user.avatarUrl } : { nickname: "会员", avatarUrl: null }, content: comment.content, status: comment.status, createdAt: comment.createdAt, updatedAt: comment.updatedAt };
  }

  private publicCommunityReport(report: CommunityContentReport) {
    return { id: report.id, targetType: report.targetType, targetId: report.targetId, type: report.type, description: report.description, status: report.status, createdAt: report.createdAt, updatedAt: report.updatedAt };
  }

  private publicForumCategory(category: ForumCategory) {
    return { id: category.id, name: category.name, description: category.description, sortOrder: category.sortOrder, postPermission: category.postPermission, auditMode: category.auditMode };
  }

  private publicDisplayName(value: unknown, userId: number) {
    const name = String(value || "").trim();
    if (/^1\d{10}$/.test(name)) return `${name.slice(0, 3)}****${name.slice(-4)}`;
    return name || `用户${userId}`;
  }

  private publicCourseListView(item: Course) {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      coverUrl: item.coverUrl,
      teacherName: item.teacherName,
      teacherAvatar: item.teacherAvatar,
      categoryId: item.categoryId,
      categoryName: tags[0] || null,
      price: item.price,
      originalPrice: item.originalPrice,
      accessMode: item.accessMode,
      rating: item.rating,
      reviewCount: item.reviewCount,
      hotCount: item.hotCount,
      tags,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  private publicCommunityActivity(activity: CommunityActivity) {
    return {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      startTime: activity.startTime,
      endTime: activity.endTime,
      joinMode: activity.joinMode,
      memberLimit: activity.memberLimit,
      location: activity.location,
      coverUrl: activity.coverUrl,
      registeredCount: activity.registeredCount,
      status: activity.status
    };
  }

  private publicCommunityMembership(membership: CommunityActivityMember) {
    return {
      id: membership.id,
      activityId: membership.activityId,
      status: membership.status,
      applyRemark: membership.applyRemark,
      reviewRemark: membership.reviewRemark,
      reviewedAt: membership.reviewedAt,
      joinedAt: membership.joinedAt,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt
    };
  }

  private publicCheckinTask(task: CheckInTask) {
    return {
      id: task.id,
      activityId: task.activityId,
      date: this.dateOnly(task.date),
      title: task.title,
      description: task.description,
      completedCount: task.completedCount,
      enabled: task.enabled,
      checkinType: task.checkinType,
      questions: task.questions,
      requireApproval: task.requireApproval,
      allowMakeup: task.allowMakeup,
      makeupWithinDays: task.makeupWithinDays
    };
  }

  private publicCommunityCheckin(checkin: CommunityCheckIn) {
    return {
      id: checkin.id,
      taskId: checkin.taskId,
      activityId: checkin.activityId,
      date: this.dateOnly(checkin.date),
      content: checkin.content,
      images: checkin.images,
      answers: checkin.answers,
      locationName: checkin.locationName,
      latitude: checkin.latitude,
      longitude: checkin.longitude,
      status: checkin.status,
      makeup: checkin.makeup,
      reviewRemark: checkin.reviewRemark,
      reviewedAt: checkin.reviewedAt,
      createdAt: checkin.createdAt
    };
  }

  private publicContentSanction(sanction: ContentUserSanction) {
    return {
      id: sanction.id,
      scope: sanction.scope,
      type: sanction.type,
      status: sanction.status,
      reason: sanction.reason,
      sourceType: sanction.sourceType,
      sourceId: sanction.sourceId,
      startsAt: sanction.startsAt,
      endsAt: sanction.endsAt,
      revokedAt: sanction.revokedAt,
      revokeRemark: sanction.revokeRemark,
      createdAt: sanction.createdAt,
      updatedAt: sanction.updatedAt
    };
  }

  private publicContentAppeal(appeal: ContentAppeal) {
    return {
      id: appeal.id,
      sanctionId: appeal.sanction?.id || null,
      targetType: appeal.targetType,
      targetId: appeal.targetId,
      reason: appeal.reason,
      evidenceUrls: appeal.evidenceUrls || [],
      status: appeal.status,
      handleRemark: appeal.handleRemark,
      handledAt: appeal.handledAt,
      createdAt: appeal.createdAt,
      updatedAt: appeal.updatedAt
    };
  }

  private publicCommunityNotification(notification: CommunityNotification) {
    return {
      id: notification.id,
      type: notification.type,
      postId: notification.postId,
      commentId: notification.commentId,
      title: notification.title,
      content: notification.content,
      readAt: notification.readAt,
      createdAt: notification.createdAt
    };
  }

  private applyTenantOrGlobalScope(builder: ReturnType<Repository<CommunityPost>["createQueryBuilder"]>, tenant?: Tenant | null) {
    if (tenant) builder.andWhere("(post.tenantId = :tenantId OR post.tenantId IS NULL)", { tenantId: tenant.id });
    return builder;
  }

  private findVisibleApprovedPost(id: number, tenant?: Tenant | null) {
    const builder = this.communityPosts
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.activity", "activity")
      .leftJoinAndSelect("post.tenant", "tenant")
      .where("post.id = :id", { id })
      .andWhere("post.visible = :visible", { visible: true })
      .andWhere("post.status = :status", { status: APPROVED_COMMUNITY_POST_STATUS });
    builder.andWhere("post.deletedAt IS NULL");
    return this.applyTenantOrGlobalScope(builder, tenant).getOne();
  }

  private featureGateContext(req: any, tenantCode?: string) {
    const headerCode = req.headers?.["x-tenant-code"];
    const host = req.headers?.["x-forwarded-host"] || req.headers?.host || null;
    return {
      tenantCode: tenantCode || (typeof headerCode === "string" ? headerCode : Array.isArray(headerCode) ? headerCode[0] : null),
      host: typeof host === "string" ? host : null
    };
  }

  private assertForumEnabled(req: any, tenantCode?: string) {
    return this.publicService.assertFeatureGateEnabled(this.featureGateContext(req, tenantCode), "forum", "论坛暂未开放");
  }

  private assertCommunityEnabled(req: any, tenantCode?: string) {
    return this.publicService.assertFeatureGateEnabled(this.featureGateContext(req, tenantCode), "community", "共修暂未开放");
  }

  private async assertForumPostEnabled(req: any, tenantCode?: string) {
    await this.assertForumEnabled(req, tenantCode);
    await this.publicService.assertFeatureGateEnabled(this.featureGateContext(req, tenantCode), "forumPost", "论坛发帖暂未开放");
  }

  private async resolveTenant(req: any, tenantCode?: string): Promise<Tenant | null> {
    const headerCode = req.headers?.["x-tenant-code"];
    const code = normalizeTenantCode(tenantCode || (typeof headerCode === "string" ? headerCode : Array.isArray(headerCode) ? headerCode[0] : null));
    if (code) {
      const tenant = await this.tenants.findOne({ where: { code, enabled: true } });
      if (!tenant) throw new NotFoundException("机构不存在或已停用");
      return tenant;
    }
    const host = normalizeTenantHost(req.headers?.["x-forwarded-host"] || req.headers?.host || null);
    if (!host) return null;
    return this.tenants
      .createQueryBuilder("tenant")
      .where("tenant.enabled = :enabled", { enabled: true })
      .andWhere("JSON_EXTRACT(tenant.settings, '$.domain') = :host OR JSON_EXTRACT(tenant.settings, '$.h5Domain') = :host", { host })
      .getOne();
  }
}
