import{CreateDateColumn,Entity,Index,Column,PrimaryGeneratedColumn}from"typeorm";
@Entity("community_user_follows")@Index("IDX_community_user_follow_pair",["followerUserId","followedUserId"],{unique:true})
export class CommunityUserFollow{@PrimaryGeneratedColumn()id!:number;@Column()followerUserId!:number;@Column()followedUserId!:number;@CreateDateColumn()createdAt!:Date;}
