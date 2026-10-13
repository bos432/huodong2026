import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { isNotificationScheduleDue } from "../../shared/notification-schedule-due";

// Execute the production method without bootstrapping unrelated service dependencies.
const source = readFileSync("src/modules/v1/v1.service.ts", "utf8");
const method = source.slice(source.indexOf("  async runDueNotificationSchedules("), source.indexOf("  private listDueNotificationSchedules("));
const compiled = ts.transpileModule(`class Subject { ${method} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const Subject = new Function("isNotificationScheduleDue", "NotificationSchedule", `${compiled}; return Subject;`)(isNotificationScheduleDue, class {});
const now = new Date("2026-10-12T09:00:00Z");
const rule = (status = "open") => ({ id: 1, enabled: true, lastRunAt: null, beforeHours: 24, activity: { id: 2, status, startTime: new Date("2026-10-13T09:00:00Z") }, channel: "site", name: "Reminder" });

function setup(candidate: any, locked: any) {
  const service = new Subject();
  const query: any = { setLock: vi.fn(() => query), leftJoinAndSelect: vi.fn(() => query), where: vi.fn(() => query), getOne: vi.fn(async () => locked) };
  const repo = { createQueryBuilder: () => query, save: vi.fn(async (row) => row) };
  service.listDueNotificationSchedules = vi.fn(async () => [candidate]);
  service.notificationSchedules = { ...repo, manager: { transaction: vi.fn(async (callback) => callback({ getRepository: () => repo })) } };
  service.assertNotificationActivityAccess = vi.fn();
  service.sendActivityReminder = vi.fn(async () => ({ sentCount: 1, failedCount: 0 }));
  service.logNotificationOperation = vi.fn();
  return service;
}

describe("scheduled reminder execution", () => {
  it("does not claim or send expired candidates", async () => {
    const candidate = rule(); candidate.activity.startTime = new Date("2026-10-11T09:00:00Z");
    const service = setup(candidate, candidate);
    const result = await service.runDueNotificationSchedules(now);
    expect(result.dueCount).toBe(0);
    expect(service.notificationSchedules.manager.transaction).not.toHaveBeenCalled();
    expect(service.sendActivityReminder).not.toHaveBeenCalled();
  });

  it("does not send when activity is cancelled between scan and lock", async () => {
    const service = setup(rule(), rule("cancelled"));
    const result = await service.runDueNotificationSchedules(now);
    expect(result.dueCount).toBe(1);
    expect(result.results).toHaveLength(0);
    expect(service.sendActivityReminder).not.toHaveBeenCalled();
    expect(service.notificationSchedules.save).not.toHaveBeenCalled();
  });

  it("claims a valid reminder once and prevents a duplicate run", async () => {
    const candidate = rule();
    const service = setup(candidate, candidate);
    await service.runDueNotificationSchedules(now);
    await service.runDueNotificationSchedules(now);
    expect(service.sendActivityReminder).toHaveBeenCalledTimes(1);
    expect(candidate.lastRunAt).toEqual(now);
  });
});
