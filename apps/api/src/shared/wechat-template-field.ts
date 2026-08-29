const WECHAT_TEMPLATE_FIELD_KEY = /^[A-Za-z]+(?:_[A-Za-z]+)*\d+$/;

export function isWechatTemplateFieldKey(value: string) {
  return WECHAT_TEMPLATE_FIELD_KEY.test(value);
}
