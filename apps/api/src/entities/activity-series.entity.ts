import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('activity_series')
export class ActivitySeries {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'RESTRICT' }) tenant!: Tenant | null;
  @Column({ type: 'varchar', length: 120 }) title!: string;
  @Column({ type: 'int', default: 1 }) revision!: number;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
