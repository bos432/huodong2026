import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { InviteCode } from "./invite-code.entity";
import { User } from "./user.entity";

@Entity("share_visits")
export class ShareVisit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { onDelete: "CASCADE", eager: true })
  activity!: Activity;

  @ManyToOne(() => InviteCode, { nullable: true, eager: true })
  inviteCode!: InviteCode | null;

  @ManyToOne(() => User, { nullable: true, eager: true })
  visitor!: User | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  source!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  scene!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
