import { describe, expect, it } from "vitest";
import { growthCohortSummary } from "./analytics-growth";

describe("growthCohortSummary", () => {
  it("calculates retention and repurchase using distinct users", () => {
    const result = growthCohortSummary([
      { userId: 1, occurredAt: "2026-01-01T00:00:00Z", paid: true },
      { userId: 1, occurredAt: "2026-01-04T00:00:00Z", paid: true },
      { userId: 2, occurredAt: "2026-01-01T00:00:00Z", paid: true },
      { userId: 2, occurredAt: "2026-02-10T00:00:00Z", paid: false },
      { userId: 3, occurredAt: "2026-01-02T00:00:00Z", paid: false }
    ], { asOf: "2026-02-15T00:00:00Z" });
    expect(result).toMatchObject({ users: 3, retained7: 1, retained30: 1, retention7EligibleUsers: 3, retention30EligibleUsers: 3, repeatUsers: 2, paidUsers: 2, repeatPaidUsers: 1, retention7Rate: 33.3, repurchaseRate: 50 });
  });

  it("excludes immature users from retention denominators", () => {
    const result = growthCohortSummary([
      { userId: 1, occurredAt: "2026-02-10T00:00:00Z" },
      { userId: 2, occurredAt: "2026-02-01T00:00:00Z" },
      { userId: 2, occurredAt: "2026-02-05T00:00:00Z" }
    ], { asOf: "2026-02-15T00:00:00Z" });
    expect(result).toMatchObject({ users: 2, retention7EligibleUsers: 1, retained7: 1, retention7Rate: 100, retention30EligibleUsers: 0, retention30Rate: 0 });
  });

  it("uses the first historical participation to select the cohort", () => {
    const result = growthCohortSummary([
      { userId: 1, occurredAt: "2025-12-20T00:00:00Z", paid: true },
      { userId: 1, occurredAt: "2026-01-03T00:00:00Z", paid: true },
      { userId: 2, occurredAt: "2026-01-01T00:00:00Z", paid: true },
      { userId: 2, occurredAt: "2026-01-04T00:00:00Z", paid: true }
    ], { cohortStart: "2026-01-01T00:00:00Z", cohortEnd: "2026-02-01T00:00:00Z", asOf: "2026-02-15T00:00:00Z" });
    expect(result).toMatchObject({ users: 1, repeatUsers: 1, paidUsers: 1, repeatPaidUsers: 1, retained7: 1, retention7Rate: 100 });
  });

  it("ignores invalid points and returns zero-safe rates", () => {
    expect(growthCohortSummary([{ userId: 0, occurredAt: "bad" }], { asOf: "bad" })).toEqual({ users: 0, retained7: 0, retained30: 0, retention7EligibleUsers: 0, retention30EligibleUsers: 0, retention7Rate: 0, retention30Rate: 0, repeatUsers: 0, repeatRate: 0, paidUsers: 0, repeatPaidUsers: 0, repurchaseRate: 0 });
  });
});
