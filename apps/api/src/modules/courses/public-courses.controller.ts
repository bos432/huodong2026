import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, Repository } from "typeorm";
import { createHmac } from "crypto";
import { Course } from "../../entities/course.entity";
import { CourseChapter } from "../../entities/course-chapter.entity";
import { CourseLesson } from "../../entities/course-lesson.entity";
import { CommunityActivity } from "../../entities/community-activity.entity";
import { CommunityPost } from "../../entities/community-post.entity";
import { CommunityPostComment } from "../../entities/community-post-comment.entity";
import { CommunityPostLike } from "../../entities/community-post-like.entity";
import { CheckInTask } from "../../entities/checkin-task.entity";
import { CommunityCheckIn } from "../../entities/community-checkin.entity";
import { UserLearning } from "../../entities/user-learning.entity";
import { Tenant } from "../../entities/tenant.entity";
import { normalizeTenantCode, normalizeTenantHost } from "../../shared/tenant-scope";

@Controller("public")
export class PublicCoursesController {
  constructor(
    @InjectRepository(Tenant) private tenants: Repository<Tenant>,
    @InjectRepository(Course) private courses: Repository<Course>,
    @InjectRepository(CourseChapter) private chapters: Repository<CourseChapter>,
    @InjectRepository(CourseLesson) private lessons: Repository<CourseLesson>,
    @InjectRepository(CommunityActivity) private communityActivities: Repository<CommunityActivity>,
    @InjectRepository(CommunityPost) private communityPosts: Repository<CommunityPost>,
    @InjectRepository(CommunityPostLike) private communityPostLikes: Repository<CommunityPostLike>,
    @InjectRepository(CommunityPostComment) private communityPostComments: Repository<CommunityPostComment>,
    @InjectRepository(CheckInTask) private checkinTasks: Repository<CheckInTask>,
    @InjectRepository(CommunityCheckIn) private communityCheckins: Repository<CommunityCheckIn>,
    @InjectRepository(UserLearning) private userLearning: Repository<UserLearning>,
    private readonly config: ConfigService
  ) {}

  @Get("courses")
  async listCourses(@Query() q: { category?: string; sort?: string; tenantCode?: string }, @Req() req: any) {
    const tenant = await this.resolveTenant(req, q.tenantCode);
    const where: any = { status: "published" };
    if (tenant) where.tenant = { id: tenant.id };
    if (q.category && q.category !== "all") {
      // Simplified category filter - actual implementation should join categories table
    }
    let rows = await this.courses.find({ where, order: { sortOrder: "ASC", createdAt: "DESC" } });
    if (q.sort === "hottest") rows = rows.sort((a,b) => b.hotCount - a.hotCount);
    if (q.sort === "price") rows = rows.sort((a,b) => a.price - b.price);
    return rows;
  }

  @Get("courses/:id")
  async getCourse(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const tenant = await this.resolveTenant(req, tenantCode);
    const course = await this.courses.findOne({ where: this.tenantWhere({ id, status: "published" }, tenant) });
    if (!course) return null;
    const chapters = await this.chapters.find({ where: { courseId: id }, order: { sortOrder: "ASC" } });
    const chapterIds = chapters.map(c => c.id);
    const lessons = chapterIds.length ? await this.lessons.find({ where: chapterIds.map(id => ({ chapterId: id })), order: { sortOrder: "ASC" } }) : [];
    return { ...course, chapters: chapters.map(ch => ({ ...ch, lessons: lessons.filter(l => l.chapterId === ch.id) })) };
  }

