import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Activity } from "../../entities/activity.entity";
import { PublicActivityMapperDependencies, PublicActivityProjection, toPublicActivity } from "./public-activity.mapper";

export type ActivityPublicProjectionDependencies = Omit<PublicActivityMapperDependencies, "environment">;

/** Bounded activity read service; query and controller compatibility stay outside this boundary. */
@Injectable()
export class ActivityService {
  constructor(private readonly config: ConfigService) {}

  toPublicSummary(activity: Activity, dependencies: ActivityPublicProjectionDependencies): PublicActivityProjection {
    return toPublicActivity(activity, {
      environment: this.config.get("NODE_ENV"),
      ...dependencies
    });
  }
}
