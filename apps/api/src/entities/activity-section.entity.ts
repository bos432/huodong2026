import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Activity } from "./activity.entity";

@Entity("activity_sections")
export class ActivitySection {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, { onDelete: "CASCADE" })
  activity!: Activity;

  @Column({ type: "varchar", length: 40 })
  type!: string;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  imageUrl?: string | null;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;
}
