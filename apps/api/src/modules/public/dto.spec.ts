import { ValidationPipe } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { FieldType } from "../../shared/domain";
import { RegisterDto } from "./dto";

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
