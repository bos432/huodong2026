import { RegistrationAnswer, RegistrationStatus } from "../shared/domain";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Activity } from "./activity.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("registrations")
export class Registration {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { eager: true })
  activity!: Activity;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => User, { eager: true })
  user!: User;

  @Column({ type: "enum", enum: RegistrationStatus })
  status!: RegistrationStatus;

  @Column({ type: "varchar", length: 64, unique: true })
  checkInCode!: string;

  @Column({ type: "json" })
  answers!: RegistrationAnswer[];

  @Column({ type: "varchar", length: 255, nullable: true })
  reviewRemark!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  cancelReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
