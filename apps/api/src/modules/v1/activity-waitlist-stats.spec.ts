import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { In } from "typeorm";
import { RegistrationStatus } from "../../shared/domain";

const WaitlistStatus = { Waiting: "waiting" };

const source = readFileSync("src/modules/v1/v1.service.ts", "utf8");
const method = source.slice(source.indexOf("private async activityStats("), source.indexOf("private displayStatus("));
const body = method.slice(method.indexOf("{") + 1, method.lastIndexOf("}"));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

describe("enhanced activity waitlist statistics", () => {
  it("counts only waiting entries for the requested activity without consuming seats", async () => {
    const waitlists = { count: vi.fn().mockResolvedValue(2) };
    const repository = vi.fn().mockReturnValue(waitlists);
    const service = {
      registrations: { count: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0), manager: { getRepository: repository } },
      reviews: { count: vi.fn().mockResolvedValue(0) },
      viewLogs: { count: vi.fn().mockResolvedValue(0) },
      shareVisits: { count: vi.fn().mockResolvedValue(0) }
    };
    const run = new AsyncFunction("activityId", "capacity", "RegistrationStatus", "In", "Waitlist", "WaitlistStatus", body);
    const result = await run.call(service, 6, 1, RegistrationStatus, In, "Waitlist", WaitlistStatus);
    expect(result.waitingCount).toBe(2);
    expect(result.remainingSeats).toBe(0);
    expect(waitlists.count).toHaveBeenCalledWith({ where: { activity: { id: 6 }, status: WaitlistStatus.Waiting } });
  });
});
