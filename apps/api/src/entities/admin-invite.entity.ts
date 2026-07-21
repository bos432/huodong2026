import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { Tenant } from "./tenant.entity";

@Entity("admin_invites")
@Index("IDX_admin_invites_tenant_status", ["tenant", "status", "expiresAt"])
@Index("IDX_admin_invites_username_status", ["username", "status"])
export class AdminInvite {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: "varchar", length: 80 }) username!: string;
  @Column({ type: "varchar", length: 64, unique: true }) tokenHash!: string;
  @Column({ type: "varchar", length: 40 }) role!: string;
  @Column({ type: "json", nullable: true }) permissions!: string[] | null;
  @Column({ type: "json", nullable: true }) dataScope!: Record<string, unknown> | null;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" }) invitedBy!: AdminUser | null;
  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" }) acceptedAdmin!: AdminUser | null;
  @Column({ type: "varchar", length: 20, default: "pending" }) status!: "pending" | "accepted" | "revoked" | "expired";
  @Column({ type: "datetime" }) expiresAt!: Date;
  @Column({ type: "datetime", nullable: true }) acceptedAt!: Date | null;
  @Column({ type: "datetime", nullable: true }) revokedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
