import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";
import { AmbassadorApplication } from "./ambassador-application.entity";
import { User } from "./user.entity";

export type VolunteerProfileStatus = "pending" | "approved" | "rejected" | "inactive";
export type VolunteerLevel = "participant" | "volunteer" | "ambassador" | "city_builder";

@Entity("volunteer_profiles")
@Index("IDX_volunteer_profile_qualification", ["qualificationStatus", "qualificationExpiresAt"])
export class VolunteerProfile {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 64, nullable: true })
  profileNo!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  applicationBusinessKey!: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: "SET NULL" })
  user!: User | null;

  @ManyToOne(() => AmbassadorApplication, { eager: true, nullable: true, onDelete: "SET NULL" })
  application!: AmbassadorApplication | null;

  @Column({ type: "varchar", length: 40 })
  name!: string;

  @Column({ type: "varchar", length: 20 })
  phone!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  phoneMasked!: string | null;

  @Index()
  @Column({ type: "varchar", length: 64, nullable: true })
  phoneLookupHash!: string | null;

  @Column({ type: "text", nullable: true })
  phoneEncrypted!: string | null;

  @Column({ type: "varchar", length: 80 })
  city!: string;

  @Column({ type: "varchar", length: 160, nullable: true })
  expertise!: string | null;

  @Column({ type: "json", nullable: true })
  skills!: string[] | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  availableTime!: string | null;

  @Column({ type: "json", nullable: true })
  availability!: { weekdays?: number[]; timeRanges?: string[]; notes?: string } | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  serviceIntent!: string | null;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: VolunteerProfileStatus;

  @Column({ type: "varchar", length: 24, default: "participant" })
  level!: VolunteerLevel;

  @Column({ type: "varchar", length: 24, default: "pending" })
  identityStatus!: "pending" | "verified" | "rejected";

  @Column({ type: "datetime", nullable: true })
  identityVerifiedAt!: Date | null;

  @Column({ type: "varchar", length: 24, default: "unqualified" })
  qualificationStatus!: "unqualified" | "training" | "qualified" | "expired" | "suspended";

  @Column({ type: "datetime", nullable: true })
  qualificationExpiresAt!: Date | null;

  @Column({ type: "text", nullable: true })
  emergencyContactEncrypted!: string | null;

  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 })
  serviceHours!: string;

  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @Column({ type: "text", nullable: true })
  remarkEncrypted!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  statusReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
