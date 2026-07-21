import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("mall promotion code query boundary", () => {
  it("disables recursive eager relations on direct promotion-code lookups", () => {
    const source = readFileSync(resolve(process.cwd(), "src/modules/mall/mall.service.ts"), "utf8");
    const directLookups = source.match(/promotionCodes\.findOne\(\{[^;]+/g) || [];

    expect(directLookups.length).toBe(4);
    expect(directLookups.every((lookup) => lookup.includes("loadEagerRelations: false"))).toBe(true);
  });

  it("counts promotion-code commissions without loading commission eager relations", () => {
    const source = readFileSync(resolve(process.cwd(), "src/modules/mall/mall.service.ts"), "utf8");
    const method = source.match(/private async assertPromotionCodeAccountingFieldsCanChange[\s\S]+?\n  }/)?.[0] || "";

    expect(method).toContain('.createQueryBuilder("commission")');
    expect(method).toContain('where("commission.promotionCodeId = :promotionCodeId"');
    expect(method).toContain(".getCount()");
    expect(method).not.toContain("this.commissions.count(");
  });
});
