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
    @InjectRepository(CommunityPostComment) private communityPostComments: Repository<CommunityPostComment>,
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
