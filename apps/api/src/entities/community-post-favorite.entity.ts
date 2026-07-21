import{CreateDateColumn,Entity,Index,Column,PrimaryGeneratedColumn}from"typeorm";
@Entity("community_post_favorites")@Index("IDX_community_post_favorite_user",["postId","userId"],{unique:true})
export class CommunityPostFavorite{@PrimaryGeneratedColumn()id!:number;@Column()postId!:number;@Column()userId!:number;@CreateDateColumn()createdAt!:Date;}
