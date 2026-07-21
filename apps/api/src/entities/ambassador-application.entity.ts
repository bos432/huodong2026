import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { MallMerchant } from "./mall-merchant.entity";
import { Tenant } from "./tenant.entity";

export type AmbassadorApplicationStatus = "pending" | "contacted" | "screened" | "interview" | "approved" | "activated" | "rejected";
export type EcosystemApplicationKind = "ambassador" | "partner";

@Entity("ambassador_applications")
export class AmbassadorApplication {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  businessKey!: string | null;

  @Index()
  @Column({ type: "varchar", length: 24, default: "ambassador" })
  kind!: EcosystemApplicationKind;

  @Column({ type: "varchar", length: 40 })
  name!: string;

  @Column({ type: "varchar", length: 20 })
  phone!: string;

  @Column({ type: "varchar", length: 80 })
  city!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  province!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  district!: string | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  organizationName!: string | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  cooperationIntent!: string | null;

  @Column({ type: "varchar", length: 120 })
  expertise!: string;

  @Column({ type: "text" })
  experience!: string;

  @Column({ type: "varchar", length: 80 })
  wechat!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  source!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  channelCode!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  assignee!: string | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  ownerAdmin!: AdminUser | null;

  @Column({ type: "varchar", length: 20, default: "normal" })
  priority!: "low" | "normal" | "high";

  @Column({ type: "int", default: 0 })
  cityResourceScore!: number;

  @Column({ type: "int", default: 0 })
  communityScore!: number;

  @Column({ type: "int", default: 0 })
  contentScore!: number;

  @Column({ type: "int", default: 0 })
  charityScore!: number;

  @Column({ type: "int", default: 0 })
  deliveryScore!: number;

  @Column({ type: "datetime", nullable: true })
  nextFollowAt!: Date | null;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: AmbassadorApplicationStatus;

  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @Column({ type: "text", nullable: true })
  remarkEncrypted!: string | null;

  @Column({ type: "int", nullable: true })
  reviewedBy!: number | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  convertedTenant!: Tenant | null;

  @ManyToOne(() => MallMerchant, { eager: true, nullable: true, onDelete: "SET NULL" })
  convertedMerchant!: MallMerchant | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  conversionBusinessKey!: string | null;

  @Column({ type: "datetime", nullable: true })
  convertedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
