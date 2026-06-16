import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("community_posts")
export class CommunityPost {
  @PrimaryGeneratedColumn() id!: number;
  @Column() userId!: number;
  @Column({ type: "text" }) content!: string;
  @Column({ type: "simple-json", nullable: true }) images!: string[] | null;
  @Column({ default: 0 }) likes!: number;
  @Column({ default: 0 }) comments!: number;
  @Column({ default: true }) visible!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
