import { BadRequestException, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { createHmac } from "crypto";
import { Course } from "../../entities/course.entity";
import { CourseChapter } from "../../entities/course-chapter.entity";
import { CourseLesson } from "../../entities/course-lesson.entity";
import { CommunityActivity } from "../../entities/community-activity.entity";
import { CommunityPost } from "../../entities/community-post.entity";
import { CheckInTask } from "../../entities/checkin-task.entity";
import { CommunityCheckIn } from "../../entities/community-checkin.entity";
import { UserLearning } from "../../entities/user-learning.entity";

@Controller("public")
export class PublicCoursesController {
  constructor(
    @InjectRepository(Course) private courses: Repository<Course>,
    @InjectRepository(CourseChapter) private chapters: Repository<CourseChapter>,
    @InjectRepository(CourseLesson) private lessons: Repository<CourseLesson>,
    @InjectRepository(CommunityActivity) private communityActivities: Repository<CommunityActivity>,
    @InjectRepository(CommunityPost) private communityPosts: Repository<CommunityPost>,
    @InjectRepository(CheckInTask) private checkinTasks: Repository<CheckInTask>,
    @InjectRepository(CommunityCheckIn) private communityCheckins: Repository<CommunityCheckIn>,
    @InjectRepository(UserLearning) private userLearning: Repository<UserLearning>,
    private readonly config: ConfigService
  ) {}

  @Get("courses")
  async listCourses(@Query() q: { category?: string; sort?: string }) {
    const where: any = { status: "published" };
    if (q.category && q.category !== "all") {
      // Simplified category filter - actual implementation should join categories table
    }
    let rows = await this.courses.find({ where, order: { sortOrder: "ASC", createdAt: "DESC" } });
    if (q.sort === "hottest") rows = rows.sort((a,b) => b.hotCount - a.hotCount);
    if (q.sort === "price") rows = rows.sort((a,b) => a.price - b.price);
    return rows;
  }

  @Get("courses/:id")
  async getCourse(@Param("id", ParseIntPipe) id: number) {
    const course = await this.courses.findOne({ where: { id, status: "published" } });
    if (!course) return null;
    const chapters = await this.chapters.find({ where: { courseId: id }, order: { sortOrder: "ASC" } });
    const chapterIds = chapters.map(c => c.id);
    const lessons = chapterIds.length ? await this.lessons.find({ where: chapterIds.map(id => ({ chapterId: id })), order: { sortOrder: "ASC" } }) : [];
    return { ...course, chapters: chapters.map(ch => ({ ...ch, lessons: lessons.filter(l => l.chapterId === ch.id) })) };
  }

  @Get("courses/:id/player")
  async getCoursePlayer(@Param("id", ParseIntPipe) id: number, @Req() req: any) {
    const userId = this.requireUserId(req.headers?.authorization);
    const course = await this.courses.findOne({ where: { id, status: "published" } });
    if (!course) return null;
    const chapters = await this.chapters.find({ where: { courseId: id }, order: { sortOrder: "ASC" } });
    const chapterIds = chapters.map((chapter) => chapter.id);
    const lessons = chapterIds.length ? await this.lessons.find({ where: chapterIds.map((chapterId) => ({ chapterId })), order: { sortOrder: "ASC" } }) : [];
    const owned = await this.hasCourseAccess(userId, id);
    const canPlayCourse = owned || Number(course.price || 0) <= 0;
    const playableLessons = lessons.filter((lesson) => canPlayCourse || lesson.isFree);
    if (!playableLessons.length && !owned) throw new BadRequestException("请先购买课程，后台确认收款后再学习");
    return {
      ...course,
      owned,
      chapters: chapters.map((chapter) => ({
        ...chapter,
        lessons: lessons
          .filter((lesson) => lesson.chapterId === chapter.id)
          .map((lesson) => ({
            ...lesson,
            locked: !(canPlayCourse || lesson.isFree)
          }))
      }))
    };
  }

  @Get("community/activities")
  async listActivities() {
    const items = await this.communityActivities.find({ where: { status: "published" }, order: { startTime: "ASC" }, take: 10 });
    return items;
  }

  @Get("community/posts")
  async listPosts() {
    const items = await this.communityPosts.find({ where: { visible: true }, order: { createdAt: "DESC" }, take: 20 });
    return items;
  }

  @Get("checkin/today")
  async getTodayCheckin(@Req() req: any) {
    const today = this.today();
    const task = await this.checkinTasks.findOne({ where: { date: today, enabled: true } });
    if (!task) return null;
    const userId = this.optionalUserId(req.headers?.authorization);
    const monthStart = `${today.slice(0, 7)}-01`;
    const monthEnd = `${today.slice(0, 7)}-31`;
    const rows = userId
      ? await this.communityCheckins.find({ where: { userId, date: Between(monthStart, monthEnd) }, order: { date: "ASC" } })
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
  async completeTodayCheckin(@Req() req: any) {
    const userId = this.requireUserId(req.headers?.authorization);
    const today = this.today();
    const task = await this.checkinTasks.findOne({ where: { date: today, enabled: true } });
    if (!task) return { checkedToday: false, message: "暂无今日打卡任务", today };
    let row = await this.communityCheckins.findOne({ where: { userId, date: today } });
    if (!row) {
      try {
        row = await this.communityCheckins.save(this.communityCheckins.create({ userId, taskId: task.id, date: today }));
        task.completedCount = Number(task.completedCount || 0) + 1;
        await this.checkinTasks.save(task);
      } catch (error: any) {
        if (!this.isDuplicateKeyError(error)) throw error;
        row = await this.communityCheckins.findOne({ where: { userId, date: today } });
      }
    }
    return { checkedToday: true, checkin: row, task, today };
  }

  private async hasCourseAccess(userId: number, courseId: number) {
    const count = await this.userLearning.count({ where: { userId, courseId, lessonId: 0 } });
    return count > 0;
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
}
