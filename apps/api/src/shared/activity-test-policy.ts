export function isDemoActivityTitle(title: unknown) {
  return /^\s*[【\[]演示[】\]]/.test(String(title || ''));
}

export function testActivityBookingMessage(isTest: boolean | undefined, environment: string | undefined, title?: unknown) {
  if (environment !== 'production') return null;
  if (isTest) return '测试活动不开放正式报名或支付';
  return isDemoActivityTitle(title) ? '演示活动不开放正式报名或支付' : null;
}
