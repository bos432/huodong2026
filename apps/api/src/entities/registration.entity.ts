import { RegistrationAnswer, RegistrationStatus } from "../shared/domain";
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { ActivityChannel } from "./activity-channel.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("registrations")
@Index("IDX_registrations_activity_status_created", ["activity", "status", "createdAt"])
export class Registration {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { eager: true })
  activity!: Activity;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => User, { eager: true })
  user!: User;

  @ManyToOne(() => ActivityChannel, { eager: true, nullable: true, onDelete: "SET NULL" })
  channel!: ActivityChannel | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  attributionSource!: string | null;

  @Column({ type: "varchar", length: 48, nullable: true })
  attributionChannelCode!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  attributionChannelName!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  attributionProvince!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  attributionCity!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  attributionDistrict!: string | null;

  @Column({ type: "datetime", nullable: true })
  attributionCapturedAt!: Date | null;

  @Column({ type: "enum", enum: RegistrationStatus })
  status!: RegistrationStatus;

  @Column({ type: "varchar", length: 64, unique: true })
  checkInCode!: string;

  @Column({ type: "json" })
  answers!: RegistrationAnswer[];

  @Column({ type: "int", default: 1 })
  formSchemaVersion!: number;

  @Column({ type: "json", nullable: true })
  formSnapshot!: Record<string, unknown>[] | null;

  @Column({ type: "json", nullable: true })
  companions!: Array<{ name: string; phone?: string; idCard?: string }> | null;

  @Column({ type: "datetime", nullable: true })
  privacyConsentAt!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  reviewRemark!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  cancelReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
