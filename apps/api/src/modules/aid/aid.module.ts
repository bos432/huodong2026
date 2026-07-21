import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminUser } from "../../entities/admin-user.entity";
import { AidApplicationEvent } from "../../entities/aid-application-event.entity";
import { AidApplicationMaterial } from "../../entities/aid-application-material.entity";
import { AidApplication } from "../../entities/aid-application.entity";
import { Tenant } from "../../entities/tenant.entity";
import { User } from "../../entities/user.entity";
import { AidService } from "./aid.service";

@Module({
  imports: [TypeOrmModule.forFeature([AidApplication, AidApplicationMaterial, AidApplicationEvent, Tenant, User, AdminUser])],
  providers: [AidService],
  exports: [AidService]
})
export class AidModule {}
