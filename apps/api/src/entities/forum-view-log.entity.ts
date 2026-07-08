import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ForumTopic } from "./forum-topic.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("forum_view_logs")
export class ForumViewLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => ForumTopic, { eager: true, onDelete: "CASCADE" })
  topic!: ForumTopic;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  user!: User | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  clientIp!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
