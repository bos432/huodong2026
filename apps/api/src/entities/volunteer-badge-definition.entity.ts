import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("volunteer_badge_definitions")
export class VolunteerBadgeDefinition {
  @PrimaryGeneratedColumn() id!: number;
  @Index({ unique: true }) @Column({ type: "varchar", length: 64 }) code!: string;
  @Column({ type: "varchar", length: 120 }) name!: string;
  @Column({ type: "varchar", length: 500, nullable: true }) description!: string | null;
  @Column({ type: "varchar", length: 500, nullable: true }) iconUrl!: string | null;
  @Column({ type: "varchar", length: 40, default: "service_hours" }) ruleType!: "service_hours" | "training_hours" | "manual";
  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 }) threshold!: string;
  @Column({ type: "boolean", default: true }) enabled!: boolean;
  @Column({ type: "int", default: 1 }) version!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
