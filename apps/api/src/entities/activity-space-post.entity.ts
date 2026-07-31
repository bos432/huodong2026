import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("activity_space_posts")
@Index("IDX_activity_space_posts_activity_status_created", ["activity", "status", "createdAt"])
export class ActivitySpacePost {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { eager: true, onDelete: "CASCADE" })
  activity!: Activity;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  user!: User;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "varchar", length: 20, default: "visible" })
  status!: "pending" | "visible" | "hidden";

  @Column({ type: "varchar", length: 500, nullable: true })
  adminReply!: string | null;

  @Column({ type: "int", default: 0 })
  reportCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
