import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { User } from "./user.entity";
import { Tenant } from "./tenant.entity";

@Entity("member_point_logs")
@Unique(["tenantScopeKey", "user", "sourceType", "sourceId"])
export class MemberPointLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @Column({ type: "varchar", length: 32, default: "platform" }) tenantScopeKey!: string;

  @Column({ type: "int", default: 0 }) growthValue!: number;

  @Column({ type: "datetime", nullable: true }) expiresAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) expiryProcessedAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) reversedAt!: Date | null;

  @Column({ type: "int" })
  points!: number;

  @Column({ type: "int", default: 0 })
  requestedPoints!: number;

  @Column({ type: "int", nullable: true })
  balanceBefore!: number | null;

  @Column({ type: "int", nullable: true })
  balanceAfter!: number | null;

  @Column({ type: "varchar", length: 40 })
  type!: "earn" | "deduct" | "adjust";

  @Column({ type: "varchar", length: 60 })
  sourceType!: string;

  @Column({ type: "varchar", length: 80 })
  sourceId!: string;

  @Index()
  @ManyToOne(() => MemberPointLog, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "relatedLogId" })
  relatedLog!: MemberPointLog | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  batchKey!: string | null;

  @Column({ type: "json", nullable: true })
  ruleSnapshot!: Record<string, unknown> | null;

  @Column({ type: "json", nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
