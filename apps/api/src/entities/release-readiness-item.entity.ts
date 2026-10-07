import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("release_readiness_items")
@Index(["scopeKey", "itemKey"], { unique: true })
export class ReleaseReadinessItem {
  @PrimaryGeneratedColumn() id!: number;
  @Index() @Column({ type: "varchar", length: 80 }) scopeKey!: string;
  @Column({ type: "int", nullable: true }) tenantId!: number | null;
  @Index() @Column({ type: "varchar", length: 64 }) itemKey!: string;
  @Column({ type: "varchar", length: 80 }) category!: string;
  @Column({ type: "varchar", length: 160 }) label!: string;
  @Column({ type: "varchar", length: 24, default: "unconfigured" }) status!: string;
  @Column({ type: "varchar", length: 120, nullable: true }) owner!: string | null;
  @Column({ type: "varchar", length: 120, nullable: true }) reviewer!: string | null;
  @Column({ type: "varchar", length: 500, nullable: true }) blockingReason!: string | null;
  @Column({ type: "json", nullable: true }) evidence!: Record<string, unknown> | null;
  @Column({ type: "datetime", nullable: true }) lastCheckedAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) expiresAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
