import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { NotificationTemplate } from "./notification-template.entity";

@Entity("notification_schedules")
export class NotificationSchedule {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { eager: true, onDelete: "CASCADE" })
  activity!: Activity;

  @ManyToOne(() => NotificationTemplate, { eager: true, nullable: true })
  template!: NotificationTemplate | null;

  @Column({ type: "varchar", length: 80 })
  name!: string;

  @Column({ type: "varchar", length: 40, default: "site" })
  channel!: string;

  @Column({ type: "int", default: 24 })
  beforeHours!: number;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @Column({ type: "varchar", length: 160, nullable: true })
  title!: string | null;

  @Column({ type: "text", nullable: true })
  content!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @Column({ type: "datetime", nullable: true })
  lastRunAt!: Date | null;

  @Column({ type: "int", default: 0 })
  lastSentCount!: number;

  @Column({ type: "int", default: 0 })
  lastFailedCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
