import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("community post resubmission client contract", () => {
  const publish = readFileSync("../mobile/src/pages/community/publish.vue", "utf8");
  const history = readFileSync("../mobile/src/pages/user/community-posts.vue", "utf8");

  it("preserves rejected post data while editing and uses the patch endpoint", () => {
    expect(publish).toContain("editingPostId.value");
    expect(publish).toContain("routePostId.value");
    expect(publish).toContain('method: isEditing ? "PATCH" : "POST"');
    expect(publish).toContain("Array.isArray(editingPost.images)");
  });

  it("provides a direct edit action from the user's rejected-post list", () => {
    expect(history).toContain("function editPost");
    expect(history).toContain("post.status === 'rejected' ? editPost(post) : openPost(post)");
  });
});
