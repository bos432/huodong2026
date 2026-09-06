export function testActivityBookingMessage(isTest: boolean | undefined, environment: string | undefined) {
  return isTest && environment === 'production' ? '测试活动不开放正式报名或支付' : null;
}
