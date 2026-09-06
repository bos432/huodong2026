export function existingActivityBooking(activity: { myBooking?: { registration?: { id?: number; status?: string } | null; waitlist?: { id?: number; status?: string } | null } } | null | undefined) {
  const row = activity?.myBooking?.registration;
  if (Number(row?.id) > 0) {
    const states: Record<string, { label: string; hint: string }> = {
      pending_payment: { label: '查看待付款', hint: '已有待付款报名，请在报名详情处理原订单。' },
      pending_review: { label: '查看审核进度', hint: '报名正在审核，请勿重复提交。' },
      approved: { label: '报名已完成', hint: '可查看报名凭证、活动空间和签到信息。' },
      checked_in: { label: '查看参与记录', hint: '已完成签到，可查看活动记录。' }
    };
    if (states[row!.status || '']) return { ...states[row!.status!], registrationId: Number(row!.id), waiting: false };
  }
  if (activity?.myBooking?.waitlist?.status === 'waiting') return { label: '已加入候补', hint: '正在等待名额释放，递补结果以主办方确认为准。', registrationId: 0, waiting: true };
  return null;
}
