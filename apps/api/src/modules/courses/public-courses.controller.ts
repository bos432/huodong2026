import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Query, Req, UnauthorizedException, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { InjectRepository } from "@nestjs/typeorm";
import { mkdirSync } from "fs";
import { diskStorage } from "multer";
import { join } from "path";
import { In, Repository } from "typeorm";
import { createHmac } from "crypto";
import { Course } from "../../entities/course.entity";
import { CourseChapter } from "../../entities/course-chapter.entity";
import { CourseLesson } from "../../entities/course-lesson.entity";
import { CommunityActivity } from "../../entities/community-activity.entity";
import { CommunityPost, type CommunityPostStatus } from "../../entities/community-post.entity";
import { CommunityPostComment } from "../../entities/community-post-comment.entity";
import { CommunityPostLike } from "../../entities/community-post-like.entity";
import { CheckInTask } from "../../entities/checkin-task.entity";
import { CommunityCheckIn } from "../../entities/community-checkin.entity";
import { Order } from "../../entities/order.entity";
import { Registration } from "../../entities/registration.entity";
import { UserLearning } from "../../entities/user-learning.entity";
import { Tenant } from "../../entities/tenant.entity";
import { OrderStatus, RegistrationStatus } from "../../shared/domain";
import { normalizeTenantCode, normalizeTenantHost } from "../../shared/tenant-scope";

