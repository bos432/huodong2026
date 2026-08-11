import { CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("tenant_followers")
@Index("UQ_tenant_followers_tenant_user", ["tenant", "user"], { unique: true })
export class TenantFollower {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, onDelete: "CASCADE" })
  tenant!: Tenant;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
