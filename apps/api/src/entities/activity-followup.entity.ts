import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('activity_followups')
@Index('UQ_followup_registration_kind', ['registrationId', 'kind'], { unique: true })
@Index('IDX_followup_activity_due', ['activityId', 'status', 'dueAt'])
export class ActivityFollowup {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'int' }) activityId!: number;
  @Column({ type: 'int' }) registrationId!: number;
  @Column({ type: 'int' }) assigneeId!: number;
  @Column({ type: 'varchar', length: 30 }) kind!: 'feedback' | 'next_activity' | 'return_visit';
  @Column({ type: 'varchar', length: 20, default: 'pending' }) status!: 'pending' | 'done' | 'declined';
  @Column({ type: 'datetime' }) dueAt!: Date;
  @Column({ type: 'varchar', length: 1000, default: '' }) outcome!: string;
  @Column({ type: 'int', default: 1 }) revision!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
