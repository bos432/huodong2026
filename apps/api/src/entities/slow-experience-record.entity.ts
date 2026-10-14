import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("slow_experience_records")
@Index("UQ_slow_record_attempt", ["ownerUserId", "tenantScopeKey", "businessKey"], { unique: true })
@Index("IDX_slow_record_public", ["tenantScopeKey", "visibility", "moderationStatus", "deletedAt", "id"])
export class SlowExperienceRecord {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: "int" }) ownerUserId!: number;
  @Column({ type: "int", nullable: true }) tenantId!: number | null;
  @Column({ type: "varchar", length: 80 }) tenantScopeKey!: string;
  @Column({ type: "varchar", length: 120 }) businessKey!: string;
  @Column({ type: "text" }) discovery!: string;
  @Column({ type: "text" }) lightNote!: string;
  @Column({ type: "text" }) feeling!: string;
  @Column({ type: "varchar", length: 20 }) visibility!: "private" | "public_review";
  @Column({ type: "varchar", length: 24 }) moderationStatus!: "not_submitted" | "pending" | "approved" | "rejected";
  @Column({ type: "int", default: 0 }) revision!: number;
  @Column({ type: "varchar", length: 255, nullable: true }) photoReference!: string | null;
  @Column({ type: "varchar", length: 80, nullable: true }) photoMime!: string | null;
  @Column({ type: "int", nullable: true }) photoSize!: number | null;
  @Column({ type: "text", nullable: true }) reviewRemark!: string | null;
  @Column({ type: "int", nullable: true }) reviewedBy!: number | null;
  @Column({ type: "datetime", nullable: true }) reviewedAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) deletedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
