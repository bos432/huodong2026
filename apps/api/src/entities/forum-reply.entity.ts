import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ForumTopic } from "./forum-topic.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export type ForumReplyStatus = "pending" | "approved" | "rejected" | "hidden";
export type ForumReplyAuthorRole = "user" | "author" | "admin";

@Entity("forum_replies")
export class ForumReply {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => ForumTopic, { eager: true, onDelete: "CASCADE" })
  topic!: ForumTopic;

  @Column({ type: "int", nullable: true })
  parentId!: number | null;

  @ManyToOne(() => ForumReply, { eager: true, nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "parentId" })
  parent!: ForumReply | null;

  @Column({ type: "int", default: 1 })
  depth!: number;

  @Column({ type: "int", nullable: true })
  userId!: number | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "userId" })
  user!: User | null;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "simple-json", nullable: true })
  images!: string[] | null;

  @Column({ type: "varchar", length: 20, default: "user" })
  authorRole!: ForumReplyAuthorRole;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: ForumReplyStatus;

  @Column({ type: "text", nullable: true })
  reviewRemark!: string | null;

  @Column({ type: "datetime", nullable: true })
  approvedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
