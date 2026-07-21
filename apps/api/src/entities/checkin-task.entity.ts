import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("checkin_tasks")
@Index("IDX_checkin_tasks_tenantId", ["tenant"])
export class CheckInTask {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type:"int", nullable:true }) activityId!:number|null;
  @Column({ type: "date" }) date!: string;
  @Column() title!: string;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ default: 0 }) completedCount!: number;
  @Column({ default: true }) enabled!: boolean;
  @Column({ type:"varchar", length:24, default:"text" }) checkinType!:"text"|"image"|"question"|"location";
  @Column({ type:"json", nullable:true }) questions!:Array<{key:string;label:string;required?:boolean}>|null;
  @Column({ default:false }) requireApproval!:boolean;
  @Column({ default:false }) allowMakeup!:boolean;
  @Column({ type:"int", default:3 }) makeupWithinDays!:number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
