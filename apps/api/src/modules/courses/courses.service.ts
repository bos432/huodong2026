import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Course } from "../../entities/course.entity";
import { CourseChapter } from "../../entities/course-chapter.entity";
import { CourseLesson } from "../../entities/course-lesson.entity";
import { CourseOrder, CourseOrderStatus } from "../../entities/course-order.entity";
import { CommunityActivity } from "../../entities/community-activity.entity";
import { CheckInTask } from "../../entities/checkin-task.entity";
import { CommunityPost } from "../../entities/community-post.entity";
import { UserLearning } from "../../entities/user-learning.entity";
import { PaymentMethod } from "../../shared/domain";

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
    @InjectRepository(UserLearning) private userLearning: Repository<UserLearning>
  ) {}

  // ===== Courses =====
  async listCourses(query: { status?: string; categoryId?: number }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.categoryId) where.categoryId = query.categoryId;
    return this.courses.find({ where, order: { sortOrder: "ASC", createdAt: "DESC" } });
  }

  async getCourse(id: number) {
    const course = await this.courses.findOne({ where: { id } });
    if (!course) throw new NotFoundException("课程不存在");
    const chapters = await this.chapters.find({ where: { courseId: id }, order: { sortOrder: "ASC" } });
    const chapterIds = chapters.map(c => c.id);
    const lessons = chapterIds.length ? await this.lessons.find({ where: chapterIds.map(id => ({ chapterId: id })), order: { sortOrder: "ASC" } }) : [];
    return { ...course, chapters: chapters.map(ch => ({ ...ch, lessons: lessons.filter(l => l.chapterId === ch.id) })) };
  }

  async createCourse(dto: any) {
    const course = this.courses.create(dto);
    return this.courses.save(course);
  }

  async updateCourse(id: number, dto: any) {
    await this.courses.update(id, dto);
    return this.courses.findOne({ where: { id } });
  }

  async deleteCourse(id: number) {
    await this.courses.delete(id);
    await this.chapters.delete({ courseId: id });
    return { success: true };
  }

  // ===== Chapters =====
  async listCourseChapters(courseId: number) {
    return this.chapters.find({ where: { courseId }, order: { sortOrder: "ASC" } });
  }

  async createCourseChapter(dto: any) {
    const item = this.chapters.create(dto);
    return this.chapters.save(item);
  }

  async updateCourseChapter(id: number, dto: any) {
    await this.chapters.update(id, dto);
    return this.chapters.findOne({ where: { id } });
  }

  async deleteCourseChapter(id: number) {
    await this.chapters.delete(id);
    await this.lessons.delete({ chapterId: id });
    return { success: true };
  }

  // ===== Lessons =====
  async listChapterLessons(chapterId: number) {
    return this.lessons.find({ where: { chapterId }, order: { sortOrder: "ASC" } });
  }

  async createCourseLesson(dto: any) {
    const item = this.lessons.create(dto);
    return this.lessons.save(item);
  }

  async updateCourseLesson(id: number, dto: any) {
    await this.lessons.update(id, dto);
    return this.lessons.findOne({ where: { id } });
  }

  async deleteCourseLesson(id: number) {
    await this.lessons.delete(id);
    return { success: true };
  }

  // ===== Course Orders =====
  async listCourseOrders(query: { status?: string; courseId?: string | number; keyword?: string; page?: string | number; pageSize?: string | number }) {
    const page = Math.max(Number(query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize || 20), 1), 100);
    const builder = this.courseOrders
      .createQueryBuilder("courseOrder")
      .leftJoinAndSelect("courseOrder.course", "course")
      .leftJoinAndSelect("courseOrder.user", "user")
      .orderBy("courseOrder.createdAt", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize);
    if (query.status) builder.andWhere("courseOrder.status = :status", { status: query.status });
    if (query.courseId) builder.andWhere("course.id = :courseId", { courseId: Number(query.courseId) });
    const keyword = String(query.keyword || "").trim();
    if (keyword) {
      builder.andWhere("(courseOrder.orderNo LIKE :keyword OR course.title LIKE :keyword OR user.phone LIKE :keyword OR user.nickname LIKE :keyword)", { keyword: `%${keyword}%` });
    }
    const [items, total] = await builder.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async confirmOfflineCourseOrder(orderId: number) {
    const order = await this.courseOrders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException("课程订单不存在");
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
  async listCommunityActivities(query: any) {
    const where: any = {};
    if (query.status) where.status = query.status;
    return this.communityActivities.find({ where, order: { sortOrder: "ASC", createdAt: "DESC" } });
  }

  async createCommunityActivity(dto: any) {
    const item = this.communityActivities.create(dto);
    return this.communityActivities.save(item);
  }

  async updateCommunityActivity(id: number, dto: any) {
    await this.communityActivities.update(id, dto);
    return this.communityActivities.findOne({ where: { id } });
  }

  async deleteCommunityActivity(id: number) {
    await this.communityActivities.delete(id);
    return { success: true };
  }

  // ===== Check-in Tasks =====
  async listCheckinTasks(query: any) {
    const where: any = {};
    if (query.date) where.date = query.date;
    return this.checkinTasks.find({ where, order: { date: "DESC" } });
  }

  async createCheckinTask(dto: any) {
    const item = this.checkinTasks.create(this.normalizeCheckinTaskDto(dto));
    return this.checkinTasks.save(item);
  }

  async updateCheckinTask(id: number, dto: any) {
    await this.checkinTasks.update(id, this.normalizeCheckinTaskDto(dto));
    return this.checkinTasks.findOne({ where: { id } });
  }

  async deleteCheckinTask(id: number) {
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

  // ===== Community Posts =====
  async listCommunityPosts(query: any) {
    const where: any = {};
    if (query.visible !== undefined) where.visible = query.visible;
    return this.communityPosts.find({ where, order: { createdAt: "DESC" }, take: Math.min(query.limit || 20, 50) });
  }

  async createCommunityPost(dto: any) {
    const item = this.communityPosts.create(dto);
    return this.communityPosts.save(item);
  }

  async deleteCommunityPost(id: number) {
    await this.communityPosts.delete(id);
    return { success: true };
  }
}
