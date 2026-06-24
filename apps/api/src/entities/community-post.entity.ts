import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { Tenant } from "./tenant.entity";

export type CommunityPostSource = "official" | "participant";
export type CommunityPostStatus = "pending" | "approved" | "rejected";

@Entity("community_posts")
export class CommunityPost {
  @PrimaryGeneratedColumn() id!: number;
  @Column() userId!: number;
  @Column({ type: "int", nullable: true }) activityId!: number | null;
  @Column({ type: "text" }) content!: string;
  @Column({ type: "simple-json", nullable: true }) images!: string[] | null;
  @Column({ default: 0 }) likes!: number;
  @Column({ default: 0 }) comments!: number;
  @Column({ default: 0 }) shareCount!: number;
  @Column({ type: "varchar", length: 24, default: "official" }) source!: CommunityPostSource;
  @Column({ type: "varchar", length: 24, default: "approved" }) status!: CommunityPostStatus;
  @Column({ type: "varchar", length: 120, nullable: true }) city!: string | null;
  @Column({ type: "simple-json", nullable: true }) tags!: string[] | null;
  @Column({ type: "text", nullable: true }) reviewRemark!: string | null;
  @Column({ type: "simple-json", nullable: true }) posterConfig!: Record<string, unknown> | null;
  @Column({ type: "datetime", nullable: true }) approvedAt!: Date | null;
  @Column({ default: true }) visible!: boolean;
  @ManyToOne(() => Activity, { eager: true, nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "activityId" })
  activity!: Activity | null;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
