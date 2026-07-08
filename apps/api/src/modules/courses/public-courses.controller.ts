import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Query, Req, UnauthorizedException, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { InjectRepository } from "@nestjs/typeorm";
import { mkdirSync, unlinkSync } from "fs";
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
import { ForumCategory } from "../../entities/forum-category.entity";
import { ForumFavorite } from "../../entities/forum-favorite.entity";
import { ForumNotification } from "../../entities/forum-notification.entity";
import { ForumReply } from "../../entities/forum-reply.entity";
import { ForumReport } from "../../entities/forum-report.entity";
import { ForumTopic } from "../../entities/forum-topic.entity";
import { ForumViewLog } from "../../entities/forum-view-log.entity";
import { Order } from "../../entities/order.entity";
import { Registration } from "../../entities/registration.entity";
import { UserLearning } from "../../entities/user-learning.entity";
import { Tenant } from "../../entities/tenant.entity";
import { OrderStatus, RegistrationStatus } from "../../shared/domain";
import { normalizeTenantCode, normalizeTenantHost } from "../../shared/tenant-scope";
import { PublicService } from "../public/public.service";

const COMMUNITY_IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "application/octet-stream": ".jpg"
};
const COMMUNITY_POST_UPLOAD_DIR = join(process.cwd(), process.env.UPLOAD_DIR || "uploads", "community-posts");
mkdirSync(COMMUNITY_POST_UPLOAD_DIR, { recursive: true });
const APPROVED_COMMUNITY_POST_STATUS = "approved" as CommunityPostStatus;

function communityImageExtension(file: Express.Multer.File) {
  const mime = String(file?.mimetype || "").toLowerCase();
  if (COMMUNITY_IMAGE_EXTENSION_BY_MIME[mime]) return COMMUNITY_IMAGE_EXTENSION_BY_MIME[mime];
  const ext = String(file?.originalname || "").toLowerCase().match(/\.(jpe?g|png|webp|heic|heif)$/)?.[0];
  if (!ext) return "";
  return ext === ".jpeg" ? ".jpg" : ext;
}

