import { withTenantCode } from "./api";

function routeRecognizedCode(value: unknown) {
  const text = String(value || "").trim();
  if (/^ACTCHK1\.\d+\.\d+\.\d+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(text)) {
    uni.navigateTo({ url: `/pages/admin/check-in?code=${encodeURIComponent(text)}` });
    return;
  }
  const matched = text.match(/[?#&]id=(\d+)/);
  if (!matched || !(/chaimen666\.com/.test(text) || /\/pages\/activity\/detail/.test(text))) {
    uni.showToast({ title: "未识别为平台活动码，请在活动空间长按群二维码加入", icon: "none", duration: 2800 });
    return;
  }
  uni.navigateTo({ url: withTenantCode(`/pages/activity/detail?id=${matched[1]}`) });
}

export function openActivityQuickAction() {
  // #ifdef MP-WEIXIN
  uni.showActionSheet({
    itemList: ["相机扫码", "从图片识别二维码"],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) {
        uni.scanCode({ onlyFromCamera: true, success: (result) => routeRecognizedCode(result.result), fail: () => uni.showToast({ title: "未完成扫码", icon: "none" }) });
        return;
      }
      uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album"],
        success: ({ tempFilePaths }) => {
          uni.previewImage({ urls: tempFilePaths, current: tempFilePaths[0] });
          uni.showToast({ title: "预览后长按图片，即可识别群二维码", icon: "none", duration: 2600 });
        }
      });
    }
  });
  // #endif
  // #ifdef H5
  uni.showModal({ title: "请使用微信扫码", content: "小程序支持相机扫码和长按图片识别群二维码。", showCancel: false });
  // #endif
}
