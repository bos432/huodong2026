import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Course } from "../../entities/course.entity";
import { CourseChapter } from "../../entities/course-chapter.entity";
import { CourseLesson } from "../../entities/course-lesson.entity";
import { CourseOrder, CourseOrderStatus } from "../../entities/course-order.entity";
import { CommunityActivity } from "../../entities/community-activity.entity";
import { CheckInTask } from "../../entities/checkin-task.entity";
import { CommunityPost, CommunityPostStatus } from "../../entities/community-post.entity";
import { CommunityPostComment, CommunityPostCommentStatus } from "../../entities/community-post-comment.entity";
import { CommunityPostLike } from "../../entities/community-post-like.entity";
import { ForumCategory } from "../../entities/forum-category.entity";
import { ForumFavorite } from "../../entities/forum-favorite.entity";
import { ForumNotification } from "../../entities/forum-notification.entity";
import { ForumReply, ForumReplyStatus } from "../../entities/forum-reply.entity";
import { ForumReport, ForumReportStatus } from "../../entities/forum-report.entity";
import { ForumTopic, ForumTopicStatus } from "../../entities/forum-topic.entity";
import { ForumViewLog } from "../../entities/forum-view-log.entity";
import { Tenant } from "../../entities/tenant.entity";
import { UserLearning } from "../../entities/user-learning.entity";
import { PaymentMethod } from "../../shared/domain";
import { applyTenantScopeToQuery, assertTenantAccessForActor, tenantRelationForActor } from "../../shared/tenant-scope";

