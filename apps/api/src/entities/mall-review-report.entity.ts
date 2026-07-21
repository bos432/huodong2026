import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { MallReview } from "./mall-review.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("mall_review_reports")
@Unique("UQ_mall_review_reports_review_user", ["review", "user"])
@Index("IDX_mall_review_reports_tenant_status_time", ["tenant", "status", "createdAt"])
export class MallReviewReport {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: false, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => MallReview, { eager: true, nullable: false, onDelete: "CASCADE" })
  review!: MallReview;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: "CASCADE" })
  user!: User;

  @Column({ type: "varchar", length: 255 })
  reason!: string;

  @Column({ type: "json", nullable: true })
  images!: string[] | null;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: "pending" | "resolved" | "rejected";

  @Column({ type: "varchar", length: 255, nullable: true })
  resolution!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  reviewedBy!: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
