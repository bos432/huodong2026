import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { ActivityStatus, FieldType } from "../../shared/domain";
import { ActivityDto } from "./dto";

describe("admin activity dto", () => {
  it("keeps registration field option label and value with whitelist validation", async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    });

    const result = await pipe.transform(
      {
        title: "Test activity",
        location: "Test location",
        description: "Test description",
        featured: false,
        requireReview: false,
        allowCancel: true,
        status: ActivityStatus.Open,
        startTime: "2026-07-07 10:00:00",
        endTime: "2026-07-07 12:00:00",
        registrationDeadline: "2026-07-07 09:00:00",
        capacity: 10,
        price: 0,
        fields: [
          {
            label: "Interest",
            type: FieldType.SingleChoice,
            required: false,
            sortOrder: 1,
            options: [{ label: "Culture", value: "culture" }]
          }
        ]
      },
      { type: "body", metatype: ActivityDto }
    );

    expect(result.fields[0].options).toEqual([{ label: "Culture", value: "culture" }]);
  });
});
