import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CourseOrder } from "./course-order.entity";
@Entity("course_refunds")
@Index("IDX_course_refund_no", ["refundNo"], { unique: true })
export class CourseRefund {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: "varchar", length: 64 }) refundNo!: string;
  @ManyToOne(() => CourseOrder, { eager: true, onDelete: "CASCADE" }) order!: CourseOrder;
  @Column({ type: "bigint" }) amountFen!: number;
  @Column({ type: "varchar", length: 500 }) reason!: string;
  @Column({ type: "varchar", length: 24, default: "pending" }) status!: "pending" | "approved" | "rejected" | "processing" | "completed" | "failed";
  @Column({ type: "varchar", length: 500, nullable: true }) reviewRemark!: string | null;
  @Column({ type: "int", nullable: true }) reviewedByAdminId!: number | null;
  @Column({ type: "datetime", nullable: true }) reviewedAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) completedAt!: Date | null;
  @Column({ type: "varchar", length: 128, nullable: true }) providerRefundNo!: string | null;
  @Column({ type: "varchar", length: 40, nullable: true }) providerRefundStatus!: string | null;
  @Column({ type: "datetime", nullable: true }) providerRefundSyncedAt!: Date | null;
  @Column({ type: "json", nullable: true }) providerRefundPayload!: Record<string, unknown> | null;
  @Column({ type: "int", default: 0 }) providerRefundRetryCount!: number;
  @Column({ type: "datetime", nullable: true }) providerRefundNextQueryAt!: Date | null;
  @Column({ type: "varchar", length: 500, nullable: true }) failureReason!: string | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
