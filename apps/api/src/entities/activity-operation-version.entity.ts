import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Activity } from './activity.entity';
import type { OperationPlan } from '../shared/activity-operation';

@Entity('activity_operation_versions')
@Index('UQ_activity_operation_version', ['activity', 'revision'], { unique: true })
export class ActivityOperationVersion {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Activity, { nullable: false, onDelete: 'RESTRICT' }) activity!: Activity;
  @Column({ type: 'int' }) revision!: number;
  @Column({ type: 'json' }) plan!: OperationPlan;
  @Column({ type: 'varchar', length: 100 }) updatedBy!: string;
  @CreateDateColumn() createdAt!: Date;
}
