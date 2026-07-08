import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { ForumReply } from "./forum-reply.entity";
import { ForumTopic } from "./forum-topic.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type ForumReportStatus = "pending" | "resolved" | "rejected";

@Entity("forum_reports")
export class ForumReport {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => ForumTopic, { eager: true, nullable: true, onDelete: "CASCADE" })
  topic!: ForumTopic | null;

  @ManyToOne(() => ForumReply, { eager: true, nullable: true, onDelete: "CASCADE" })
  reply!: ForumReply | null;

  @Column({ type: "int", nullable: true })
  reporterId!: number | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "reporterId" })
  reporter!: User | null;

  @Column({ type: "varchar", length: 40 })
  type!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: ForumReportStatus;

  @Column({ type: "int", nullable: true })
  handlerId!: number | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "handlerId" })
  handler!: AdminUser | null;

  @Column({ type: "text", nullable: true })
  handleRemark!: string | null;

  @Column({ type: "datetime", nullable: true })
  handledAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
