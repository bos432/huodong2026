import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { CreateMallOrderDto, MallCartQuantityDto, MallCommissionRuleDto, MallOrderQuoteDto, MallProductDto, MallSettlementAdjustmentDto, MallShipmentUpdateDto, MallShipDto } from "./mall.dto";

const pipe = new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } });

describe("mall checkout dto", () => {
  it("accepts zero cart quantity as delete semantics", async () => {
    const result = await pipe.transform({ quantity: 0 }, { type: "body", metatype: MallCartQuantityDto });
    expect(result.quantity).toBe(0);
  });

  it("rejects negative cart quantities", async () => {
    await expect(pipe.transform({ quantity: -1 }, { type: "body", metatype: MallCartQuantityDto })).rejects.toThrow();
  });

  it("preserves a signed quote token on order submission", async () => {
    const result = await pipe.transform({ items: [{ skuId: 1, quantity: 1 }], quoteToken: "payload.signature" }, { type: "body", metatype: CreateMallOrderDto });
    expect(result.quoteToken).toBe("payload.signature");
  });

  it("preserves a promotion code during signed quoting", async () => {
    const result = await pipe.transform({ items: [{ skuId: 1, quantity: 1 }], promotionCode: " shop-9 " }, { type: "body", metatype: MallOrderQuoteDto });
    expect(result.promotionCode).toBe(" shop-9 ");
  });

  it("transforms split shipment item quantities", async () => {
    const result = await pipe.transform({ expressNo: "SF123", businessKey: "shipment-1", items: [{ orderItemId: "7", quantity: "2" }] }, { type: "body", metatype: MallShipDto });
    expect(result.items).toEqual([{ orderItemId: 7, quantity: 2 }]);
    expect(result.businessKey).toBe("shipment-1");
  });

  it("rejects zero quantities in a shipment package", async () => {
    await expect(pipe.transform({ expressNo: "SF123", items: [{ orderItemId: 7, quantity: 0 }] }, { type: "body", metatype: MallShipDto })).rejects.toThrow();
  });

  it("requires an audit reason when changing a tracking number", async () => {
    await expect(pipe.transform({ expressNo: "SF456" }, { type: "body", metatype: MallShipmentUpdateDto })).rejects.toThrow();
  });

  it("transforms commission rule basis points and agent levels", async () => {
    const result = await pipe.transform({ name: "渠道佣金", scopeType: "channel", promotionCodeId: "8", directRateBps: "500", agentLevelRatesBps: [200, 100] }, { type: "body", metatype: MallCommissionRuleDto });
    expect(result.promotionCodeId).toBe(8);
    expect(result.directRateBps).toBe(500);
    expect(result.agentLevelRatesBps).toEqual([200, 100]);
  });

  it("rejects commission rates above one hundred percent", async () => {
    await expect(pipe.transform({ name: "错误规则", scopeType: "tenant", directRateBps: 10001 }, { type: "body", metatype: MallCommissionRuleDto })).rejects.toThrow();
  });

  it("transforms signed integer-fen settlement adjustments", async () => {
    const result = await pipe.transform({ amountFen: "-123", reason: "退款补差", businessKey: "settlement-adjustment-1" }, { type: "body", metatype: MallSettlementAdjustmentDto });
    expect(result.amountFen).toBe(-123);
  });

  it("requires a settlement adjustment reason and business key", async () => {
    await expect(pipe.transform({ amountFen: 100 }, { type: "body", metatype: MallSettlementAdjustmentDto })).rejects.toThrow();
  });

  it("preserves structured product detail blocks", async () => {
    const result = await pipe.transform({ title: "商品", detailBlocks: [{ type: "text", content: "详情" }] }, { type: "body", metatype: MallProductDto });
    expect(result.detailBlocks).toEqual([{ type: "text", content: "详情" }]);
  });
});
