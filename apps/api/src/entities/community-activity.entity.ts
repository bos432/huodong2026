import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("community_activities")
export class CommunityActivity {
  @PrimaryGeneratedColumn() id!: number;
  @Column() title!: string;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ type: "datetime", nullable: true }) startTime!: Date | null;
  @Column({ type: "varchar", length: 200, nullable: true }) location!: string | null;
  @Column({ type: "varchar", length: 500, nullable: true }) coverUrl!: string | null;
  @Column({ default: 0 }) registeredCount!: number;
  @Column({ type: "varchar", length: 30, default: "draft" }) status!: string;
  @Column({ default: 0 }) sortOrder!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
