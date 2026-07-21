import { describe, expect, it } from "vitest";
import { detectMallPromotionInventoryIssues, detectMallSkuInventoryIssues, mallInventoryStockSummary, repairMallPromotionInventoryState, repairMallSkuInventoryState } from "./mall-inventory-governance";

describe("mall inventory governance", () => {
  it("detects negative and overlocked SKU inventory", () => {
    const issues = detectMallSkuInventoryIssues({ stock: -1, lockedStock: 2, expectedLockedStock: 1 });
    expect(issues.map((item) => item.type)).toEqual(expect.arrayContaining(["sku_negative_stock", "sku_overlocked", "sku_pending_lock_mismatch"]));
  });

  it("detects pending order lock mismatches", () => {
    expect(detectMallSkuInventoryIssues({ stock: 10, lockedStock: 2, expectedLockedStock: 4 })).toEqual([
      expect.objectContaining({ type: "sku_pending_lock_mismatch", expectedState: { stock: 10, lockedStock: 4 } })
    ]);
  });

  it("repairs SKU inventory without dropping committed reservations", () => {
    expect(repairMallSkuInventoryState({ stock: 2, lockedStock: 9, expectedLockedStock: 6 })).toEqual({ stock: 6, lockedStock: 6 });
  });

  it("keeps total, locked and available stock as separate workbench values", () => {
    expect(mallInventoryStockSummary([{ stock: 31, lockedStock: 1 }, { stock: 10, lockedStock: 4 }])).toEqual({ stock: 41, lockedStock: 5, availableStock: 36 });
  });

  it("detects and repairs promotional over-allocation", () => {
    expect(detectMallPromotionInventoryIssues("flash_sale", { capacity: 5, lockedStock: 4, soldStock: 3 })[0].type).toBe("flash_sale_inventory_invalid");
    expect(repairMallPromotionInventoryState({ capacity: 5, lockedStock: 4, soldStock: 3 })).toEqual({ capacity: 7, lockedStock: 4, soldStock: 3 });
  });
});
