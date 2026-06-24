import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Course } from "../../entities/course.entity";
import { CourseChapter } from "../../entities/course-chapter.entity";
import { CourseLesson } from "../../entities/course-lesson.entity";
import { CourseOrder } from "../../entities/course-order.entity";
import { CommunityActivity } from "../../entities/community-activity.entity";
import { CommunityCheckIn } from "../../entities/community-checkin.entity";
import { CheckInTask } from "../../entities/checkin-task.entity";
import { CommunityPost } from "../../entities/community-post.entity";
import { CommunityPostComment } from "../../entities/community-post-comment.entity";
import { CommunityPostLike } from "../../entities/community-post-like.entity";
import { UserLearning } from "../../entities/user-learning.entity";
import { UserFavorite } from "../../entities/user-favorite.entity";
import { Certificate } from "../../entities/certificate.entity";
import { AdminUser } from "../../entities/admin-user.entity";
import { Activity } from "../../entities/activity.entity";
import { Order } from "../../entities/order.entity";
import { Registration } from "../../entities/registration.entity";
import { Tenant } from "../../entities/tenant.entity";
import { User } from "../../entities/user.entity";
import { CoursesController } from "./courses.controller";
import { PublicCoursesController } from "./public-courses.controller";
import { CoursesService } from "./courses.service";

@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseChapter, CourseLesson, CourseOrder, CommunityActivity, CheckInTask, CommunityPost, CommunityPostLike, CommunityPostComment, CommunityCheckIn, UserLearning, UserFavorite, Certificate, AdminUser, Activity, Registration, Order, User, Tenant])],
  controllers: [CoursesController, PublicCoursesController],
  providers: [CoursesService],
  exports: [CoursesService]
})
export class CoursesModule {}
