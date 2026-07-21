import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AdminUser } from "./admin-user.entity";
import { ForumCategory } from "./forum-category.entity";
import { Tenant } from "./tenant.entity";

@Entity("forum_category_moderators")
@Index("IDX_forum_category_moderator_pair", ["category", "admin"], { unique: true })
export class ForumCategoryModerator {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @ManyToOne(() => ForumCategory, { eager: true, onDelete: "CASCADE" })
  category!: ForumCategory;

  @ManyToOne(() => AdminUser, { eager: true, onDelete: "CASCADE" })
  admin!: AdminUser;

  @Column({ type: "json", nullable: true })
  permissions!: string[] | null;

  @Column({ type: "int", nullable: true })
  createdByAdminId!: number | null;

  @CreateDateColumn()
  createdAt!: Date;
}
