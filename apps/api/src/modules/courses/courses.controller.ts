import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../admin/jwt-auth.guard";
import { AdminRoles, AdminRole } from "../admin/admin-roles";
import { CurrentAdmin } from "../admin/current-admin.decorator";
import { AdminUser } from "../../entities/admin-user.entity";
import { CoursesService } from "./courses.service";

const SUPER_ADMIN = [AdminRole.SuperAdmin];

@Controller("admin")
@UseGuards(JwtAuthGuard)
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  // ===== Courses =====
  @AdminRoles(...SUPER_ADMIN)
  @Get("courses") listCourses(@Query() q: any) { return this.service.listCourses(q); }

  @AdminRoles(...SUPER_ADMIN)
  @Get("courses/:id") getCourse(@Param("id", ParseIntPipe) id: number) { return this.service.getCourse(id); }

  @AdminRoles(...SUPER_ADMIN)
  @Post("courses") createCourse(@Body() dto: any) { return this.service.createCourse(dto); }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("courses/:id") updateCourse(@Param("id", ParseIntPipe) id: number, @Body() dto: any) { return this.service.updateCourse(id, dto); }

  @AdminRoles(...SUPER_ADMIN)
  @Delete("courses/:id") deleteCourse(@Param("id", ParseIntPipe) id: number) { return this.service.deleteCourse(id); }

  // ===== Chapters =====
  @AdminRoles(...SUPER_ADMIN)
  @Get("courses/:id/chapters") listChapters(@Param("id", ParseIntPipe) id: number) { return this.service.listCourseChapters(id); }

  @AdminRoles(...SUPER_ADMIN)
  @Post("course-chapters") createChapter(@Body() dto: any) { return this.service.createCourseChapter(dto); }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("course-chapters/:id") updateChapter(@Param("id", ParseIntPipe) id: number, @Body() dto: any) { return this.service.updateCourseChapter(id, dto); }

  @AdminRoles(...SUPER_ADMIN)
  @Delete("course-chapters/:id") deleteChapter(@Param("id", ParseIntPipe) id: number) { return this.service.deleteCourseChapter(id); }

  // ===== Lessons =====
  @AdminRoles(...SUPER_ADMIN)
  @Get("course-chapters/:id/lessons") listLessons(@Param("id", ParseIntPipe) id: number) { return this.service.listChapterLessons(id); }

  @AdminRoles(...SUPER_ADMIN)
  @Post("course-lessons") createLesson(@Body() dto: any) { return this.service.createCourseLesson(dto); }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("course-lessons/:id") updateLesson(@Param("id", ParseIntPipe) id: number, @Body() dto: any) { return this.service.updateCourseLesson(id, dto); }

  @AdminRoles(...SUPER_ADMIN)
  @Delete("course-lessons/:id") deleteLesson(@Param("id", ParseIntPipe) id: number) { return this.service.deleteCourseLesson(id); }

  // ===== Community Activities =====
  @AdminRoles(...SUPER_ADMIN)
  @Get("community-activities") listActivities(@Query() q: any) { return this.service.listCommunityActivities(q); }

  @AdminRoles(...SUPER_ADMIN)
  @Post("community-activities") createActivity(@Body() dto: any) { return this.service.createCommunityActivity(dto); }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("community-activities/:id") updateActivity(@Param("id", ParseIntPipe) id: number, @Body() dto: any) { return this.service.updateCommunityActivity(id, dto); }

  @AdminRoles(...SUPER_ADMIN)
  @Delete("community-activities/:id") deleteActivity(@Param("id", ParseIntPipe) id: number) { return this.service.deleteCommunityActivity(id); }

  // ===== Check-in Tasks =====
  @AdminRoles(...SUPER_ADMIN)
  @Get("checkin-tasks") listCheckins(@Query() q: any) { return this.service.listCheckinTasks(q); }

  @AdminRoles(...SUPER_ADMIN)
  @Post("checkin-tasks") createCheckin(@Body() dto: any) { return this.service.createCheckinTask(dto); }

  @AdminRoles(...SUPER_ADMIN)
  @Patch("checkin-tasks/:id") updateCheckin(@Param("id", ParseIntPipe) id: number, @Body() dto: any) { return this.service.updateCheckinTask(id, dto); }

  @AdminRoles(...SUPER_ADMIN)
  @Delete("checkin-tasks/:id") deleteCheckin(@Param("id", ParseIntPipe) id: number) { return this.service.deleteCheckinTask(id); }

  // ===== Community Posts =====
  @AdminRoles(...SUPER_ADMIN)
  @Get("community-posts") listPosts(@Query() q: any) { return this.service.listCommunityPosts(q); }

  @AdminRoles(...SUPER_ADMIN)
  @Post("community-posts") createPost(@Body() dto: any) { return this.service.createCommunityPost(dto); }

  @AdminRoles(...SUPER_ADMIN)
  @Delete("community-posts/:id") deletePost(@Param("id", ParseIntPipe) id: number) { return this.service.deleteCommunityPost(id); }
}
