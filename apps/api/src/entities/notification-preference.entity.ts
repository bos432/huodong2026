import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("notification_preferences")
@Unique(["user", "tenantScopeKey", "channel"])
export class NotificationPreference {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" }) user!: User;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @Column({ type: "varchar", length: 32, default: "platform" }) tenantScopeKey!: string;
  @Column({ type: "varchar", length: 40 }) channel!: string;
  @Column({ type: "boolean", default: true }) subscribed!: boolean;
  @Column({ type: "varchar", length: 255, nullable: true }) reason!: string | null;
  @Column({ type: "datetime", nullable: true }) unsubscribedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
