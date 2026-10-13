export type ReadinessConfigurationAssessment = {
  configured: boolean;
  blockers: string[];
  requiresExternalEvidence: boolean;
};

export const REQUIRED_WECHAT_ACCEPTANCE_SCENES = [
  "registrationApproved",
  "paymentSucceeded",
  "refundSucceeded",
  "activityReminder",
  "checkInSucceeded",
  "reviewInvitation"
] as const;

export function assessReadinessConfiguration(key: string, snapshot: any): ReadinessConfigurationAssessment {
  const blockers: string[] = [];
  let requiresExternalEvidence = true;
  const has = (value: unknown) => typeof value === "string" ? value.trim().length > 0 : Boolean(value);

  if (key === "payment_config") {
    const ready = has(snapshot?.paymentAppId) && has(snapshot?.merchantId) && has(snapshot?.apiV3Key)
      && has(snapshot?.privateKeyConfigured) && has(snapshot?.certificateSerial) && has(snapshot?.platformCertificateConfigured);
    if (!ready) blockers.push("缺少微信支付商户配置");
  } else if (key === "payment_callbacks") {
    const isHttps = (value: unknown) => { try { return new URL(String(value || "")).protocol === "https:"; } catch { return false; } };
    if (!isHttps(snapshot?.paymentNotifyUrl) || !isHttps(snapshot?.refundNotifyUrl)) blockers.push("缺少支付或退款回调地址");
  } else if (key === "sms") {
    const provider = String(snapshot?.smsProvider || "").trim();
    if (!snapshot?.smsEnabled) blockers.push("短信服务尚未启用");
    if (!["luosimao-sms", "tencent-cloud-sms"].includes(provider)) blockers.push("短信服务商未接入或配置不完整");
    if (provider === "luosimao-sms" && (!has(snapshot?.smsSecret) || !has(snapshot?.smsSign))) blockers.push("螺丝帽短信缺少 API Key 或已审核签名");
    if (provider === "tencent-cloud-sms" && (!has(snapshot?.smsSecret) || !has(snapshot?.smsAccessKeyId) || !has(snapshot?.smsSign) || !has(snapshot?.smsTemplateId) || !has(snapshot?.smsSdkAppId))) blockers.push("腾讯云短信缺少密钥、签名、模板或 SDK AppID");
  } else if (key === "wechat_subscription") {
    if (!snapshot?.providerEnabled || !snapshot?.automaticEnabled) blockers.push("微信订阅消息服务或自动通知尚未启用");
    if (!["wechat-subscribe-message", "wechat-subscribe"].includes(String(snapshot?.provider || "").trim())) blockers.push("微信消息服务商未配置为受支持的真实订阅消息通道");
    if (!has(snapshot?.wechatAppId) || !has(snapshot?.wechatAppSecret)) blockers.push("微信订阅消息缺少小程序 AppID 或 AppSecret");
    const templateScenes = new Set(Array.isArray(snapshot?.activeTemplateScenes) ? snapshot.activeTemplateScenes : []);
    const enabledScenes = new Set(Array.isArray(snapshot?.enabledScenes) ? snapshot.enabledScenes : []);
    const missingTemplates = REQUIRED_WECHAT_ACCEPTANCE_SCENES.filter((scene) => !templateScenes.has(scene));
    const disabledScenes = REQUIRED_WECHAT_ACCEPTANCE_SCENES.filter((scene) => !enabledScenes.has(scene));
    if (missingTemplates.length) blockers.push(`缺少已审核模板：${missingTemplates.join("、")}`);
    if (disabledScenes.length) blockers.push(`核心通知场景未启用：${disabledScenes.join("、")}`);
  } else if (key === "miniprogram_acceptance") {
    if (!has(snapshot?.appId) || !has(snapshot?.version)) blockers.push("小程序 AppID 或验收版本未配置");
    if (!snapshot?.successfulUpload || snapshot?.uploadedVersion !== snapshot?.version) blockers.push("当前 AppID 与验收版本没有匹配的成功上传记录");
  } else if (key === "test_fixtures") {
    const fixtures = Array.isArray(snapshot) ? snapshot : [];
    for (const [kind, label] of [["test_account", "测试账号"], ["test_order", "测试订单"]]) {
      if (!fixtures.some((fixture) => fixture?.kind === kind && ["ready", "passed"].includes(String(fixture?.status)))) blockers.push(`${label}尚未准备`);
    }
  } else {
    blockers.push("不支持该验收项的配置检查");
    requiresExternalEvidence = false;
  }

  return { configured: blockers.length === 0, blockers, requiresExternalEvidence };
}
