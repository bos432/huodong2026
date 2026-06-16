import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Activity } from "./activity.entity";
import { User } from "./user.entity";

@Entity("invite_codes")
@Unique(["activity", "user"])
export class InviteCode {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { onDelete: "CASCADE", eager: true })
  activity!: Activity;

  @ManyToOne(() => User, { eager: true })
  user!: User;

  @Column({ type: "varchar", length: 32, unique: true })
  code!: string;

  @Column({ type: "int", default: 0 })
  visitCount!: number;

  @Column({ type: "int", default: 0 })
  registrationCount!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
