import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("release_readiness_events")
export class ReleaseReadinessEvent {
  @PrimaryGeneratedColumn() id!: number;
  @Index() @Column({ type: "varchar", length: 80 }) scopeKey!: string;
  @Index() @Column({ type: "varchar", length: 64 }) itemKey!: string;
  @Column({ type: "varchar", length: 32 }) action!: string;
  @Column({ type: "varchar", length: 24 }) fromStatus!: string;
  @Column({ type: "varchar", length: 24 }) toStatus!: string;
  @Column({ type: "int", nullable: true }) actorId!: number | null;
  @Column({ type: "varchar", length: 120, nullable: true }) actorUsername!: string | null;
  @Column({ type: "varchar", length: 500, nullable: true }) reason!: string | null;
  @Column({ type: "json", nullable: true }) evidence!: Record<string, unknown> | null;
  @CreateDateColumn() createdAt!: Date;
}
