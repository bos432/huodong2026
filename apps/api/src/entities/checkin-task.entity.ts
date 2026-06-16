import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("checkin_tasks")
export class CheckInTask {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: "date" }) date!: string;
  @Column() title!: string;
  @Column({ type: "text", nullable: true }) description!: string | null;
  @Column({ default: 0 }) completedCount!: number;
  @Column({ default: true }) enabled!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
