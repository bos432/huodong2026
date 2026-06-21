import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AmbassadorApplication } from "./ambassador-application.entity";
import { User } from "./user.entity";

export type VolunteerProfileStatus = "pending" | "approved" | "rejected" | "inactive";
export type VolunteerLevel = "participant" | "volunteer" | "ambassador" | "city_builder";

@Entity("volunteer_profiles")
export class VolunteerProfile {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  user!: User | null;

  @ManyToOne(() => AmbassadorApplication, { eager: true, nullable: true, onDelete: "SET NULL" })
  application!: AmbassadorApplication | null;

  @Column({ type: "varchar", length: 40 })
  name!: string;

  @Column({ type: "varchar", length: 20 })
  phone!: string;

  @Column({ type: "varchar", length: 80 })
  city!: string;

  @Column({ type: "varchar", length: 160, nullable: true })
  expertise!: string | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  availableTime!: string | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  serviceIntent!: string | null;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: VolunteerProfileStatus;

  @Column({ type: "varchar", length: 24, default: "participant" })
  level!: VolunteerLevel;

  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 })
  serviceHours!: string;

  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
