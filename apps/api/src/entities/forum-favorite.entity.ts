import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { ForumTopic } from "./forum-topic.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("forum_favorites")
@Unique(["topic", "user"])
export class ForumFavorite {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => ForumTopic, { eager: true, onDelete: "CASCADE" })
  topic!: ForumTopic;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
