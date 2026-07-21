import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CommunityActivity } from "./community-activity.entity";
import { Tenant } from "./tenant.entity";
@Entity("community_activity_members")
@Index("IDX_community_activity_member_user", ["activityId", "userId"], { unique:true })
export class CommunityActivityMember {
  @PrimaryGeneratedColumn() id!:number;
  @Column() activityId!:number;
  @Column() userId!:number;
  @ManyToOne(()=>CommunityActivity,{eager:true,onDelete:"CASCADE"}) activity!:CommunityActivity;
  @ManyToOne(()=>Tenant,{eager:true,nullable:true,onDelete:"SET NULL"}) tenant!:Tenant|null;
  @Column({type:"varchar",length:24,default:"joined"}) status!:"pending"|"joined"|"rejected"|"withdrawn"|"removed";
  @Column({type:"varchar",length:500,nullable:true}) applyRemark!:string|null;
  @Column({type:"varchar",length:500,nullable:true}) reviewRemark!:string|null;
  @Column({type:"int",nullable:true}) reviewedByAdminId!:number|null;
  @Column({type:"datetime",nullable:true}) reviewedAt!:Date|null;
  @Column({type:"datetime",nullable:true}) joinedAt!:Date|null;
  @CreateDateColumn() createdAt!:Date;
  @UpdateDateColumn() updatedAt!:Date;
}
