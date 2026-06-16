import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Course } from "../../entities/course.entity";
import { CourseChapter } from "../../entities/course-chapter.entity";
import { CourseLesson } from "../../entities/course-lesson.entity";
import { CommunityActivity } from "../../entities/community-activity.entity";
import { CommunityPost } from "../../entities/community-post.entity";
import { CheckInTask } from "../../entities/checkin-task.entity";

@Controller("public")
export class PublicCoursesController {
  constructor(
    @InjectRepository(Course) private courses: Repository<Course>,
    @InjectRepository(CourseChapter) private chapters: Repository<CourseChapter>,
    @InjectRepository(CourseLesson) private lessons: Repository<CourseLesson>,
    @InjectRepository(CommunityActivity) private communityActivities: Repository<CommunityActivity>,
    @InjectRepository(CommunityPost) private communityPosts: Repository<CommunityPost>,
    @InjectRepository(CheckInTask) private checkinTasks: Repository<CheckInTask>
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
    return { code: 0, data: rows };
  }

  @Get("courses/:id")
  async getCourse(@Param("id", ParseIntPipe) id: number) {
    const course = await this.courses.findOne({ where: { id, status: "published" } });
    if (!course) return { code: 404, message: "课程不存在" };
    const chapters = await this.chapters.find({ where: { courseId: id }, order: { sortOrder: "ASC" } });
    const chapterIds = chapters.map(c => c.id);
    const lessons = chapterIds.length ? await this.lessons.find({ where: chapterIds.map(id => ({ chapterId: id })), order: { sortOrder: "ASC" } }) : [];
    return { code: 0, data: { ...course, chapters: chapters.map(ch => ({ ...ch, lessons: lessons.filter(l => l.chapterId === ch.id) })) } };
  }

  @Get("community/activities")
  async listActivities() {
    const items = await this.communityActivities.find({ where: { status: "published" }, order: { startTime: "ASC" }, take: 10 });
    return { code: 0, data: items };
  }

  @Get("community/posts")
  async listPosts() {
    const items = await this.communityPosts.find({ where: { visible: true }, order: { createdAt: "DESC" }, take: 20 });
    return { code: 0, data: items };
  }

  @Get("checkin/today")
  async getTodayCheckin() {
    const today = new Date().toISOString().split("T")[0];
    const task = await this.checkinTasks.findOne({ where: { date: today, enabled: true } });
    return { code: 0, data: task || null };
  }
}
