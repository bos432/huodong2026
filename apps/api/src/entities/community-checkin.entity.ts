import { CreateDateColumn, Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("community_checkins")
@Index("IDX_community_checkins_tenantId", ["tenant"])
@Index("IDX_community_checkins_user_task_date", ["userId", "taskId", "date"], { unique: true })
@Index("IDX_community_checkins_task_date", ["taskId", "date"])
export class CommunityCheckIn {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  userId!: number;

  @Column({ type: "int" })
  taskId!: number;

  @Column({ type: "date" })
  date!: string;
  @Column({ type:"int", nullable:true }) activityId!:number|null;
  @Column({ type:"text", nullable:true }) content!:string|null;
  @Column({ type:"json", nullable:true }) images!:string[]|null;
  @Column({ type:"json", nullable:true }) answers!:Record<string,string>|null;
  @Column({ type:"varchar", length:200, nullable:true }) locationName!:string|null;
  @Column({ type:"decimal", precision:10, scale:6, nullable:true }) latitude!:string|null;
  @Column({ type:"decimal", precision:10, scale:6, nullable:true }) longitude!:string|null;
  @Column({ type:"varchar", length:24, default:"approved" }) status!:"pending"|"approved"|"rejected";
  @Column({ default:false }) makeup!:boolean;
  @Column({ type:"varchar", length:500, nullable:true }) reviewRemark!:string|null;
  @Column({ type:"int", nullable:true }) reviewedByAdminId!:number|null;
  @Column({ type:"datetime", nullable:true }) reviewedAt!:Date|null;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @CreateDateColumn()
  createdAt!: Date;
}
