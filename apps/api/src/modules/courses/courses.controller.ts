import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../admin/jwt-auth.guard";
import { AdminRoles, AdminRole } from "../admin/admin-roles";
import { CurrentAdmin } from "../admin/current-admin.decorator";
import { CoursesService } from "./courses.service";

const COURSE_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator];
const COURSE_ORDER_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance];
const COMMUNITY_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator];
type AdminContext = { id: number; username: string; role?: string; tenantId?: number | null };

@Controller("admin")
@UseGuards(JwtAuthGuard)
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  // ===== Courses =====
  @AdminRoles(...COURSE_ROLES)
  @Get("courses") listCourses(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCourses(q, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Get("courses/:id") getCourse(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.getCourse(id, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Post("courses") createCourse(@Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.createCourse(dto, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Patch("courses/:id") updateCourse(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.updateCourse(id, dto, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Delete("courses/:id") deleteCourse(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.deleteCourse(id, admin); }

  // ===== Chapters =====
  @AdminRoles(...COURSE_ROLES)
  @Get("courses/:id/chapters") listChapters(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.listCourseChapters(id, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Post("course-chapters") createChapter(@Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.createCourseChapter(dto, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Patch("course-chapters/:id") updateChapter(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.updateCourseChapter(id, dto, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Delete("course-chapters/:id") deleteChapter(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.deleteCourseChapter(id, admin); }

  // ===== Lessons =====
  @AdminRoles(...COURSE_ROLES)
  @Get("course-chapters/:id/lessons") listLessons(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.listChapterLessons(id, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Post("course-lessons") createLesson(@Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.createCourseLesson(dto, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Patch("course-lessons/:id") updateLesson(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.updateCourseLesson(id, dto, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Delete("course-lessons/:id") deleteLesson(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.deleteCourseLesson(id, admin); }

  // ===== Course Orders =====
  @AdminRoles(...COURSE_ORDER_ROLES)
  @Get("course-orders") listCourseOrders(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCourseOrders(q, admin); }

  @AdminRoles(...COURSE_ORDER_ROLES)
  @Post("course-orders/:id/confirm-offline-payment") confirmCourseOrder(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.confirmOfflineCourseOrder(id, admin); }

  // ===== Community Activities =====
  @AdminRoles(...COMMUNITY_ROLES)
  @Get("community-activities") listActivities(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCommunityActivities(q, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Post("community-activities") createActivity(@Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.createCommunityActivity(dto, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Patch("community-activities/:id") updateActivity(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.updateCommunityActivity(id, dto, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Delete("community-activities/:id") deleteActivity(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.deleteCommunityActivity(id, admin); }

  // ===== Check-in Tasks =====
  @AdminRoles(...COMMUNITY_ROLES)
  @Get("checkin-tasks") listCheckins(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCheckinTasks(q, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Post("checkin-tasks") createCheckin(@Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.createCheckinTask(dto, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Patch("checkin-tasks/:id") updateCheckin(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.updateCheckinTask(id, dto, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Delete("checkin-tasks/:id") deleteCheckin(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.deleteCheckinTask(id, admin); }

  // ===== Community Posts =====
  @AdminRoles(...COMMUNITY_ROLES)
  @Get("community-posts") listPosts(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCommunityPosts(q, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Post("community-posts") createPost(@Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.createCommunityPost(dto, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Delete("community-posts/:id") deletePost(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.deleteCommunityPost(id, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Get("community-post-comments") listPostComments(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCommunityPostComments(q, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Patch("community-post-comments/:id") reviewPostComment(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.reviewCommunityPostComment(id, dto, admin); }
}
