import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type AmbassadorApplicationStatus = "pending" | "contacted" | "approved" | "rejected";

@Entity("ambassador_applications")
export class AmbassadorApplication {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 40 })
  name!: string;

  @Column({ type: "varchar", length: 20 })
  phone!: string;

  @Column({ type: "varchar", length: 80 })
  city!: string;

  @Column({ type: "varchar", length: 120 })
  expertise!: string;

  @Column({ type: "text" })
  experience!: string;

  @Column({ type: "varchar", length: 80 })
  wechat!: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  source!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  channelCode!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  assignee!: string | null;

  @Column({ type: "varchar", length: 20, default: "normal" })
  priority!: "low" | "normal" | "high";

  @Column({ type: "datetime", nullable: true })
  nextFollowAt!: Date | null;

  @Column({ type: "varchar", length: 24, default: "pending" })
  status!: AmbassadorApplicationStatus;

  @Column({ type: "text", nullable: true })
  remark!: string | null;

  @Column({ type: "int", nullable: true })
  reviewedBy!: number | null;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
