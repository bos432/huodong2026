import { NotFoundException } from "@nestjs/common";
import { IsNull } from "typeorm";
import type { Repository } from "typeorm";
import type { Notification } from "../../entities/notification.entity";

type InboxRepository = Pick<Repository<Notification>, "createQueryBuilder" | "findOne" | "update">;

function memberRecord(row: Notification) {
  return { id: row.id, scene: row.scene, title: row.title, content: row.content, activityId: row.activity?.id || null, readAt: row.readAt || null, createdAt: row.createdAt };
}

/** User-owned site inbox; provider delivery and admin diagnostics never enter this projection. */
export class MemberNotificationInbox {
  constructor(private readonly notifications: InboxRepository) {}

  async list(userId: number, tenantId: number | null) {
    const tenantScopeKey = tenantId ? `tenant:${tenantId}` : "platform";
    const rows = await this.notifications.createQueryBuilder("notification")
      .leftJoinAndSelect("notification.activity", "activity")
      .where("notification.userId = :userId", { userId })
      .andWhere("notification.tenantScopeKey = :tenantScopeKey", { tenantScopeKey })
      .andWhere("notification.channel = :channel AND notification.status = :status", { channel: "site", status: "sent" })
      .andWhere("(activity.tenantId IS NULL OR activity.tenantId = :tenantId)", { tenantId: tenantId || 0 })
      .orderBy("notification.id", "DESC")
      .take(100)
      .getMany();
    return rows.map(memberRecord);
  }

  async read(id: number, userId: number, tenantId: number | null) {
    const where = { id, user: { id: userId }, tenantScopeKey: tenantId ? `tenant:${tenantId}` : "platform", channel: "site", status: "sent" };
    const load = () => this.notifications.findOne({ where, relations: ["activity", "activity.tenant"], loadEagerRelations: false });
    const row = await load();
    if (!row || (row.activity?.tenant?.id && row.activity.tenant.id !== tenantId)) throw new NotFoundException("消息不存在");
    if (row.readAt) return memberRecord(row);
    await this.notifications.update({ ...where, readAt: IsNull() }, { readAt: new Date() });
    const saved = await load();
    if (!saved) throw new NotFoundException("消息不存在");
    return memberRecord(saved);
  }
}