function isCommunityImageFile(file: Express.Multer.File) {
  if (communityImageExtension(file)) return true;
  const name = String(file?.originalname || "").toLowerCase();
  const field = String(file?.fieldname || "").toLowerCase();
  return Boolean(name.match(/\.(jpe?g|png|webp|heic|heif)$/) || (field === "file" && String(file?.mimetype || "").toLowerCase().startsWith("image/")));
}

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
    @InjectRepository(ForumCategory) private forumCategories: Repository<ForumCategory>,
    @InjectRepository(ForumTopic) private forumTopics: Repository<ForumTopic>,
    @InjectRepository(ForumReply) private forumReplies: Repository<ForumReply>,
    @InjectRepository(ForumReport) private forumReports: Repository<ForumReport>,
    @InjectRepository(ForumFavorite) private forumFavorites: Repository<ForumFavorite>,
    @InjectRepository(ForumViewLog) private forumViewLogs: Repository<ForumViewLog>,
    @InjectRepository(ForumNotification) private forumNotifications: Repository<ForumNotification>,
    @InjectRepository(Registration) private registrations: Repository<Registration>,
    @InjectRepository(UserLearning) private userLearning: Repository<UserLearning>,
    private readonly config: ConfigService,
    private readonly publicService: PublicService
  ) {}

  @Get("courses")
  async listCourses(@Query() q: { category?: string; sort?: string; tenantCode?: string }, @Req() req: any) {
    await this.publicService.assertFeatureGateEnabled(this.featureGateContext(req, q.tenantCode), "courses", "专题/课程暂未开放");
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
    await this.publicService.assertFeatureGateEnabled(this.featureGateContext(req, tenantCode), "courses", "专题/课程暂未开放");
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
    await this.publicService.assertFeatureGateEnabled(this.featureGateContext(req, tenantCode), "courses", "专题/课程暂未开放");
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
    await this.publicService.assertFeatureGateEnabled(this.featureGateContext(req, tenantCode), "courses", "专题/课程暂未开放");
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
    await this.assertCommunityEnabled(req, tenantCode);
    const tenant = await this.resolveTenant(req, tenantCode);
    const items = await this.communityActivities.find({ where: this.tenantWhere({ status: "published" }, tenant), order: { startTime: "ASC" }, take: 10 });
    return items;
  }

  @Get("community/posts")
  async listPosts(@Req() req: any, @Query("tenantCode") tenantCode?: string, @Query("activityId") activityId?: string) {
    await this.assertCommunityEnabled(req, tenantCode);
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
    await this.assertCommunityPublishEnabled(req, tenantCode);
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    return this.postableActivities(userId, tenant);
  }

  @Get("me/community/posts")
  async listMyPosts(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertCommunityEnabled(req, tenantCode);
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
        const suffix = communityImageExtension(file) || ".jpg";
        callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${suffix}`);
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, isCommunityImageFile(file));
    }
  }))
  async uploadCommunityPostImage(@UploadedFile() file: Express.Multer.File, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    this.requireUserId(req.headers?.authorization);
    try {
      await this.assertCommunityPublishEnabled(req, tenantCode);
    } catch (error) {
      this.removeUploadedFile(file);
      throw error;
    }
    if (!file) throw new BadRequestException("请上传 JPG、PNG 或 WebP 图片");
    const path = `/uploads/community-posts/${file.filename}`;
    return { url: path, path };
  }

  @Post("community/posts")
  async createParticipantPost(@Body() dto: { activityId?: number; content?: string; images?: string[]; city?: string; tags?: string[]; posterConfig?: Record<string, unknown> }, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertCommunityPublishEnabled(req, tenantCode);
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
    await this.assertCommunityEnabled(req, tenantCode);
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
    await this.assertCommunityEnabled(req, tenantCode);
    const userId = this.optionalUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const post = await this.findVisibleApprovedPost(id, tenant);
    if (!post) return null;
    const liked = userId ? await this.communityPostLikes.findOne({ where: { postId: id, userId } }) : null;
    return this.postView(post, { liked: Boolean(liked) });
  }

  @Post("community/posts/:id/like")
  async togglePostLike(@Param("id", ParseIntPipe) id: number, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertCommunityEnabled(req, tenantCode);
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
    await this.assertCommunityEnabled(req, tenantCode);
    const tenant = await this.resolveTenant(req, tenantCode);
    const post = await this.findVisibleApprovedPost(id, tenant);
    if (!post) throw new NotFoundException("动态不存在或已下架");
    return this.communityPostComments.find({ where: { postId: id, status: "approved" }, order: { createdAt: "ASC" }, take: 50 });
  }

  @Post("community/posts/:id/comments")
  async createPostComment(@Param("id", ParseIntPipe) id: number, @Body() dto: { content?: string }, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertCommunityEnabled(req, tenantCode);
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
    const rows = await builder.getMany();
    if (rows.length) return rows;
    return [await this.ensurePublicDefaultForumCategory(tenant)];
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
    const category = await this.resolvePublicForumCategory(dto.categoryId, tenant);
    if (category.postPermission === "admin" || category.auditMode === "closed") throw new BadRequestException("当前版块暂不开放用户发帖");
    const title = this.requiredText(dto.title, 2, 120, "请填写帖子标题");
    const content = this.requiredText(dto.content, 2, 10000, "请填写帖子内容");
    const approved = category.auditMode === "post";
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
    return this.createForumReplyRow(topic, null, userId, dto);
  }

  @Post("forum/replies/:id/replies")
  async createForumChildReply(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertForumPostEnabled(req, tenantCode);
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const parent = await this.forumReplies.findOne({ where: { id, status: "approved" }, relations: ["topic", "parent"], loadEagerRelations: false });
    if (!parent || !parent.topic || !(await this.findPublicForumTopic(parent.topic.id, tenant))) throw new NotFoundException("回复不存在或未通过审核");
    const rootParent = parent.depth >= 2 && parent.parent ? parent.parent : parent;
    return this.createForumReplyRow(parent.topic, rootParent, userId, dto);
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
    return builder.getMany();
  }

  @Get("me/forum/favorites")
  async listMyForumFavorites(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertForumEnabled(req, tenantCode);
    const userId = this.requireUserId(req.headers?.authorization);
    const tenant = await this.resolveTenant(req, tenantCode);
    const rows = await this.forumFavorites.find({ where: { user: { id: userId } }, order: { createdAt: "DESC" }, take: 50 });
    return rows.filter((row) => !tenant || !row.topic.tenant || row.topic.tenant.id === tenant.id).map((row) => ({ ...row, topic: this.forumTopicView(row.topic, { favorited: true }) }));
  }

  @Get("checkin/today")
  async getTodayCheckin(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    await this.assertCommunityPublishEnabled(req, tenantCode);
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
    await this.assertCommunityPublishEnabled(req, tenantCode);
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

  private applyTenantOrGlobalAliasScope(builder: any, alias: string, tenant?: Tenant | null) {
    if (tenant) builder.andWhere(`(${alias}.tenantId = :tenantId OR ${alias}.tenantId IS NULL)`, { tenantId: tenant.id });
    return builder;
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
    const content = this.requiredText(dto.content, 1, 5000, "请输入回复内容");
    const approved = topic.category?.auditMode === "post";
    const reply = await this.forumReplies.save(this.forumReplies.create({
      tenant: topic.tenant || null,
      topic,
      parent,
      depth: parent ? 2 : 1,
      userId,
      content,
      images: this.normalizeForumImages(dto.images),
      authorRole: topic.userId === userId ? "author" : "user",
      status: approved ? "approved" : "pending",
      approvedAt: approved ? new Date() : null
    }));
    if (approved) {
      topic.replyCount = Number(topic.replyCount || 0) + 1;
      topic.lastReplyAt = new Date();
      topic.heat = Number(topic.viewCount || 0) + Number(topic.replyCount || 0) * 5 + Number(topic.favoriteCount || 0) * 3;
      await this.forumTopics.save(topic);
      await this.createForumReplyNotifications(topic, reply, parent, userId);
    }
    return { reply, message: approved ? "回复已发布" : "回复已提交审核，通过后展示" };
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
      author: topic.user ? { id: topic.user.id, nickname: topic.user.nickname || topic.user.phone || `用户${topic.user.id}`, avatarUrl: topic.user.avatarUrl } : { id: topic.userId, nickname: topic.userId ? `用户${topic.userId}` : "平台运营", avatarUrl: null },
      title: topic.title,
      content: topic.content,
      images: topic.images || [],
      tags: topic.tags || [],
      activity: topic.activity ? { id: topic.activity.id, title: topic.activity.title } : null,
      course: topic.course ? { id: topic.course.id, title: topic.course.title } : null,
      charityProject: topic.charityProject ? { id: topic.charityProject.id, title: topic.charityProject.title } : null,
      pinned: topic.pinned,
      featured: topic.featured,
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
      userId: reply.userId,
      author: reply.user ? { id: reply.user.id, nickname: reply.user.nickname || reply.user.phone || `用户${reply.user.id}`, avatarUrl: reply.user.avatarUrl } : { id: reply.userId, nickname: reply.userId ? `用户${reply.userId}` : "平台运营", avatarUrl: null },
      content: reply.content,
      images: reply.images || [],
      authorRole: reply.authorRole,
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

  private async assertForumPostEnabled(req: any, tenantCode?: string) {
    await this.assertForumEnabled(req, tenantCode);
    await this.publicService.assertFeatureGateEnabled(this.featureGateContext(req, tenantCode), "forumPost", "论坛发帖暂未开放");
  }

  private assertCommunityEnabled(req: any, tenantCode?: string) {
    return this.publicService.assertFeatureGateEnabled(this.featureGateContext(req, tenantCode), "community", "共修动态暂未开放");
  }

  private async assertCommunityPublishEnabled(req: any, tenantCode?: string) {
    await this.assertCommunityEnabled(req, tenantCode);
    await this.publicService.assertFeatureGateEnabled(this.featureGateContext(req, tenantCode), "communityPublish", "发布心得/打卡暂未开放");
  }

  private removeUploadedFile(file?: Express.Multer.File) {
    if (!file?.path) return;
    try {
      unlinkSync(file.path);
    } catch {
      // Best effort cleanup for uploads rejected by feature gates.
    }
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
