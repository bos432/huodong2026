import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SocialConnection } from './social-connection.entity';
@Entity('social_connection_events')
@Index('UQ_social_connection_event', ['connectionId', 'revision'], { unique: true })
export class SocialConnectionEvent {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'int' }) connectionId!: number;
  @ManyToOne(() => SocialConnection, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'connectionId' }) connection!: SocialConnection;
  @Column({ type: 'int' }) actorId!: number;
  @Column({ type: 'int' }) revision!: number;
  @Column({ type: 'varchar', length: 24 }) action!: string;
  @CreateDateColumn() createdAt!: Date;
}