const COMMUNITY_IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};
const COMMUNITY_POST_UPLOAD_DIR = join(process.cwd(), process.env.UPLOAD_DIR || "uploads", "community-posts");
mkdirSync(COMMUNITY_POST_UPLOAD_DIR, { recursive: true });
const APPROVED_COMMUNITY_POST_STATUS = "approved" as CommunityPostStatus;

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
    @InjectRepository(Registration) private registrations: Repository<Registration>,
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
  async listPosts(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("activityId") activityId?: string) {
    const userId = this.optionalUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const where: any = this.tenantWhere({ visible: true, status: "approved" }, tenant);
    if (activityId) where.activityId = Number(activityId);
    const items = await this.communityPosts.find({ where, order: { createdAt: "DESC" }, take: 20 });
    const ids = items.map((item) => item.id);
    const likedRows = userId && ids.length ? await this.communityPostLikes.find({ where: { userId, postId: In(ids) } }) : [];
    return items.map((item) => this.postView(item, {
      liked: likedRows.some((row) => row.postId === item.id)
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
      .orderBy("post.createdAt", "DESC")
      .take(50);
    this.applyTenantOrGlobalScope(builder, tenant);
    const rows = await builder.getMany();
    return rows.map((item) => this.postView(item, { liked: false }));
  }

  @Post("me/community/post-images")
  @UseInterceptors(FileInterceptor("file", {
    storage: diskStorage({
      destination: COMMUNITY_POST_UPLOAD_DIR,
      filename: (_req, file, callback) => {
        const suffix = COMMUNITY_IMAGE_EXTENSION_BY_MIME[file.mimetype] || ".jpg";
        callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${suffix}`);
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, Boolean(COMMUNITY_IMAGE_EXTENSION_BY_MIME[file.mimetype]));
    }
  }))
  async uploadCommunityPostImage(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    this.requireUserId(req.headers?.authorization);
    if (!file) throw new BadRequestException("请上传 JPG、PNG 或 WebP 图片");
    const path = `/uploads/community-posts/${file.filename}`;
    return { url: path, path };
  }

  @Post("community/posts")
  async createParticipantPost(@Body() dto: { activityId?: number; content?: string; images?: string[]; city?: string; tags?: string[]; posterConfig?: Record<string, unknown> }, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const activityId = Number(dto.activityId || 0);
    if (!activityId) throw new BadRequestException("请选择参加过的活动");
    const activities = await this.postableActivities(userId, tenant);
    const activity = activities.find((item: any) => Number(item.id) === activityId);
    if (!activity) throw new BadRequestException("只有参加过的活动才能发布心得");
    const content = String(dto.content || "").trim();
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

  private postView(item: CommunityPost, extra: { liked: boolean }) {
    return {
      ...item,
      liked: extra.liked,
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
    const liked = userId ? await this.communityPostLikes.findOne({ where: { postId: id, userId } }) : null;
    return this.postView(post, { liked: Boolean(liked) });
  }

  @Post("community/posts/:id/like")
  async togglePostLike(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const post = await this.findVisibleApprovedPost(id, tenant);
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
  async listPostComments(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const tenant = await this.resolveTenant(req, tenantCode);
    const post = await this.findVisibleApprovedPost(id, tenant);
    if (!post) throw new NotFoundException("动态不存在或已下架");
    return this.communityPostComments.find({ where: { postId: id, status: "approved" }, order: { createdAt: "ASC" }, take: 50 });
  }

  @Post("community/posts/:id/comments")
  async createPostComment(@Param("id", ParseIntPipe) id: number, @Body() dto: { content?: string }, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const post = await this.findVisibleApprovedPost(id, tenant);
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
    const task = await this.findTodayCheckinTask(today, tenant);
    if (!task) return null;
    const userId = this.optionalUserId(req.headers?.authorization);
    const monthStart = `${today.slice(0, 7)}-01`;
    const monthEnd = this.monthEndDate(today);
    const rows = userId ? await this.listUserMonthlyCheckins(userId, monthStart, monthEnd, tenant) : [];
    const checkedDates = rows.map((row) => this.dateOnly(row.date)).filter(Boolean);
    const checkedToday = Boolean(userId && checkedDates.includes(today));
    const completedCount = await this.countDailyCheckins(today, tenant);
    return {
      ...task,
      completedCount,
      checkedToday,
      checkedDates,
      checkedDays: checkedDates.map((date) => Number(date.slice(8, 10))).filter((day) => Number.isFinite(day)),
      today
    };
  }

  @Post("checkin/today/complete")
  async completeTodayCheckin(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    const userId = this.requireUserId(req.headers?.authorization);
    const today = this.today();
    const tenant = await this.resolveTenant(req, tenantCode);
    const task = await this.findTodayCheckinTask(today, tenant);
    if (!task) return { checkedToday: false, message: "暂无今日打卡任务", today };
    let row = await this.findUserCheckinByDate(userId, today, tenant);
    if (!row) {
      try {
        row = await this.communityCheckins.save(this.communityCheckins.create({ userId, taskId: task.id, date: today, tenant }));
        task.completedCount = Number(task.completedCount || 0) + 1;
        await this.checkinTasks.save(task);
      } catch (error: any) {
        if (!this.isDuplicateKeyError(error)) throw error;
        row = await this.findUserCheckinByDate(userId, today, tenant);
      }
    }
    const completedCount = await this.countDailyCheckins(today, tenant);
    if (Number(task.completedCount || 0) !== completedCount) {
      task.completedCount = completedCount;
      await this.checkinTasks.save(task);
    }
    return { checkedToday: true, checkin: row, task: { ...task, completedCount }, today };
  }

  private findTodayCheckinTask(date: string, tenant?: Tenant | null) {
    const builder = this.checkinTasks
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.tenant", "tenant")
      .where("task.date = :date", { date })
      .andWhere("task.enabled = :enabled", { enabled: true })
      .orderBy("task.updatedAt", "DESC")
      .addOrderBy("task.id", "DESC");
    if (tenant) builder.andWhere("task.tenantId = :tenantId", { tenantId: tenant.id });
    return builder.getOne();
  }

  private countDailyCheckins(date: string, tenant?: Tenant | null) {
    const builder = this.communityCheckins
      .createQueryBuilder("checkin")
      .where("checkin.date = :date", { date });
    if (tenant) builder.andWhere("checkin.tenantId = :tenantId", { tenantId: tenant.id });
    return builder.getCount();
  }

  private listUserMonthlyCheckins(userId: number, monthStart: string, monthEnd: string, tenant?: Tenant | null) {
    const builder = this.communityCheckins
      .createQueryBuilder("checkin")
      .leftJoinAndSelect("checkin.tenant", "tenant")
      .where("checkin.userId = :userId", { userId })
      .andWhere("checkin.date BETWEEN :monthStart AND :monthEnd", { monthStart, monthEnd })
      .orderBy("checkin.date", "ASC");
    if (tenant) builder.andWhere("checkin.tenantId = :tenantId", { tenantId: tenant.id });
    return builder.getMany();
  }

  private findUserCheckinByDate(userId: number, date: string, tenant?: Tenant | null) {
    const builder = this.communityCheckins
      .createQueryBuilder("checkin")
      .leftJoinAndSelect("checkin.tenant", "tenant")
      .where("checkin.userId = :userId", { userId })
      .andWhere("checkin.date = :date", { date });
    if (tenant) builder.andWhere("checkin.tenantId = :tenantId", { tenantId: tenant.id });
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
    return tenant ? { ...where, tenant: { id: tenant.id } } : where;
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
    return this.applyTenantOrGlobalScope(builder, tenant).getOne();
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
