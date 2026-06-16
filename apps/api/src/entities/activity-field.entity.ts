import { ActivityFieldOption, FieldType } from "../shared/domain";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Activity } from "./activity.entity";

@Entity("activity_fields")
export class ActivityField {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Activity, (activity) => activity.fields, { onDelete: "CASCADE" })
  activity!: Activity;

  @Column()
  label!: string;

  @Column({ type: "enum", enum: FieldType })
  type!: FieldType;

  @Column({ default: false })
  required!: boolean;

  @Column({ type: "json", nullable: true })
  options!: ActivityFieldOption[] | null;

  @Column({ default: 0 })
  sortOrder!: number;
}

