import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { AmbassadorProfile } from "./ambassador-profile.entity";
import { AmbassadorTask } from "./ambassador-task.entity";

export type AmbassadorContributionStatus = "pending" | "approved" | "rejected" | "reversed";

@Entity("ambassador_contributions")
@Index("IDX_ambassador_contribution_profile_status", ["profile", "status", "createdAt"])
export class AmbassadorContribution {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160 })
  businessKey!: string;

  @ManyToOne(() => AmbassadorProfile, { eager: true, nullable: false, onDelete: "CASCADE" })
  profile!: AmbassadorProfile;

  @ManyToOne(() => AmbassadorTask, { eager: true, nullable: true, onDelete: "SET NULL" })
  task!: AmbassadorTask | null;

  @Column({ type: "varchar", length: 40 })
  sourceType!: "task" | "event" | "referral" | "manual";

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "int", default: 1 })
  quantity!: number;

  @Column({ type: "int", default: 0 })
  points!: number;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: AmbassadorContributionStatus;

  @Column({ type: "text", nullable: true })
  evidenceEncrypted!: string | null;

  @Column({ type: "text", nullable: true })
  reviewRemarkEncrypted!: string | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  submittedBy!: AdminUser | null;

  @ManyToOne(() => AdminUser, { eager: true, nullable: true, onDelete: "SET NULL" })
  reviewedBy!: AdminUser | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  reviewBusinessKey!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 160, nullable: true })
  reversalBusinessKey!: string | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  reversedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
