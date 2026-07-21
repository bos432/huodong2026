import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { ActivityReview } from "./activity-review.entity";
import { User } from "./user.entity";

@Entity("activity_review_reports")
@Unique(["review", "user"])
export class ActivityReviewReport {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => ActivityReview, { eager: true, onDelete: "CASCADE" }) review!: ActivityReview;
  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" }) user!: User;
  @Column({ type: "varchar", length: 500 }) reason!: string;
  @Column({ type: "varchar", length: 20, default: "pending" }) status!: string;
  @Column({ type: "varchar", length: 500, nullable: true }) resolution!: string | null;
  @Column({ type: "varchar", length: 80, nullable: true }) handledBy!: string | null;
  @Column({ type: "datetime", nullable: true }) handledAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
