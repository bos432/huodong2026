import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CharityProject } from "./charity-project.entity";
import { Activity } from "./activity.entity";
import { Course } from "./course.entity";
import { ForumCategory } from "./forum-category.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type ForumTopicStatus = "pending" | "approved" | "rejected" | "hidden";

@Entity("forum_topics")
export class ForumTopic {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => ForumCategory, { eager: true, nullable: true, onDelete: "SET NULL" })
  category!: ForumCategory | null;

  @Column({ type: "int", nullable: true })
  userId!: number | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "userId" })
  user!: User | null;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "simple-json", nullable: true })
  images!: string[] | null;

  @Column({ type: "simple-json", nullable: true })
  tags!: string[] | null;

  @Column({ type: "int", nullable: true })
  activityId!: number | null;

  @ManyToOne(() => Activity, { eager: true, nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "activityId" })
  activity!: Activity | null;

  @Column({ type: "int", nullable: true })
  courseId!: number | null;

  @ManyToOne(() => Course, { eager: true, nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "courseId" })
  course!: Course | null;

  @Column({ type: "int", nullable: true })
  charityProjectId!: number | null;

  @ManyToOne(() => CharityProject, { eager: true, nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "charityProjectId" })
  charityProject!: CharityProject | null;

  @Column({ type: "tinyint", default: 0 })
  pinned!: boolean;

  @Column({ type: "tinyint", default: 0 })
  featured!: boolean;

  @Column({ default: 0 })
  heat!: number;

  @Column({ default: 0 })
  viewCount!: number;

  @Column({ default: 0 })
  replyCount!: number;

  @Column({ default: 0 })
  favoriteCount!: number;

  @Column({ default: 0 })
  reportCount!: number;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: ForumTopicStatus;

  @Column({ type: "text", nullable: true })
  reviewRemark!: string | null;

  @Column({ type: "datetime", nullable: true })
  approvedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  lastReplyAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
