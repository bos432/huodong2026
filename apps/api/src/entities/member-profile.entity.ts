import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Unique } from "typeorm";
import { MemberLevel } from "./member-level.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("member_profiles")
@Unique(["user", "tenantScopeKey"])
export class MemberProfile {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" })
  tenant!: Tenant | null;

  @Index()
  @Column({ type: "varchar", length: 32, default: "platform" })
  tenantScopeKey!: string;

  @ManyToOne(() => MemberLevel, { eager: true, nullable: true })
  level!: MemberLevel | null;

  @Column({ type: "int", default: 0 })
  points!: number;

  @Column({ type: "int", default: 0 })
  pointDebt!: number;

  @Column({ type: "int", default: 0 })
  growthValue!: number;

  @Column({ type: "datetime", nullable: true })
  growthCycleStartedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  levelStartedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  levelExpiresAt!: Date | null;

  @Column({ type: "varchar", length: 32, default: "growth" })
  levelSource!: string;

  @Column({ type: "json", nullable: true })
  levelSnapshot!: Record<string, unknown> | null;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalSpent!: string;

  @Column({ type: "int", default: 0 })
  registrationCount!: number;

  @Column({ type: "int", default: 0 })
  checkInCount!: number;

  @Column({ type: "int", default: 0 })
  reviewCount!: number;

  @Column({ type: "datetime", nullable: true })
  lastActiveAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
