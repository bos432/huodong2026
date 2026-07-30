import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("wechat_subscription_grants")
@Index("IDX_wechat_subscription_grants_available", ["user", "tenantScopeKey", "scene", "templateId", "status", "consumedAt"])
export class WechatSubscriptionGrant {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 32, default: "platform" })
  tenantScopeKey!: string;

  @Column({ type: "varchar", length: 64 })
  scene!: string;

  @Column({ type: "varchar", length: 120 })
  templateId!: string;

  @Column({ type: "varchar", length: 20 })
  status!: "accepted" | "rejected" | "banned";

  @Column({ type: "varchar", length: 40, default: "mp_weixin" })
  source!: string;

  @Column({ type: "datetime", nullable: true })
  acceptedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  consumedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  reservedAt!: Date | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  reservedBusinessKey!: string | null;

  @Column({ type: "int", nullable: true })
  consumedByNotificationId!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
