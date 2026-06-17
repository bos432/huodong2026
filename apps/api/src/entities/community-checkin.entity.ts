import { CreateDateColumn, Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("community_checkins")
@Index("IDX_community_checkins_user_date", ["userId", "date"], { unique: true })
@Index("IDX_community_checkins_task_date", ["taskId", "date"])
export class CommunityCheckIn {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  taskId!: number;

  @Column({ type: "date" })
  date!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
