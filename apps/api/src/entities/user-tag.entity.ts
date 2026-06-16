import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("user_tags")
@Unique(["tenant", "user", "name"])
export class UserTag {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "varchar", length: 40 })
  name!: string;

  @Column({ type: "varchar", length: 20, default: "default" })
  color!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  remark!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
