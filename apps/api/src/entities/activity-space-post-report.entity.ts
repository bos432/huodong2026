import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ActivitySpacePost } from "./activity-space-post.entity";
import { User } from "./user.entity";

@Entity("activity_space_post_reports")
@Index("UQ_activity_space_post_reports_post_user", ["post", "user"], { unique: true })
export class ActivitySpacePostReport {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ActivitySpacePost, { eager: true, onDelete: "CASCADE" })
  post!: ActivitySpacePost;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  user!: User;

  @Column({ type: "varchar", length: 500 })
  reason!: string;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: "pending" | "handled" | "dismissed";

  @Column({ type: "varchar", length: 500, nullable: true })
  resolution!: string | null;

  @Column({ type: "int", nullable: true })
  handledByAdminId!: number | null;

  @Column({ type: "datetime", nullable: true })
  handledAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
