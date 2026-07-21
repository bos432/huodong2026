import { ValidationPipe } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { FieldType } from "../../shared/domain";
import { AidApplicationCreateDto, CreateCourseOrderDto, MarketingPopupEventDto, RegisterDto } from "./dto";

describe("MarketingPopupEventDto", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });

  it("accepts the public popup event context and rejects unsupported values", async () => {
    await expect(pipe.transform({ event: "click", pageKey: "home", platform: "h5" }, { type: "body", metatype: MarketingPopupEventDto })).resolves.toMatchObject({ event: "click", pageKey: "home", platform: "h5" });
    await expect(pipe.transform({ event: "unknown", pageKey: "home", platform: "h5" }, { type: "body", metatype: MarketingPopupEventDto })).rejects.toThrow();
    await expect(pipe.transform({ event: "click", pageKey: "unknown", platform: "h5" }, { type: "body", metatype: MarketingPopupEventDto })).rejects.toThrow();
  });
});

describe("RegisterDto", () => {
  it("keeps nested registration answer fields when whitelist validation is enabled", async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    });

    const result = await pipe.transform(
      {
        answers: [
          {
            fieldId: "1",
            label: "Name",
            type: FieldType.Text,
            value: "Browser acceptance user",
            ignored: "removed"
          },
          {
            fieldId: 2,
            label: "Tags",
            type: FieldType.MultipleChoice,
            value: ["A", "B"]
          }
        ]
      },
      { type: "body", metatype: RegisterDto }
    );

    expect(result.answers).toEqual([
      { fieldId: 1, label: "Name", type: FieldType.Text, value: "Browser acceptance user" },
      { fieldId: 2, label: "Tags", type: FieldType.MultipleChoice, value: ["A", "B"] }
    ]);
  });
});

describe("AidApplicationCreateDto", () => {
  it("requires explicit sensitive-data consent and a business key", async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });
    const valid = { type: "personal", applicantName: "张三", phone: "13800138000", city: "成都", wechat: "wx", supportCategory: "活动名额", requestedSupport: "申请支持", situation: "情况说明", consentAccepted: true, consentVersion: "aid-privacy-v1", businessKey: "aid-submit-001" };
    expect((await pipe.transform(valid, { type: "body", metatype: AidApplicationCreateDto })).consentAccepted).toBe(true);
    await expect(pipe.transform({ ...valid, consentAccepted: undefined }, { type: "body", metatype: AidApplicationCreateDto })).rejects.toThrow();
  });
});

describe("CreateCourseOrderDto", () => {
  it("keeps a bounded client order key for idempotent retries", async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });
    const result = await pipe.transform({ paymentMethod: "wechat", clientOrderKey: "course-order-001", ignored: true }, { type: "body", metatype: CreateCourseOrderDto });
    expect(result).toEqual({ paymentMethod: "wechat", clientOrderKey: "course-order-001" });
    await expect(pipe.transform({ clientOrderKey: "x".repeat(121) }, { type: "body", metatype: CreateCourseOrderDto })).rejects.toThrow();
  });
});
