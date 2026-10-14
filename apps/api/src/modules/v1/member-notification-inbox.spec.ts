import { describe, expect, it, vi } from "vitest";
import { MemberNotificationInbox } from "../notification/member-notification-inbox";

function fixture() {
  const builder: any = {};
  for (const key of ["leftJoinAndSelect", "where", "andWhere", "orderBy", "take"]) builder[key] = vi.fn(() => builder);
  builder.getMany = vi.fn().mockResolvedValue([{ id: 1, title: "Activity reminder", content: "Starts soon", scene: "activityReminder", readAt: null, createdAt: new Date(), activity: { id: 12 }, providerMessageId: "private", variablesSnapshot: { credential: "private" } }]);
  const repository = { createQueryBuilder: vi.fn(() => builder), findOne: vi.fn(), update: vi.fn().mockResolvedValue({ affected: 1 }) };
  const service = new MemberNotificationInbox(repository as any);
  return { service, repository, builder };
}

describe("member notification inbox", () => {
  it("reads only delivered site messages for the authenticated user and exact tenant scope", async () => {
    const { service, builder } = fixture();
    const rows = await service.list(9, 7);
    expect(builder.where).toHaveBeenCalledWith("notification.userId = :userId", { userId: 9 });
    expect(builder.andWhere).toHaveBeenCalledWith("notification.tenantScopeKey = :tenantScopeKey", { tenantScopeKey: "tenant:7" });
    expect(builder.andWhere).toHaveBeenCalledWith("notification.channel = :channel AND notification.status = :status", { channel: "site", status: "sent" });
    expect(builder.take).toHaveBeenCalledWith(100);
    expect(rows[0]).toMatchObject({ id: 1, activityId: 12, readAt: null });
    expect(rows[0]).not.toHaveProperty("providerMessageId");
    expect(rows[0]).not.toHaveProperty("variablesSnapshot");
  });

  it("cannot mark another user's or tenant's notification read", async () => {
    const { service, repository } = fixture();
    repository.findOne.mockResolvedValue(null);
    await expect(service.read(42, 9, 7)).rejects.toThrow("消息不存在");
    expect(repository.findOne.mock.calls[0][0].where).toMatchObject({ id: 42, user: { id: 9 }, tenantScopeKey: "tenant:7", channel: "site", status: "sent" });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("keeps the first read timestamp when a notification is reopened", async () => {
    const { service, repository } = fixture();
    const readAt = new Date("2026-10-13T00:00:00Z");
    repository.findOne.mockResolvedValue({ id: 1, title: "Read", readAt, activity: null });
    const result = await service.read(1, 9, 7);
    expect(result.readAt).toEqual(readAt);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("conditionally writes only an unread message and returns persisted state", async () => {
    const { service, repository } = fixture();
    const readAt = new Date();
    repository.findOne.mockResolvedValueOnce({ id: 1, readAt: null }).mockResolvedValueOnce({ id: 1, readAt });
    expect((await service.read(1, 9, 7)).readAt).toEqual(readAt);
    expect(repository.update.mock.calls[0][0]).toMatchObject({ id: 1, user: { id: 9 }, tenantScopeKey: "tenant:7", readAt: { _type: "isNull" } });
  });

  it("rejects a mismatched activity tenant before any write", async () => {
    const { service, repository } = fixture();
    repository.findOne.mockResolvedValue({ id: 1, readAt: null, activity: { tenant: { id: 8 } } });
    await expect(service.read(1, 9, 7)).rejects.toThrow("消息不存在");
    expect(repository.update).not.toHaveBeenCalled();
  });
});
