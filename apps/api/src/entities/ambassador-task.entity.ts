import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";

export type AmbassadorTaskStatus = "draft" | "open" | "closed" | "cancelled";

@Entity("ambassador_tasks")
@Index("IDX_ambassador_task_status_time", ["status", "startsAt", "endsAt"])
export class AmbassadorTask {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  taskNo!: string;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  city!: string | null;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "int", default: 0 })
  pointValue!: number;

  @Column({ type: "int", default: 0 })
  quota!: number;

  @Column({ type: "varchar", length: 24, default: "draft" })
  status!: AmbassadorTaskStatus;

  @Column({ type: "datetime", nullable: true })
  startsAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  endsAt!: Date | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  createdBy!: AdminUser | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
