import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("admin_users")
@Index("IDX_admin_users_tenant_enabled_role", ["tenant", "enabled", "role"])
export class AdminUser {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 80, unique: true })
  username!: string;

  @Column({ type: "varchar", length: 255 })
  passwordHash!: string;

  @Column({ type: "varchar", length: 40, default: "admin" })
  role!: string;

  @Column({ type: "json", nullable: true })
  permissions!: string[] | null;

  @Column({ type: "json", nullable: true })
  dataScope!: Record<string, unknown> | null;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "tinyint", default: true })
  enabled!: boolean;

  @Column({ type: "int", default: 0 })
  sessionVersion!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
