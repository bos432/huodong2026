import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { AdminUser } from "./admin-user.entity";
import { Tenant } from "./tenant.entity";

@Entity("activity_channels")
@Unique(["activity", "code"])
export class ActivityChannel {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { eager: true, onDelete: "CASCADE" })
  activity!: Activity;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  createdBy!: AdminUser | null;

  @Column({ type: "varchar", length: 80 })
  name!: string;

  @Column({ type: "varchar", length: 48, unique: true })
  code!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  source!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  remark!: string | null;

  @Column({ type: "tinyint", default: 1 })
  enabled!: boolean;

  @Column({ type: "varchar", length: 500, nullable: true })
  qrCodeUrl!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
