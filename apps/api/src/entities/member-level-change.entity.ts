import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { MemberLevel } from "./member-level.entity";
import { MemberProfile } from "./member-profile.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("member_level_changes")
@Index("IDX_member_level_changes_scope_user_created", ["tenantScopeKey", "user", "createdAt"])
@Index("IDX_member_level_changes_profile_created", ["memberProfile", "createdAt"])
export class MemberLevelChange {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 32, default: "platform" })
  tenantScopeKey!: string;

  @ManyToOne(() => MemberProfile, { onDelete: "CASCADE" })
  memberProfile!: MemberProfile;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => MemberLevel, { eager: true, nullable: true, onDelete: "SET NULL" })
  fromLevel!: MemberLevel | null;

  @ManyToOne(() => MemberLevel, { eager: true, nullable: true, onDelete: "SET NULL" })
  toLevel!: MemberLevel | null;

  @Column({ type: "varchar", length: 32 })
  source!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  reason!: string | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  operatorAdmin!: AdminUser | null;

  @Column({ type: "int", default: 0 })
  growthValue!: number;

  @Column({ type: "datetime", nullable: true })
  levelStartedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  levelExpiresAt!: Date | null;

  @Column({ type: "json", nullable: true })
  benefitSnapshot!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
