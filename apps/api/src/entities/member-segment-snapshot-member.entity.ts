import { CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { MemberSegmentSnapshot } from "./member-segment-snapshot.entity";
import { User } from "./user.entity";

@Entity("member_segment_snapshot_members")
@Unique(["snapshot", "user"])
export class MemberSegmentSnapshotMember {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => MemberSegmentSnapshot, { eager: true, onDelete: "CASCADE" }) snapshot!: MemberSegmentSnapshot;
  @Index() @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" }) user!: User;
  @CreateDateColumn() createdAt!: Date;
}
