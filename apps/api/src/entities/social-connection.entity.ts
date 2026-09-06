import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';

@Entity('social_connections')
@Index('UQ_social_connection_pair', ['tenantScopeKey', 'lowUserId', 'highUserId'], { unique: true })
@Index('IDX_social_connection_requests', ['requesterId', 'requestedAt'])
export class SocialConnection {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'varchar', length: 32 }) tenantScopeKey!: string;
  @Column({ type: 'int', nullable: true }) tenantId!: number | null;
  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenantId' }) tenant!: Tenant | null;
  @Column({ type: 'int' }) lowUserId!: number;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'lowUserId' }) lowUser!: User;
  @Column({ type: 'int' }) highUserId!: number;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'highUserId' }) highUser!: User;
  @Column({ type: 'int' }) requesterId!: number;
  @Column({ type: 'varchar', length: 24 }) intent!: 'activity' | 'reading' | 'collaboration';
  @Column({ type: 'varchar', length: 24, default: 'pending' }) status!: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'disconnected';
  @Column({ type: 'boolean', default: false }) lowBlocked!: boolean;
  @Column({ type: 'boolean', default: false }) highBlocked!: boolean;
  @Column({ type: 'datetime' }) requestedAt!: Date;
  @Column({ type: 'datetime', nullable: true }) closedAt!: Date | null;
  @Column({ type: 'int', default: 1 }) revision!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
