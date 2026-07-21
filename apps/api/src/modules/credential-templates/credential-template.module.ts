import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminUser } from "../../entities/admin-user.entity";
import { Certificate } from "../../entities/certificate.entity";
import { CharityFundTransaction } from "../../entities/charity-fund-transaction.entity";
import { CredentialTemplate } from "../../entities/credential-template.entity";
import { CredentialTemplateVersion } from "../../entities/credential-template-version.entity";
import { Tenant } from "../../entities/tenant.entity";
import { CredentialTemplateService } from "./credential-template.service";

@Module({
  imports: [TypeOrmModule.forFeature([CredentialTemplate, CredentialTemplateVersion, Tenant, AdminUser, Certificate, CharityFundTransaction])],
  providers: [CredentialTemplateService],
  exports: [CredentialTemplateService]
})
export class CredentialTemplateModule {}
