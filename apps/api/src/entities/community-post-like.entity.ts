import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("community_post_likes")
@Index("IDX_community_post_likes_post_user", ["postId", "userId"], { unique: true })
@Index("IDX_community_post_likes_user", ["userId"])
export class CommunityPostLike {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  postId!: number;

  @Column()
  userId!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
