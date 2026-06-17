import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("checkin_tasks")
export class CheckInTask {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: "date" }) date!: string;
  @Column() title!: string;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ default: 0 }) completedCount!: number;
  @Column({ default: true }) enabled!: boolean;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
