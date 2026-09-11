import { afterEach, describe, expect, it, vi } from "vitest";
import { chooseAvatarImage, isStoredAvatar } from "../apps/mobile/src/avatar-picker";

afterEach(() => vi.unstubAllGlobals());

describe("avatar image selection", () => {
  it.each(["wxfile://avatar.jpg", "http://tmp/avatar.jpg", "https://tmp/avatar.jpg", "http://usr/avatar.jpg", "blob:http://localhost/avatar"])("uploads temporary file %s instead of saving a device-only URL", filePath => {
    expect(isStoredAvatar(filePath)).toBe(false);
  });

  it.each(["https://rd.chaimen666.com/uploads/avatar.jpg", "/uploads/avatar.jpg"])("preserves already uploaded avatar %s", filePath => {
    expect(isStoredAvatar(filePath)).toBe(true);
  });

  it("opens the image picker and returns the selected file for upload", async () => {
    const chooseImage = vi.fn(options => options.success({ tempFilePaths: ["wxfile://avatar.jpg"] }));
    vi.stubGlobal("uni", { chooseImage });
    await expect(chooseAvatarImage()).resolves.toBe("wxfile://avatar.jpg");
    expect(chooseImage).toHaveBeenCalledWith(expect.objectContaining({ count: 1, sourceType: ["album", "camera"] }));
  });

  it("leaves the existing avatar unchanged when selection is cancelled", async () => {
    vi.stubGlobal("uni", { chooseImage: options => options.fail({ errMsg: "chooseImage:fail cancel" }) });
    await expect(chooseAvatarImage()).resolves.toBe("");
  });

  it("reports permission and picker failures instead of swallowing them", async () => {
    vi.stubGlobal("uni", { chooseImage: options => options.fail({ errMsg: "chooseImage:fail auth deny" }) });
    await expect(chooseAvatarImage()).rejects.toThrow("无法打开图片选择");
  });

  it("does not upload an empty selection", async () => {
    vi.stubGlobal("uni", { chooseImage: options => options.success({ tempFilePaths: [] }) });
    await expect(chooseAvatarImage()).rejects.toThrow("未读取到图片");
  });
});
