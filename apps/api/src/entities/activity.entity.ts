import { ActivityStatus } from "../shared/domain";
import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ActivityCategory } from "./activity-category.entity";
import { ActivityField } from "./activity-field.entity";
import { Agent } from "./agent.entity";
import { MemberLevel } from "./member-level.entity";
import { Tenant } from "./tenant.entity";

@Entity("activities")
export class Activity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  coverUrl!: string | null;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "text", nullable: true })
  notice!: string | null;

  @Column({ type: "varchar", length: 255 })
  location!: string;

  @Column({ type: "decimal", precision: 10, scale: 6, nullable: true })
  locationLatitude!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 6, nullable: true })
  locationLongitude!: string | null;

  @Column({ type: "varchar", length: 800, nullable: true })
  locationMapUrl!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  groupQrCodeUrl!: string | null;

  @Column({ type: "datetime" })
  startTime!: Date;

  @Column({ type: "datetime" })
  endTime!: Date;

  @Column({ type: "datetime" })
  registrationDeadline!: Date;

  @Column({ type: "int" })
  capacity!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  price!: string;

  @Column({ type: "enum", enum: ActivityStatus, default: ActivityStatus.Draft })
  status!: ActivityStatus;

  @Column({ type: "boolean", default: false })
  featured!: boolean;

  @Column({ type: "boolean", default: true })
  requireReview!: boolean;

  @Column({ type: "boolean", default: true })
  allowCancel!: boolean;

  @ManyToOne(() => ActivityCategory, { nullable: true, eager: true })
  category!: ActivityCategory | null;

  @ManyToOne(() => Agent, { nullable: true, eager: true })
  agent!: Agent | null;

  @ManyToOne(() => MemberLevel, { nullable: true, eager: true })
  minMemberLevel!: MemberLevel | null;

  @ManyToOne(() => MemberLevel, { nullable: true, eager: true })
  priorityMemberLevel!: MemberLevel | null;

  @Column({ type: "datetime", nullable: true })
  priorityRegistrationEndsAt!: Date | null;

  @OneToMany(() => ActivityField, (field) => field.activity, { cascade: true })
  fields!: ActivityField[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
