import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ForumReply } from "./forum-reply.entity";
import { ForumTopic } from "./forum-topic.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type ForumNotificationType = "reply" | "moderation" | "report";

@Entity("forum_notifications")
export class ForumNotification {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => ForumTopic, { eager: true, nullable: true, onDelete: "CASCADE" })
  topic!: ForumTopic | null;

  @ManyToOne(() => ForumReply, { eager: true, nullable: true, onDelete: "CASCADE" })
  reply!: ForumReply | null;

  @Column({ type: "varchar", length: 24 })
  type!: ForumNotificationType;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  content!: string | null;

  @Column({ type: "datetime", nullable: true })
  readAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
