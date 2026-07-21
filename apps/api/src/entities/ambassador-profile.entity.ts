import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { AmbassadorApplication } from "./ambassador-application.entity";
import { User } from "./user.entity";

export type AmbassadorProfileStatus = "active" | "suspended" | "expired" | "revoked";
export type AmbassadorLevel = "starter" | "bronze" | "silver" | "gold" | "core";

@Entity("ambassador_profiles")
@Index("UQ_ambassador_profile_application", ["application"], { unique: true })
@Index("IDX_ambassador_profile_region_status", ["city", "status", "expiresAt"])
export class AmbassadorProfile {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  profileNo!: string;

  @ManyToOne(() => AmbassadorApplication, { eager: true, nullable: false, onDelete: "CASCADE" })
  application!: AmbassadorApplication;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  user!: User | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  activatedBy!: AdminUser | null;

  @Column({ type: "varchar", length: 40 })
  name!: string;

  @Column({ type: "varchar", length: 20 })
  phoneMasked!: string;

  @Index()
  @Column({ type: "varchar", length: 64 })
  phoneLookupHash!: string;

  @Column({ type: "varchar", length: 80 })
  city!: string;

  @Column({ type: "json", nullable: true })
  regionScope!: { provinces?: string[]; cities?: string[]; districts?: string[] } | null;

  @Column({ type: "varchar", length: 24, default: "active" })
  status!: AmbassadorProfileStatus;

  @Column({ type: "varchar", length: 24, default: "starter" })
  level!: AmbassadorLevel;

  @Column({ type: "int", default: 0 })
  contributionPoints!: number;

  @Column({ type: "datetime" })
  startsAt!: Date;

  @Column({ type: "datetime" })
  expiresAt!: Date;

  @Column({ type: "datetime", nullable: true })
  lastContributionAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  suspendedAt!: Date | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  statusReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
