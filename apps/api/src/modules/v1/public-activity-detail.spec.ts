import { describe, expect, it } from "vitest";
import { buildPublicActivityGallery, toPublicAttendee } from "./public-activity-detail";

describe("public activity detail projection", () => {
  it("builds a deduplicated bounded gallery from public activity media", () => {
    expect(buildPublicActivityGallery({
      coverUrl: " cover.jpg ",
      sections: [{ imageUrl: "cover.jpg" }, { imageUrl: "space.jpg" }, { imageUrl: null }]
    })).toEqual(["cover.jpg", "space.jpg"]);
  });

  it("returns only masked attendee fields", () => {
    expect(toPublicAttendee({ id: 7, nickname: " 林野 ", avatarUrl: "avatar.jpg", checkedIn: true })).toEqual({
      id: 7,
      name: "林野",
      avatarUrl: "avatar.jpg",
      checkedIn: true
    });
  });
});
