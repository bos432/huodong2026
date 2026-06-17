import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("community_posts")
export class CommunityPost {
  @PrimaryGeneratedColumn() id!: number;
  @Column() userId!: number;
  @Column({ type: "text" }) content!: string;
  @Column({ type: "simple-json", nullable: true }) images!: string[] | null;
  @Column({ default: 0 }) likes!: number;
  @Column({ default: 0 }) comments!: number;
  @Column({ default: true }) visible!: boolean;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" }) tenant!: Tenant | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
