import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { JwtAuthGuard } from "../admin/jwt-auth.guard";
import { AdminRoles, AdminRole } from "../admin/admin-roles";
import { CurrentAdmin } from "../admin/current-admin.decorator";
import { CoursesService } from "./courses.service";

const COURSE_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator];
const COURSE_ORDER_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance];
const COMMUNITY_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator];
const FORUM_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator];
type AdminContext = { id: number; username: string; role?: string; tenantId?: number | null; permissions?: string[] };

@Controller("admin")
@UseGuards(JwtAuthGuard)
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  // ===== Courses =====
  @AdminRoles(...COURSE_ROLES)
  @Get("course-teachers") listCourseTeachers(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCourseTeachers(q, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Get("course-teacher-account-options") listCourseTeacherAccountOptions(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCourseTeacherAccountOptions(q, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Get("course-member-level-options") listCourseMemberLevelOptions(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCourseMemberLevelOptions(q, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Post("course-teachers") createCourseTeacher(@Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.saveCourseTeacher(dto, undefined, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Patch("course-teachers/:id") updateCourseTeacher(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.saveCourseTeacher(dto, id, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Delete("course-teachers/:id") deleteCourseTeacher(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.deleteCourseTeacher(id, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Post("course-resources/upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 500 * 1024 * 1024 } }))
  uploadCourseResource(@UploadedFile() file: Express.Multer.File, @Query("type") type: string, @Query("courseId") courseId: string, @CurrentAdmin() admin: AdminContext) {
    if (!file) throw new BadRequestException("请选择课程资源文件");
    return this.service.uploadCourseResource(file as Express.Multer.File & { buffer: Buffer }, type, Number(courseId), admin);
  }

  @AdminRoles(...COURSE_ROLES)
  @Get("course-resource-access-logs")
  listCourseResourceAccessLogs(@Query() query: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCourseResourceAccessLogs(query, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Get("courses/overview") coursesOverview(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.coursesOverview(q, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Get("courses") listCourses(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCourses(q, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Get("courses/:id") getCourse(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.getCourse(id, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Get("courses/:id/insights") courseInsights(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.courseInsights(id, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Get("courses/:id/learners") listCourseLearners(@Param("id", ParseIntPipe) id: number, @Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCourseLearners(id, q, admin); }

  @AdminRoles(...COURSE_ROLES)
  @Get("courses/:id/insights/export")
  async exportCourseInsights(@Param("id", ParseIntPipe) id: number, @Query() q: any, @CurrentAdmin() admin: AdminContext, @Res() res: Response) {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=course-${id}-insights.xlsx`);
    res.send(await this.service.exportCourseInsights(id, q, admin));
  }

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
  @AdminRoles(...COURSE_ROLES) @Get("course-assessments") listAssessments(@Query() q:any,@CurrentAdmin() admin:AdminContext){return this.service.listCourseAssessments(q,admin);}
  @AdminRoles(...COURSE_ROLES) @Post("course-assessments") createAssessment(@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.saveCourseAssessment(dto,undefined,admin);}
  @AdminRoles(...COURSE_ROLES) @Patch("course-assessments/:id") updateAssessment(@Param("id",ParseIntPipe) id:number,@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.saveCourseAssessment(dto,id,admin);}
  @AdminRoles(...COURSE_ROLES) @Get("course-assessments/:id/questions") listQuestions(@Param("id",ParseIntPipe) id:number,@CurrentAdmin() admin:AdminContext){return this.service.listAssessmentQuestions(id,admin);}
  @AdminRoles(...COURSE_ROLES) @Post("course-questions") createQuestion(@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.saveAssessmentQuestion(dto,undefined,admin);}
  @AdminRoles(...COURSE_ROLES) @Patch("course-questions/:id") updateQuestion(@Param("id",ParseIntPipe) id:number,@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.saveAssessmentQuestion(dto,id,admin);}
  @AdminRoles(...COURSE_ROLES) @Delete("course-questions/:id") deleteQuestion(@Param("id",ParseIntPipe) id:number,@CurrentAdmin() admin:AdminContext){return this.service.deleteAssessmentQuestion(id,admin);}
  @AdminRoles(...COURSE_ROLES) @Get("course-assessment-attempts") listAttempts(@Query() q:any,@CurrentAdmin() admin:AdminContext){return this.service.listAssessmentAttempts(q,admin);}
  @AdminRoles(...COURSE_ROLES) @Get("course-assessment-attempts-export") async exportAttempts(@Query() q:any,@CurrentAdmin() admin:AdminContext,@Res() res:Response){res.setHeader("Content-Type","text/csv; charset=utf-8");res.setHeader("Content-Disposition","attachment; filename=course-assessment-attempts.csv");res.send(await this.service.exportAssessmentAttempts(q,admin));}
  @AdminRoles(...COURSE_ROLES) @Post("course-assessment-attempts/:id/review") reviewAttempt(@Param("id",ParseIntPipe) id:number,@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.reviewAssessmentAttempt(id,dto,admin);}
  @AdminRoles(...COURSE_ROLES) @Get("course-assessment-attempts/:id") attemptDetail(@Param("id",ParseIntPipe) id:number,@CurrentAdmin() admin:AdminContext){return this.service.assessmentAttemptDetail(id,admin);}
  @AdminRoles(...COURSE_ROLES) @Post("course-assessments/:id/grants") grantRetake(@Param("id",ParseIntPipe) id:number,@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.grantAssessmentRetake(id,dto,admin);}
  @AdminRoles(...COURSE_ROLES) @Get("course-reviews") listCourseReviews(@Query() q:any,@CurrentAdmin() admin:AdminContext){return this.service.listCourseReviews(q,admin);}
  @AdminRoles(...COURSE_ROLES) @Patch("course-reviews/:id") moderateCourseReview(@Param("id",ParseIntPipe) id:number,@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.moderateCourseReview(id,dto,admin);}
  @AdminRoles(...COURSE_ROLES) @Get("course-qa") listCourseQa(@Query() q:any,@CurrentAdmin() admin:AdminContext){return this.service.listCourseQa(q,admin);}
  @AdminRoles(...COURSE_ROLES) @Patch("course-qa/:id/answer") answerCourseQa(@Param("id",ParseIntPipe) id:number,@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.answerCourseQa(id,dto,admin);}
  @AdminRoles(...COURSE_ROLES) @Get("course-announcements") listCourseAnnouncements(@Query() q:any,@CurrentAdmin() admin:AdminContext){return this.service.listCourseAnnouncements(q,admin);}
  @AdminRoles(...COURSE_ROLES) @Post("course-announcements") createCourseAnnouncement(@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.saveCourseAnnouncement(dto,undefined,admin);}
  @AdminRoles(...COURSE_ROLES) @Patch("course-announcements/:id") updateCourseAnnouncement(@Param("id",ParseIntPipe) id:number,@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.saveCourseAnnouncement(dto,id,admin);}
  @AdminRoles(...COURSE_ROLES) @Post("course-announcements/:id/notify") notifyCourseAnnouncement(@Param("id",ParseIntPipe) id:number,@CurrentAdmin() admin:AdminContext){return this.service.notifyCourseAnnouncement(id,admin);}
  @AdminRoles(...COURSE_ROLES) @Post("course-learning-reminders/run") runCourseLearningReminders(@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.runCourseLearningReminders(dto,admin);}
  @AdminRoles(...COURSE_ROLES) @Get("courses/:id/certificate-template") getCourseCertificateTemplate(@Param("id",ParseIntPipe) id:number,@CurrentAdmin() admin:AdminContext){return this.service.getCourseCertificateTemplate(id,admin);}
  @AdminRoles(...COURSE_ROLES) @Put("courses/:id/certificate-template") saveCourseCertificateTemplate(@Param("id",ParseIntPipe) id:number,@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.saveCourseCertificateTemplate(id,dto,admin);}
  @AdminRoles(...COURSE_ORDER_ROLES) @Get("course-refunds") listCourseRefunds(@Query() q:any,@CurrentAdmin() admin:AdminContext){return this.service.listCourseRefunds(q,admin);}
  @AdminRoles(...COURSE_ORDER_ROLES) @Post("course-refunds") createCourseRefund(@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.createCourseRefund(dto,admin);}
  @AdminRoles(...COURSE_ORDER_ROLES) @Post("course-refunds/:id/review") reviewCourseRefund(@Param("id",ParseIntPipe) id:number,@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.reviewCourseRefund(id,dto,admin);}
  @AdminRoles(...COURSE_ORDER_ROLES) @Post("course-refunds/:id/confirm") confirmCourseRefund(@Param("id",ParseIntPipe) id:number,@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.confirmCourseRefund(id,dto,admin);}

  @AdminRoles(...COURSE_ORDER_ROLES)
  @Get("course-orders") listCourseOrders(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCourseOrders(q, admin); }

  @AdminRoles(...COURSE_ORDER_ROLES)
  @Post("course-orders/:id/confirm-offline-payment") confirmCourseOrder(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.confirmOfflineCourseOrder(id, admin); }

  // ===== Community Activities =====
  @AdminRoles(...COMMUNITY_ROLES)
  @Get("community/overview") communityOverview(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.communityOverview(q, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Get("community-activities") listActivities(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCommunityActivities(q, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Post("community-activities") createActivity(@Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.createCommunityActivity(dto, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Patch("community-activities/:id") updateActivity(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.updateCommunityActivity(id, dto, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Delete("community-activities/:id") deleteActivity(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.deleteCommunityActivity(id, admin); }
  @AdminRoles(...COMMUNITY_ROLES) @Get("community-activities/:id/members") listActivityMembers(@Param("id",ParseIntPipe) id:number,@Query() q:any,@CurrentAdmin() admin:AdminContext){return this.service.listCommunityActivityMembers(id,q,admin);}
  @AdminRoles(...COMMUNITY_ROLES) @Post("community-activity-members/:id/review") reviewActivityMember(@Param("id",ParseIntPipe) id:number,@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.reviewCommunityActivityMember(id,dto,admin);}
  @AdminRoles(...COMMUNITY_ROLES) @Get("community-checkins") listCommunityCheckins(@Query() q:any,@CurrentAdmin() admin:AdminContext){return this.service.listCommunityCheckins(q,admin);}
  @AdminRoles(...COMMUNITY_ROLES) @Post("community-checkins/:id/review") reviewCommunityCheckin(@Param("id",ParseIntPipe) id:number,@Body() dto:any,@CurrentAdmin() admin:AdminContext){return this.service.reviewCommunityCheckin(id,dto,admin);}

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
  @Patch("community-posts/:id") reviewPost(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.reviewCommunityPost(id, dto, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Delete("community-posts/:id") deletePost(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.deleteCommunityPost(id, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Get("social-profiles") listSocialProfiles(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listSocialProfiles(q, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Patch("social-profiles/:id") reviewSocialProfile(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.reviewSocialProfile(id, dto, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Get("community-post-comments") listPostComments(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCommunityPostComments(q, admin); }

  @AdminRoles(...COMMUNITY_ROLES)
  @Patch("community-post-comments/:id") reviewPostComment(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.reviewCommunityPostComment(id, dto, admin); }

  // ===== Forum =====
  @AdminRoles(...FORUM_ROLES)
  @Get("forum/overview") forumOverview(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.forumOverview(q, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Get("forum/categories") listForumCategories(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listForumCategories(q, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Post("forum/categories") createForumCategory(@Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.saveForumCategory(dto, undefined, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Patch("forum/categories/:id") updateForumCategory(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.saveForumCategory(dto, id, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Delete("forum/categories/:id") deleteForumCategory(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.deleteForumCategory(id, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Get("forum/moderator-candidates") listForumModeratorCandidates(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listForumModeratorCandidates(q, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Get("forum/moderators") listForumModerators(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listForumModerators(q, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Post("forum/categories/:id/moderators") addForumModerator(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.addForumModerator(id, dto, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Delete("forum/moderators/:id") removeForumModerator(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.removeForumModerator(id, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Get("forum/topics") listForumTopics(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listForumTopics(q, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Patch("forum/topics/:id") updateForumTopic(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.updateForumTopic(id, dto, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Post("forum/topics/:id/pin") pinForumTopic(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.setForumTopicPin(id, dto, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Post("forum/topics/:id/feature") featureForumTopic(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.setForumTopicFeature(id, dto, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Post("forum/topics/:id/lock") lockForumTopic(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.setForumTopicLock(id, dto, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Post("forum/topics/:id/convert-from-community-post") convertForumTopic(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.convertCommunityPostToForumTopic(id, dto, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Get("forum/replies") listForumReplies(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listForumReplies(q, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Patch("forum/replies/:id") updateForumReply(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.updateForumReply(id, dto, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Get("forum/reports") listForumReports(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listForumReports(q, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Patch("forum/reports/:id") updateForumReport(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.updateForumReport(id, dto, admin); }

  // ===== Content Governance =====
  @AdminRoles(...FORUM_ROLES)
  @Get("community-content-reports") listCommunityContentReports(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listCommunityContentReports(q, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Post("community-content-reports/:id/review") reviewCommunityContentReport(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.reviewCommunityContentReport(id, dto, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Get("content-keyword-rules") listContentKeywordRules(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listContentKeywordRules(q, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Post("content-keyword-rules") createContentKeywordRule(@Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.saveContentKeywordRule(dto, undefined, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Patch("content-keyword-rules/:id") updateContentKeywordRule(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.saveContentKeywordRule(dto, id, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Delete("content-keyword-rules/:id") deleteContentKeywordRule(@Param("id", ParseIntPipe) id: number, @CurrentAdmin() admin: AdminContext) { return this.service.deleteContentKeywordRule(id, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Get("content-sanctions") listContentSanctions(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listContentSanctions(q, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Post("content-sanctions") createContentSanction(@Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.createContentSanction(dto, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Post("content-sanctions/:id/revoke") revokeContentSanction(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.revokeContentSanction(id, dto, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Get("content-appeals") listContentAppeals(@Query() q: any, @CurrentAdmin() admin: AdminContext) { return this.service.listContentAppeals(q, admin); }

  @AdminRoles(...FORUM_ROLES)
  @Post("content-appeals/:id/review") reviewContentAppeal(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @CurrentAdmin() admin: AdminContext) { return this.service.reviewContentAppeal(id, dto, admin); }
}
