import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { Tenant } from "./tenant.entity";

@Entity("activity_space_announcements")
@Index("IDX_activity_space_announcements_activity_status", ["activity", "status", "publishAt"])
export class ActivitySpaceAnnouncement {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { eager: true, onDelete: "CASCADE" })
  activity!: Activity;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "varchar", length: 20, default: "draft" })
  status!: "draft" | "published" | "cancelled";

  @Column({ type: "boolean", default: false })
  pinned!: boolean;

  @Column({ type: "datetime", nullable: true })
  publishAt!: Date | null;

  @Column({ type: "int", nullable: true })
  createdByAdminId!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
