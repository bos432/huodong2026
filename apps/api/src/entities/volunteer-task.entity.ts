import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type VolunteerTaskStatus = "draft" | "open" | "closed" | "completed" | "archived";

@Entity("volunteer_tasks")
export class VolunteerTask {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "varchar", length: 40 })
  type!: string;

  @Column({ type: "varchar", length: 80 })
  city!: string;

  @Column({ type: "varchar", length: 160, nullable: true })
  address!: string | null;

  @Column({ type: "datetime", nullable: true })
  startAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  endAt!: Date | null;

  @Column({ type: "int", default: 1 })
  quota!: number;

  @Column({ type: "varchar", length: 24, default: "open" })
  status!: VolunteerTaskStatus;

  @Column({ type: "text", nullable: true })
  requirement!: string | null;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
