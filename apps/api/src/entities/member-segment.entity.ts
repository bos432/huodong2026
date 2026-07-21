import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("member_segments")
@Index(["tenantScopeKey", "name"], { unique: true })
export class MemberSegment {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "CASCADE" }) tenant!: Tenant | null;
  @Column({ type: "varchar", length: 64, default: "platform" }) tenantScopeKey!: string;
  @Column({ type: "varchar", length: 100 }) name!: string;
  @Column({ type: "varchar", length: 255, nullable: true }) description!: string | null;
  @Column({ type: "json" }) rules!: Record<string, unknown>;
  @Column({ type: "boolean", default: true }) enabled!: boolean;
  @Column({ type: "int", default: 0 }) lastMatchedCount!: number;
  @Column({ type: "datetime", nullable: true }) lastCalculatedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
