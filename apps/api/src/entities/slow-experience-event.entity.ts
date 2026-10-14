import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("slow_experience_events")
@Index("IDX_slow_record_events", ["recordId", "id"])
export class SlowExperienceEvent {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: "int" }) recordId!: number;
  @Column({ type: "int" }) actorId!: number;
  @Column({ type: "varchar", length: 16 }) actorType!: "member" | "admin";
  @Column({ type: "varchar", length: 24 }) action!: string;
  @Column({ type: "varchar", length: 24, nullable: true }) previousStatus!: string | null;
  @Column({ type: "varchar", length: 24 }) nextStatus!: string;
  @Column({ type: "int" }) revision!: number;
  @CreateDateColumn() createdAt!: Date;
}