type AdminContext = { id?: number; username?: string; role?: string; tenantId?: number | null };

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private courses: Repository<Course>,
    @InjectRepository(CourseChapter) private chapters: Repository<CourseChapter>,
    @InjectRepository(CourseLesson) private lessons: Repository<CourseLesson>,
    @InjectRepository(CourseOrder) private courseOrders: Repository<CourseOrder>,
    @InjectRepository(CommunityActivity) private communityActivities: Repository<CommunityActivity>,
    @InjectRepository(CheckInTask) private checkinTasks: Repository<CheckInTask>,
    @InjectRepository(CommunityPost) private communityPosts: Repository<CommunityPost>,
    @InjectRepository(CommunityPostLike) private communityPostLikes: Repository<CommunityPostLike>,
    @InjectRepository(CommunityPostComment) private communityPostComments: Repository<CommunityPostComment>,
    @InjectRepository(ForumCategory) private forumCategories: Repository<ForumCategory>,
    @InjectRepository(ForumTopic) private forumTopics: Repository<ForumTopic>,
    @InjectRepository(ForumReply) private forumReplies: Repository<ForumReply>,
    @InjectRepository(ForumReport) private forumReports: Repository<ForumReport>,
    @InjectRepository(ForumFavorite) private forumFavorites: Repository<ForumFavorite>,
    @InjectRepository(ForumViewLog) private forumViewLogs: Repository<ForumViewLog>,
    @InjectRepository(ForumNotification) private forumNotifications: Repository<ForumNotification>,
    @InjectRepository(Tenant) private tenants: Repository<Tenant>,
    @InjectRepository(UserLearning) private userLearning: Repository<UserLearning>
  ) {}

  // ===== Courses =====
  async listCourses(query: { status?: string; categoryId?: number; tenantId?: string | number }, admin?: AdminContext) {
    const builder = this.courses.createQueryBuilder("course").leftJoinAndSelect("course.tenant", "tenant").orderBy("course.sortOrder", "ASC").addOrderBy("course.createdAt", "DESC");
    applyTenantScopeToQuery(builder, "course", admin);
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
    await this.assignTenant(course, dto, admin);
    return this.courses.save(course);
  }

  async updateCourse(id: number, dto: any, admin?: AdminContext) {
    const course = await this.assertCourseAccess(id, admin);
    Object.assign(course, dto);
    await this.assignTenant(course, dto, admin);
    return this.courses.save(course);
  }

  async deleteCourse(id: number, admin?: AdminContext) {
    await this.assertCourseAccess(id, admin);
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
    await this.assertChapterAccess(Number(dto.chapterId), admin);
    const item = this.lessons.create(dto);
    return this.lessons.save(item);
  }

  async updateCourseLesson(id: number, dto: any, admin?: AdminContext) {
    const lesson = await this.assertLessonAccess(id, admin);
    Object.assign(lesson, dto);
    if (dto.chapterId !== undefined) await this.assertChapterAccess(Number(dto.chapterId), admin);
    return this.lessons.save(lesson);
  }

  async deleteCourseLesson(id: number, admin?: AdminContext) {
    await this.assertLessonAccess(id, admin);
    await this.lessons.delete(id);
    return { success: true };
  }

  // ===== Course Orders =====
  async listCourseOrders(query: { status?: string; courseId?: string | number; keyword?: string; page?: string | number; pageSize?: string | number; tenantId?: string | number }, admin?: AdminContext) {
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.courseOrders
      .createQueryBuilder("courseOrder")
      .leftJoinAndSelect("courseOrder.course", "course")
      .leftJoinAndSelect("course.tenant", "tenant")
      .leftJoinAndSelect("courseOrder.user", "user")
      .orderBy("courseOrder.createdAt", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize);
    applyTenantScopeToQuery(builder, "course", admin);
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
    await this.assignTenant(item, dto, admin);
    return this.communityActivities.save(item);
  }

  async updateCommunityActivity(id: number, dto: any, admin?: AdminContext) {
    const item = await this.assertCommunityActivityAccess(id, admin);
    Object.assign(item, dto);
    await this.assignTenant(item, dto, admin);
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
    await this.assignTenant(item, dto, admin);
    await this.assertCheckinTaskDateUnique(item);
    return this.checkinTasks.save(item);
  }

  async updateCheckinTask(id: number, dto: any, admin?: AdminContext) {
    const item = await this.assertCheckinTaskAccess(id, admin);
    Object.assign(item, this.normalizeCheckinTaskDto(dto));
    await this.assignTenant(item, dto, admin);
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

  private async assertCheckinTaskDateUnique(task: { id?: number; date?: string | null; tenant?: Tenant | null }, excludeId?: number) {
    const date = String(task.date || "").trim();
    if (!date) throw new BadRequestException("请选择打卡日期");
    const tenantId = task.tenant?.id || null;
    const builder = this.checkinTasks
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.tenant", "tenant")
      .where("task.date = :date", { date });
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
    await this.assignTenant(item, dto, admin);
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
    return this.communityPosts.save(post);
  }

  async deleteCommunityPost(id: number, admin?: AdminContext) {
    await this.assertCommunityPostAccess(id, admin);
    await this.communityPosts.delete(id);
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
    return saved;
  }

  private async adjustPostCommentCount(postId: number, delta: number) {
    const post = await this.communityPosts.findOne({ where: { id: postId } });
    if (!post) return;
    post.comments = Math.max(0, Number(post.comments || 0) + delta);
    await this.communityPosts.save(post);
  }

  async coursesOverview(query: { tenantId?: string | number } = {}, admin?: AdminContext) {
    const [published, draft, totalOrders, pendingOfflineOrders, paidCourses, freeCourses, recentOrders] = await Promise.all([
      this.scopedCourseQuery(admin, query.tenantId).andWhere("course.status = :status", { status: "published" }).getCount(),
      this.scopedCourseQuery(admin, query.tenantId).andWhere("course.status = :status", { status: "draft" }).getCount(),
      this.scopedCourseOrderQuery(admin, query.tenantId).getCount(),
      this.scopedCourseOrderQuery(admin, query.tenantId).andWhere("courseOrder.status = :status", { status: CourseOrderStatus.PendingPayment }).getCount(),
      this.scopedCourseQuery(admin, query.tenantId).andWhere("course.price > 0").getCount(),
      this.scopedCourseQuery(admin, query.tenantId).andWhere("course.price <= 0").getCount(),
      this.scopedCourseOrderQuery(admin, query.tenantId).orderBy("courseOrder.createdAt", "DESC").take(8).getMany()
    ]);
    return {
      kpis: { published, draft, totalOrders, pendingOfflineOrders, paidCourses, freeCourses },
      todos: [
        { key: "pending_offline_orders", label: "待确认课程收款", count: pendingOfflineOrders },
        { key: "draft_courses", label: "草稿课程", count: draft }
      ],
      alerts: pendingOfflineOrders ? [{ level: "warning", message: "存在待确认收款课程订单，确认后用户学习权限会开通。" }] : [],
      recentRecords: recentOrders
    };
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
    const [categories, topics, pendingTopics, pendingReplies, pendingReports, todayTopics, todayReplies, recentTopics, recentReports] = await Promise.all([
      this.scopedForumCategoryQuery(admin, query.tenantId).getCount(),
      this.scopedForumTopicQuery(admin, query.tenantId).getCount(),
      this.scopedForumTopicQuery(admin, query.tenantId).andWhere("topic.status = :status", { status: "pending" }).getCount(),
      this.scopedForumReplyQuery(admin, query.tenantId).andWhere("reply.status = :status", { status: "pending" }).getCount(),
      this.scopedForumReportQuery(admin, query.tenantId).andWhere("report.status = :status", { status: "pending" }).getCount(),
      this.scopedForumTopicQuery(admin, query.tenantId).andWhere("topic.createdAt >= :todayStart", { todayStart }).getCount(),
      this.scopedForumReplyQuery(admin, query.tenantId).andWhere("reply.createdAt >= :todayStart", { todayStart }).getCount(),
      this.scopedForumTopicQuery(admin, query.tenantId).orderBy("topic.createdAt", "DESC").take(8).getMany(),
      this.scopedForumReportQuery(admin, query.tenantId).orderBy("report.createdAt", "DESC").take(8).getMany()
    ]);
    return {
      kpis: { categories, topics, pendingTopics, pendingReplies, pendingReports, todayInteraction: todayTopics + todayReplies },
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
    await this.assignTenant(category, dto, admin);
    return this.forumCategories.save(category);
  }

  async deleteForumCategory(id: number, admin?: AdminContext) {
    await this.assertForumCategoryAccess(id, admin);
    const used = await this.forumTopics.count({ where: { category: { id } } });
    if (used) throw new BadRequestException("该版块已有帖子，请先停用版块，不建议删除历史内容");
    await this.forumCategories.delete(id);
    return { success: true };
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
    return this.forumTopics.save(topic);
  }

  async setForumTopicPin(id: number, dto: { pinned?: boolean }, admin?: AdminContext) {
    const topic = await this.assertForumTopicAccess(id, admin);
    topic.pinned = dto.pinned === undefined ? !topic.pinned : Boolean(dto.pinned);
    return this.forumTopics.save(topic);
  }

  async setForumTopicFeature(id: number, dto: { featured?: boolean }, admin?: AdminContext) {
    const topic = await this.assertForumTopicAccess(id, admin);
    topic.featured = dto.featured === undefined ? !topic.featured : Boolean(dto.featured);
    return this.forumTopics.save(topic);
  }

  async convertCommunityPostToForumTopic(id: number, dto: { categoryId?: number }, admin?: AdminContext) {
    const post = await this.assertCommunityPostAccess(id, admin);
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
    return this.forumReports.save(report);
  }

  private scopedCourseQuery(admin?: AdminContext, tenantId?: string | number) {
    const builder = this.courses.createQueryBuilder("course").leftJoinAndSelect("course.tenant", "tenant");
    applyTenantScopeToQuery(builder, "course", admin);
    this.applyPlatformTenantFilter(builder, "course", tenantId, admin);
    return builder;
  }

  private scopedCourseOrderQuery(admin?: AdminContext, tenantId?: string | number) {
    const builder = this.courseOrders
      .createQueryBuilder("courseOrder")
      .leftJoinAndSelect("courseOrder.course", "course")
      .leftJoinAndSelect("course.tenant", "tenant")
      .leftJoinAndSelect("courseOrder.user", "user");
    applyTenantScopeToQuery(builder, "course", admin);
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
      .addSelect("COUNT(task.id)", "count")
      .groupBy("task.tenantId")
      .addGroupBy("task.date")
      .addGroupBy("tenant.name")
      .having("COUNT(task.id) > 1");
    applyTenantScopeToQuery(builder, "task", admin);
    this.applyPlatformTenantFilter(builder, "task", tenantId, admin);
    const rows = await builder.getRawMany();
    return rows.map((row) => ({ date: row.date, scope: row.scope, count: Number(row.count || 0) }));
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
    assertTenantAccessForActor(course, admin, "课程不存在或不属于当前商家");
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

  private async assignTenant<T extends { tenant?: Tenant | null }>(row: T, dto: any, admin?: AdminContext) {
    const tenantId = admin?.tenantId || Number(dto?.tenantId || dto?.tenant?.id || 0) || null;
    row.tenant = tenantRelationForActor<Tenant>(admin, tenantId ? await this.tenants.findOne({ where: { id: tenantId } }) : null);
  }

  private applyPlatformTenantFilter(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, tenantId?: string | number, admin?: AdminContext) {
    if (admin?.tenantId || !tenantId) return;
    const id = Number(tenantId);
    if (Number.isFinite(id) && id > 0) builder.andWhere(`${alias}.tenantId = :platformTenantId`, { platformTenantId: id });
  }
}
