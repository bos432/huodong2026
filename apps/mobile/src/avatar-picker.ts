export function isStoredAvatar(value: string) {
  if (/^https?:\/\/(?:tmp|usr)\//i.test(value)) return false;
  return /^https?:\/\//i.test(value) || value.startsWith("/uploads/");
}

export function chooseAvatarImage(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success(result) {
        const filePath = result.tempFilePaths?.[0];
        if (filePath) resolve(filePath);
        else reject(new Error("未读取到图片，请重新选择"));
      },
      fail(error) {
        if (/cancel/i.test(error.errMsg || "")) resolve("");
        else reject(new Error("无法打开图片选择，请检查微信相册权限后重试"));
      }
    });
  });
}
