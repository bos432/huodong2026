import { describe, expect, it } from "vitest";
import { notificationTemplateVariables, renderNotificationTemplate, unknownNotificationTemplateVariables } from "./notification-template";

describe("notification template", () => {
  it("deduplicates variables and reports unsupported names", () => {
    expect(notificationTemplateVariables("{{ userName }} {{activityTitle}}", "{{userName}} {{bad_name}}" )).toEqual(["userName", "activityTitle", "bad_name"]);
    expect(unknownNotificationTemplateVariables("{{userName}} {{bad_name}}")).toEqual(["bad_name"]);
  });
  it("renders known values without changing ordinary text", () => expect(renderNotificationTemplate("你好 {{ userName }}，{{activityTitle}}", { userName: "小明", activityTitle: "读书会" })).toBe("你好 小明，读书会"));
});