  @Get("courses/:id/player")
  async getCoursePlayer(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const course = await this.courses.findOne({ where: this.tenantWhere({ id, status: "published" }, tenant) });
    if (!course) return null;
    const chapters = await this.chapters.find({ where: { courseId: id }, order: { sortOrder: "ASC" } });
    const chapterIds = chapters.map((chapter) => chapter.id);
    const lessons = chapterIds.length ? await this.lessons.find({ where: chapterIds.map((chapterId) => ({ chapterId })), order: { sortOrder: "ASC" } }) : [];
    const owned = await this.hasCourseAccess(userId, id);
    const canPlayCourse = owned || Number(course.price || 0) <= 0;
    const playableLessons = lessons.filter((lesson) => canPlayCourse || lesson.isFree);
    if (!playableLessons.length && !owned) throw new BadRequestException("请先购买课程，后台确认收款后再学习");
    const learningRows = lessons.length ? await this.userLearning.find({ where: { userId, courseId: id, lessonId: In(lessons.map((lesson) => lesson.id)) } }) : [];
    return {
      ...course,
      owned,
      chapters: chapters.map((chapter) => ({
        ...chapter,
        lessons: lessons
          .filter((lesson) => lesson.chapterId === chapter.id)
          .map((lesson) => ({
            ...lesson,
            progress: Number(learningRows.find((row) => row.lessonId === lesson.id)?.progress || 0),
            locked: !(canPlayCourse || lesson.isFree)
          }))
      }))
    };
  }

  @Post("courses/:id/progress")
  async updateCourseProgress(@Param("id", ParseIntPipe) id: number, @Body() dto: { lessonId?: number; progress?: number }, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const course = await this.courses.findOne({ where: this.tenantWhere({ id, status: "published" }, tenant) });
    if (!course) throw new BadRequestException("课程不存在或未发布");
    const lessonId = Number(dto.lessonId || 0);
    const progress = Math.max(0, Math.min(Number(dto.progress || 0), 100));
    if (lessonId > 0) {
      const lesson = await this.lessons
        .createQueryBuilder("lesson")
        .innerJoin(CourseChapter, "chapter", "chapter.id = lesson.chapterId")
        .where("lesson.id = :lessonId", { lessonId })
        .andWhere("chapter.courseId = :courseId", { courseId: id })
        .getOne();
      if (!lesson) throw new BadRequestException("课时不存在");
    }
    if (!(await this.hasCourseAccess(userId, id)) && Number(course.price || 0) > 0) throw new BadRequestException("请先购买课程，后台确认收款后再学习");
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
    const courseRow = await this.saveLearning(userId, id, 0, totalProgress);
    return { courseLearning: courseRow, lessonLearning: lessonRow };
  }

  @Get("community/activities")
  async listActivities(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const tenant = await this.resolveTenant(req, tenantCode);
    const items = await this.communityActivities.find({ where: this.tenantWhere({ status: "published" }, tenant), order: { startTime: "ASC" }, take: 10 });
    return items;
  }

  @Get("community/posts")
  async listPosts(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.optionalUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const items = await this.communityPosts.find({ where: this.tenantWhere({ visible: true }, tenant), order: { createdAt: "DESC" }, take: 20 });
    const ids = items.map((item) => item.id);
    const likedRows = userId && ids.length ? await this.communityPostLikes.find({ where: { userId, postId: In(ids) } }) : [];
    return items.map((item) => ({
      ...item,
      liked: likedRows.some((row) => row.postId === item.id)
    }));
  }

  @Get("community/posts/:id")
  async getPost(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.optionalUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const post = await this.communityPosts.findOne({ where: this.tenantWhere({ id, visible: true }, tenant) });
    if (!post) return null;
    const liked = userId ? await this.communityPostLikes.findOne({ where: { postId: id, userId } }) : null;
    return {
      ...post,
      liked: Boolean(liked)
    };
  }

  @Post("community/posts/:id/like")
  async togglePostLike(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const post = await this.communityPosts.findOne({ where: this.tenantWhere({ id, visible: true }, tenant) });
    if (!post) throw new BadRequestException("动态不存在或已下架");
    const row = await this.communityPostLikes.findOne({ where: { postId: id, userId } });
    if (row) {
      await this.communityPostLikes.delete(row.id);
      post.likes = Math.max(0, Number(post.likes || 0) - 1);
      await this.communityPosts.save(post);
      return { liked: false, likes: post.likes };
    }
    try {
      await this.communityPostLikes.save(this.communityPostLikes.create({ postId: id, userId }));
      post.likes = Number(post.likes || 0) + 1;
      await this.communityPosts.save(post);
    } catch (error: any) {
      if (!this.isDuplicateKeyError(error)) throw error;
    }
    return { liked: true, likes: post.likes };
  }

