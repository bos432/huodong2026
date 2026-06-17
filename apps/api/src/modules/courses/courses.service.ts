import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Course } from "../../entities/course.entity";
import { CourseChapter } from "../../entities/course-chapter.entity";
import { CourseLesson } from "../../entities/course-lesson.entity";
import { CommunityActivity } from "../../entities/community-activity.entity";
import { CheckInTask } from "../../entities/checkin-task.entity";
import { CommunityPost } from "../../entities/community-post.entity";

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private courses: Repository<Course>,
    @InjectRepository(CourseChapter) private chapters: Repository<CourseChapter>,
    @InjectRepository(CourseLesson) private lessons: Repository<CourseLesson>,
    @InjectRepository(CommunityActivity) private communityActivities: Repository<CommunityActivity>,
    @InjectRepository(CheckInTask) private checkinTasks: Repository<CheckInTask>,
    @InjectRepository(CommunityPost) private communityPosts: Repository<CommunityPost>
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
    const item = this.checkinTasks.create(dto);
    return this.checkinTasks.save(item);
  }

  async updateCheckinTask(id: number, dto: any) {
    await this.checkinTasks.update(id, dto);
    return this.checkinTasks.findOne({ where: { id } });
  }

  async deleteCheckinTask(id: number) {
    await this.checkinTasks.delete(id);
    return { success: true };
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
