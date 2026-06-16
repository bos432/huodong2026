import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { ActivityChannel } from "./activity-channel.entity";
import { User } from "./user.entity";

@Entity("activity_view_logs")
export class ActivityViewLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { onDelete: "CASCADE" })
  activity!: Activity;

  @ManyToOne(() => User, { nullable: true })
  user!: User | null;

  @ManyToOne(() => ActivityChannel, { nullable: true, onDelete: "SET NULL" })
  channel!: ActivityChannel | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  source!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
