import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { RegistrationAnswer } from "../shared/domain";
import { Activity } from "./activity.entity";
import { Registration } from "./registration.entity";
import { User } from "./user.entity";

export enum WaitlistStatus {
  Waiting = "waiting",
  Promoted = "promoted",
  Cancelled = "cancelled"
}

@Entity("waitlists")
export class Waitlist {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { eager: true, onDelete: "CASCADE" })
  activity!: Activity;

  @ManyToOne(() => User, { eager: true })
  user!: User;

  @Column({ type: "enum", enum: WaitlistStatus, default: WaitlistStatus.Waiting })
  status!: WaitlistStatus;

  @Column({ type: "json" })
  answers!: RegistrationAnswer[];

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @ManyToOne(() => Registration, { nullable: true, eager: true })
  promotedRegistration!: Registration | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
