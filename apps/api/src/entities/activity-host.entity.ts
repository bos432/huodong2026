import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Activity } from "./activity.entity";

@Entity("activity_hosts")
export class ActivityHost {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { onDelete: "CASCADE" })
  activity!: Activity;

  @Column({ type: "varchar", length: 80 })
  name!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  title!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: "text", nullable: true })
  bio!: string | null;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;
}