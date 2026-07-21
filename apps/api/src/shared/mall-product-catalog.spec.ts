import { describe, expect, it } from "vitest";
import { mallOrderProductSnapshot, mallOrderSkuSnapshot, normalizeMallCatalogAttributes, normalizeMallCatalogCode } from "./mall-product-catalog";

describe("mall product catalog governance", () => {
  it("normalizes stable SPU and SKU codes", () => {
    expect(normalizeMallCatalogCode(" tea gift-01 ")).toBe("TEAGIFT-01");
    expect(normalizeMallCatalogCode("中文")).toBeNull();
  });

  it("bounds and stringifies catalog attributes", () => {
    expect(normalizeMallCatalogAttributes({ " 材质 ": "陶瓷", weight: 350, empty: null })).toEqual({ "材质": "陶瓷", weight: "350", empty: "" });
    expect(normalizeMallCatalogAttributes([])).toEqual({});
  });

  it("freezes product, category, brand and sku facts for an order", () => {
    const product = mallOrderProductSnapshot({ id: 7, productCode: "TEA-7", contentVersion: 3, title: "茶礼", brand: { id: 2, code: "BRAND", name: "品牌" }, platformCategory: { id: 4, code: "TEA", name: "茶品" }, category: { id: 6, code: "GIFT", name: "礼盒" }, galleryUrls: ["a.jpg"], attributes: { material: "paper" } });
    const sku = mallOrderSkuSnapshot({ id: 8, name: "双盒", skuCode: "TEA-7-2", barcode: "690000000001", attributes: { count: "2" }, weightGrams: 500, originalPrice: "199.00" }, "双盒（秒杀）", 129);
    expect(product).toMatchObject({ productCode: "TEA-7", contentVersion: 3, brand: { code: "BRAND" }, platformCategory: { code: "TEA" }, storeCategory: { code: "GIFT" } });
    expect(sku).toMatchObject({ skuCode: "TEA-7-2", barcode: "690000000001", name: "双盒（秒杀）", price: "129.00" });
  });
});
