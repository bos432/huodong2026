import { describe, expect, it } from "vitest";
import { normalizeRefundPagination } from "./refund-pagination";

describe("mobile refund pagination", () => {
  it("calculates the requested page offset", () => {
    expect(normalizeRefundPagination(2, 20)).toEqual({ page: 2, pageSize: 20, offset: 20 });
  });

  it("clamps invalid page values and oversized page sizes", () => {
    expect(normalizeRefundPagination(-3, 500)).toEqual({ page: 1, pageSize: 100, offset: 0 });
  });
});