  @Get("community/posts/:id/comments")
  async listPostComments(@Param("id", ParseIntPipe) id: number) {
    return this.communityPostComments.find({ where: { postId: id, status: "approved" }, order: { createdAt: "ASC" }, take: 50 });
  }

  @Post("community/posts/:id/comments")
  async createPostComment(@Param("id", ParseIntPipe) id: number, @Body() dto: { content?: string }, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const post = await this.communityPosts.findOne({ where: this.tenantWhere({ id, visible: true }, tenant) });
    if (!post) throw new BadRequestException("动态不存在或已下架");
    const content = String(dto.content || "").trim();
    if (!content) throw new BadRequestException("请输入评论内容");
    if (content.length > 300) throw new BadRequestException("评论不能超过 300 个字");
    const comment = await this.communityPostComments.save(this.communityPostComments.create({ postId: id, userId, content, status: "pending" }));
    return { comment, message: "评论已提交，审核通过后展示" };
  }

  @Get("checkin/today")
  async getTodayCheckin(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const today = this.today();
    const tenant = await this.resolveTenant(req, tenantCode);
    const task = await this.checkinTasks.findOne({ where: this.tenantWhere({ date: today, enabled: true }, tenant) });
    if (!task) return null;
    const userId = this.optionalUserId(req.headers?.authorization);
    const monthStart = `${today.slice(0, 7)}-01`;
    const monthEnd = `${today.slice(0, 7)}-31`;
    const rows = userId
      ? await this.communityCheckins.find({ where: this.tenantWhere({ userId, date: Between(monthStart, monthEnd) }, tenant), order: { date: "ASC" } })
      : [];
    const checkedToday = Boolean(userId && rows.some((row) => row.date === today));
    return {
      ...task,
      checkedToday,
      checkedDates: rows.map((row) => row.date),
      checkedDays: rows.map((row) => Number(row.date.slice(8, 10))).filter((day) => Number.isFinite(day)),
      today
    };
  }

  @Post("checkin/today/complete")
  async completeTodayCheckin(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const today = this.today();
    const tenant = await this.resolveTenant(req, tenantCode);
    const task = await this.checkinTasks.findOne({ where: this.tenantWhere({ date: today, enabled: true }, tenant) });
    if (!task) return { checkedToday: false, message: "暂无今日打卡任务", today };
    let row = await this.communityCheckins.findOne({ where: this.tenantWhere({ userId, date: today }, tenant) });
    if (!row) {
      try {
        row = await this.communityCheckins.save(this.communityCheckins.create({ userId, taskId: task.id, date: today, tenant }));
        task.completedCount = Number(task.completedCount || 0) + 1;
        await this.checkinTasks.save(task);
      } catch (error: any) {
        if (!this.isDuplicateKeyError(error)) throw error;
        row = await this.communityCheckins.findOne({ where: this.tenantWhere({ userId, date: today }, tenant) });
      }
    }
    return { checkedToday: true, checkin: row, task, today };
  }

  private async hasCourseAccess(userId: number, courseId: number) {
    const count = await this.userLearning.count({ where: { userId, courseId, lessonId: 0 } });
    return count > 0;
  }

  private async saveLearning(userId: number, courseId: number, lessonId: number, progress: number) {
    let row = await this.userLearning.findOne({ where: { userId, courseId, lessonId } });
    if (!row) row = this.userLearning.create({ userId, courseId, lessonId, progress: 0, completedAt: null });
    row.progress = Number(progress.toFixed(2));
    row.completedAt = progress >= 100 ? row.completedAt || new Date() : null;
    return this.userLearning.save(row);
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
    return tenant ? { ...where, tenant: { id: tenant.id } } : where;
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
