import { request } from "./api";
import { clientError } from "./error-reporting";

export function preferredMallWechatPaymentScene() {
  // #ifdef H5
  return "h5";
  // #endif
  return "jsapi";
}

export async function handleMallWechatPayResult(pay: any) {
  const payParams = pay?.payParams || {};
  if (pay?.mode === "sandbox") {
    const callbackPath = pay.callbackPath || payParams.callbackPath || "/payment/mall/wechat/callback";
    await request(callbackPath, { method: "POST", data: { ...payParams, amount: Number(pay.amount) } });
    uni.showToast({ title: "微信支付成功", icon: "none" });
    return false;
  }
  if (payParams.h5Url) {
    // #ifdef H5
    window.location.href = String(payParams.h5Url);
    return true;
    // #endif
    uni.showModal({ title: "微信支付", content: String(payParams.h5Url), showCancel: false });
    return false;
  }
  if (payParams.tradeType === "JSAPI" && payParams.package) {
    await requestWechatPayment(payParams);
    uni.showToast({ title: "微信支付完成", icon: "none" });
    return false;
  }
  if (payParams.codeUrl) {
    const codeUrl = String(payParams.codeUrl);
    uni.showModal({
      title: "微信支付",
      content: "已生成微信 Native 支付链接，请使用微信扫码完成付款；如现场需要协助，可复制链接给客服核对。",
      confirmText: "复制链接",
      cancelText: "知道了",
      success: (res) => {
        if (res.confirm) uni.setClipboardData({ data: codeUrl, success: () => uni.showToast({ title: "支付链接已复制", icon: "none" }) });
      }
    });
    return false;
  }
  uni.showToast({ title: "微信支付已发起，请完成付款", icon: "none" });
  return false;
}

function requestWechatPayment(params: Record<string, any>) {
  return new Promise<void>((resolve, reject) => {
    uni.requestPayment({
      provider: "wxpay",
      timeStamp: String(params.timeStamp),
      nonceStr: String(params.nonceStr),
      package: String(params.package),
      signType: String(params.signType || "RSA"),
      paySign: String(params.paySign),
      success: () => resolve(),
      fail: (error) => reject(clientError(error, "微信支付失败", { provider: "wxpay", tradeType: params.tradeType || "JSAPI" }))
    } as any);
  });
}
