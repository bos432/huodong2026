import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type CommunityPostCommentStatus = "pending" | "approved" | "rejected";

@Entity("community_post_comments")
@Index("IDX_community_post_comments_post_status_created", ["postId", "status", "createdAt"])
@Index("IDX_community_post_comments_user", ["userId"])
export class CommunityPostComment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  postId!: number;

  @Column()
  userId!: number;
  @Column({type:"int",nullable:true})parentId!:number|null;
  @Column({type:"json",nullable:true})mentionUserIds!:number[]|null;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: CommunityPostCommentStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  reviewRemark!: string | null;
  @Column({type:"datetime",nullable:true})deletedAt!:Date|null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
