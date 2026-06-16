import { Column, Entity, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("operation_settings")
export class OperationSetting {
  @PrimaryColumn({ type: "int" })
  id!: number;

  @ManyToOne(() => Tenant, { eager: true, nullable: true, onDelete: "SET NULL" })
  tenant!: Tenant | null;

  @Column({ type: "text" })
  offlinePaymentInstructions!: string;

  @Column({ type: "json", nullable: true })
  paymentMethods!: Record<string, boolean> | null;

  @Column({
    type: "tinyint",
    default: 1,
    transformer: {
      to: (value: boolean) => (value === false ? 0 : 1),
      from: (value: boolean | number | string | null) => value === true || value === 1 || value === "1"
    }
  })
  registrationEnabled!: boolean;

  @Column({ type: "text", nullable: true })
  registrationDisabledMessage!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  customerServiceName!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  customerServicePhone!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  customerServiceWechat!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  defaultGroupQrCodeUrl!: string | null;

  @Column({ type: "json", nullable: true })
  pageTheme!: Record<string, unknown> | null;

  @Column({ type: "text" })
  refundInstructions!: string;

  @Column({ type: "text", nullable: true })
  invoiceInstructions!: string | null;

  @Column({
    type: "tinyint",
    default: 0,
    transformer: {
      to: (value: boolean) => (value ? 1 : 0),
      from: (value: boolean | number | string | null) => value === true || value === 1 || value === "1"
    }
  })
  smsProviderEnabled!: boolean;

  @Column({ type: "varchar", length: 80, nullable: true })
  smsProvider!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  smsAccessKeyId!: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  smsAccessKeySecret!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  smsSignName!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  smsTemplateId!: string | null;

  @UpdateDateColumn()
  updatedAt!: Date;
}
