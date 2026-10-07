import { Injectable } from "@nestjs/common";
import { Notification } from "../../entities/notification.entity";
import { PublicNotificationMapperDependencies, toPublicNotificationRecord } from "./public-notification.mapper";

/** Bounded notification read service; delivery, retries and provider calls stay in V1Service. */
@Injectable()
export class NotificationService {
  toPublicRecord(row: Notification, includeSensitive: boolean, dependencies: PublicNotificationMapperDependencies) {
    return toPublicNotificationRecord(row, includeSensitive, dependencies);
  }
}
