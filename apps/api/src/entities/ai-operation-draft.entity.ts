import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Activity } from './activity.entity';
@Entity('ai_operation_drafts')
@Index('UQ_ai_operation_request', ['requestKey'], { unique: true })
@Index('IDX_ai_operation_actor_created', ['actorId', 'createdAt'])
export class AiOperationDraft {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'varchar', length: 80 }) requestKey!: string;
  @Column({ type: 'int' }) activityId!: number;
  @ManyToOne(() => Activity, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'activityId' }) activity!: Activity;
  @Column({ type: 'int' }) actorId!: number;
  @Column({ type: 'varchar', length: 32 }) tenantScopeKey!: string;
  @Column({ type: 'varchar', length: 24 }) mode!: string;
  @Column({ type: 'varchar', length: 64 }) payloadHash!: string;
  @Column({ type: 'json' }) sourceSnapshot!: Record<string, unknown>;
  @Column({ type: 'varchar', length: 24, default: 'pending' }) status!: 'pending' | 'succeeded' | 'failed';
  @Column({ type: 'varchar', length: 120 }) model!: string;
  @Column({ type: 'varchar', length: 255 }) providerHost!: string;
  @Column({ type: 'boolean', default: false }) simulation!: boolean;
  @Column({ type: 'text', nullable: true }) text!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) error!: string | null;
  @Column({ type: 'int', nullable: true }) totalTokens!: number | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
