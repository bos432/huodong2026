import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { VolunteerProfile } from "./volunteer-profile.entity";
import { VolunteerServiceRecord } from "./volunteer-service-record.entity";

@Entity("volunteer_hour_adjustments")
@Index("IDX_volunteer_hour_adjustment_profile", ["profile", "createdAt"])
export class VolunteerHourAdjustment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160 })
  businessKey!: string;

  @ManyToOne(() => VolunteerProfile, { eager: true, nullable: false, onDelete: "CASCADE" })
  profile!: VolunteerProfile;

  @ManyToOne(() => VolunteerServiceRecord, { eager: true, nullable: true, onDelete: "SET NULL" })
  serviceRecord!: VolunteerServiceRecord | null;

  @ManyToOne(() => VolunteerHourAdjustment, { eager: true, nullable: true, onDelete: "SET NULL" })
  reversalOf!: VolunteerHourAdjustment | null;

  @Column({ type: "decimal", precision: 8, scale: 2 })
  deltaHours!: string;

  @Column({ type: "varchar", length: 24 })
  action!: "adjustment" | "reversal";

  @Column({ type: "text" })
  reasonEncrypted!: string;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  createdBy!: AdminUser | null;

  @CreateDateColumn()
  createdAt!: Date;
}
