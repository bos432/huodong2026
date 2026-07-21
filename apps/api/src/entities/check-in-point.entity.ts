import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { Tenant } from "./tenant.entity";

@Entity("check_in_points")
@Index(["activity", "name"], { unique: true })
export class CheckInPoint {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @ManyToOne(() => Activity, { eager: true, onDelete: "CASCADE" }) activity!: Activity;
  @Column({ type: "varchar", length: 100 }) name!: string;
  @Column({ type: "varchar", length: 255, nullable: true }) location!: string | null;
  @Column({ type: "boolean", default: true }) enabled!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
