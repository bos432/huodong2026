import { Injectable } from "@nestjs/common";
import { AutomaticSmsService, PublishAutomaticSmsInput } from "./automatic-sms.service";
import { AutomaticWechatService } from "./automatic-wechat.service";

@Injectable()
export class AutomaticNotificationService {
  constructor(
    private readonly sms: AutomaticSmsService,
    private readonly wechat: AutomaticWechatService
  ) {}

  async publish(input: PublishAutomaticSmsInput) {
    const [sms, wechat] = await Promise.all([this.sms.publish(input), this.wechat.publish(input)]);
    return { sms, wechat };
  }

  async publishForActivity(input: { scene: "activityCancelled" | "activityChanged"; activityId: number; businessId: string | number; tenantId?: number | null; variables?: Record<string, unknown> }) {
    const [sms, wechat] = await Promise.all([this.sms.publishForActivity(input), this.wechat.publishForActivity(input)]);
    return { sms, wechat };
  }
}
