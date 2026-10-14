import { BadRequestException } from "@nestjs/common";
import type { Repository } from "typeorm";
import type { AmbassadorApplication } from "../../entities/ambassador-application.entity";

export class MemberHostApplications {
  constructor(private readonly applications: Repository<AmbassadorApplication>) {}

  async latest(userId: number, tenantId: number | null) {
    const row = await this.applications.findOne({
      where: { applicantUserId: userId, applicantTenantScopeKey: tenantId ? `tenant:${tenantId}` : "platform", source: "host_apply" },
      order: { id: "DESC" }
    });
    if (!row) return null;
    return { id: row.id, status: row.status, name: row.name, city: row.city, expertise: row.expertise,
      experience: row.experience, submittedAt: row.createdAt, updatedAt: row.updatedAt };
  }

  async replay(businessKey: string, userId: number, tenantId: number | null) {
    const row = await this.applications.findOne({ where: { businessKey } });
    if (row && (row.source !== "host_apply" || row.applicantUserId !== userId || row.applicantTenantScopeKey !== (tenantId ? `tenant:${tenantId}` : "platform"))) {
      throw new BadRequestException("申请编号不可用，请重新提交");
    }
    return row;
  }
}
