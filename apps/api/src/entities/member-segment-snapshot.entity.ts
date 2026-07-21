import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MemberSegment } from "./member-segment.entity";
import { Tenant } from "./tenant.entity";

@Entity("member_segment_snapshots")
@Index(["tenantScopeKey", "segment", "businessKey"], { unique: true })
export class MemberSegmentSnapshot {
  @PrimaryGeneratedColumn() id!: number;
  @Index({ unique: true }) @Column({ type: "varchar", length: 64 }) snapshotNo!: string;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @Column({ type: "varchar", length: 64, default: "platform" }) tenantScopeKey!: string;
  @ManyToOne(() => MemberSegment, { eager: true, onDelete: "CASCADE" }) segment!: MemberSegment;
  @Column({ type: "varchar", length: 100 }) businessKey!: string;
  @Column({ type: "varchar", length: 120 }) name!: string;
  @Column({ type: "json" }) rulesSnapshot!: Record<string, unknown>;
  @Column({ type: "int", default: 0 }) memberCount!: number;
  @Column({ type: "varchar", length: 100, nullable: true }) createdBy!: string | null;
  @CreateDateColumn() createdAt!: Date;
}
