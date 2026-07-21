import { describe, expect, it, vi } from "vitest";
import { BusinessJob } from "../../entities/business-job.entity";
import { BusinessJobService } from "./business-job.service";

function createHarness(rows: BusinessJob[] = []) {
  const saved: BusinessJob[] = [];
  const updates: Array<{ id: number; patch: Record<string, unknown> }> = [];
  const repository: any = {
    findOne: vi.fn(async ({ where }: any) => rows.find((row) => row.tenantId === where.tenantId && row.type === where.type && row.idempotencyKey === where.idempotencyKey) || null),
    findOneBy: vi.fn(async ({ id }: any) => rows.find((row) => row.id === id) || null),
    findOneByOrFail: vi.fn(async ({ id }: any) => {
      const row = rows.find((item) => item.id === id);
      if (!row) throw new Error("not found");
      return row;
    }),
    find: vi.fn(async () => rows.filter((row) => row.status === "pending")),
    create: vi.fn((value: any) => ({ id: rows.length + 1, ...value })),
    save: vi.fn(async (value: BusinessJob) => {
      if (!rows.includes(value)) rows.push(value);
      saved.push(value);
      return value;
    }),
    update: vi.fn(async (id: number, patch: Record<string, unknown>) => {
      updates.push({ id, patch });
      Object.assign(rows.find((row) => row.id === id) || {}, patch);
      return { affected: 1 };
    }),
    createQueryBuilder: vi.fn(() => ({
      setLock: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getOne: vi.fn(async () => rows[0] || null)
    }))
  };
  const dataSource: any = { transaction: vi.fn(async (callback: any) => callback({ getRepository: () => repository })) };
  const config: any = { get: vi.fn((_key: string, fallback: unknown) => fallback) };
  return { service: new BusinessJobService(repository, dataSource, config), repository, rows, saved, updates };
}

function pendingJob(overrides: Partial<BusinessJob> = {}) {
  return { id: 1, tenantId: 3, type: "test.job", idempotencyKey: "same", status: "pending", payload: {}, result: null, attemptCount: 0, maxAttempts: 3, nextAttemptAt: new Date(0), lockedUntil: null, lockedBy: null, lastWorkerId: null, lastStartedAt: null, lastFinishedAt: null, lastError: null, requestId: null, completedAt: null, deadLetteredAt: null, createdAt: new Date(0), updatedAt: new Date(0), ...overrides } as BusinessJob;
}

describe("BusinessJobService", () => {
  it("returns the existing row for a repeated idempotency key", async () => {
    const existing = pendingJob();
    const { service, repository } = createHarness([existing]);
    const result = await service.publish({ tenantId: 3, type: "test.job", idempotencyKey: "same", payload: { value: 2 } });
    expect(result).toBe(existing);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("claims and completes a due job once", async () => {
    const row = pendingJob();
    const { service } = createHarness([row]);
    const handler = vi.fn(async () => ({ ok: true }));
    service.register("test.job", handler);
    const result = await service.runDue("worker-1", 20, new Date());
    expect(result).toEqual({ scanned: 1, completed: 1, failed: 0 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(row.status).toBe("completed");
    expect(row.result).toEqual({ ok: true });
  });

  it("dead-letters a job after its final failed attempt", async () => {
    const row = pendingJob({ maxAttempts: 1 });
    const { service } = createHarness([row]);
    service.register("test.job", async () => { throw new Error("provider unavailable"); });
    const result = await service.runDue("worker-1", 20, new Date());
    expect(result.failed).toBe(1);
    expect(row.status).toBe("dead_letter");
    expect(row.lastError).toBe("provider unavailable");
    expect(row.deadLetteredAt).toBeInstanceOf(Date);
  });

  it("redacts credentials from admin task details", () => {
    const { service } = createHarness();
    const row = pendingJob({
      payload: { apiKey: "provider-key", nested: { password: "plain", value: "visible" } },
      result: { accessToken: "provider-token", ok: true },
      lastError: "provider rejected token=raw-token; retry later"
    });
    const serialized = (service as any).serializeForAdmin(row);
    expect(serialized.payload).toEqual({ apiKey: "********", nested: { password: "********", value: "visible" } });
    expect(serialized.result).toEqual({ accessToken: "********", ok: true });
    expect(serialized.lastError).toBe("provider rejected token=********; retry later");
  });

  it("replays a tenant dead letter under a write lock and returns a redacted response", async () => {
    const row = pendingJob({ status: "dead_letter", payload: { apiKey: "secret" }, lastError: "token=raw-token", deadLetteredAt: new Date() });
    const { service } = createHarness([row]);
    const result = await service.replayForActor(row.id, row.tenantId, new Date("2026-07-18T00:00:00.000Z"));

    expect(result.status).toBe("pending");
    expect(result.payload).toEqual({ apiKey: "********" });
    expect(result.lastError).toBeNull();
    expect(result.operationApplied).toBe(true);
    expect(row.attemptCount).toBe(0);
  });

  it("rejects cross-tenant cancellation without changing the task", async () => {
    const row = pendingJob();
    const { service } = createHarness([row]);
    await expect(service.cancelForActor(row.id, 4)).rejects.toThrow("Business job not found in current tenant");
    expect(row.status).toBe("pending");
  });
});
