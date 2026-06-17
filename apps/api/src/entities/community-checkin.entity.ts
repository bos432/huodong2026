import { CreateDateColumn, Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("community_checkins")
@Index("IDX_community_checkins_user_tenant_date", ["userId", "tenant", "date"], { unique: true })
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

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @CreateDateColumn()
  createdAt!: Date;
}
