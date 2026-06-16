import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req } from "@nestjs/common";
import { ReviewInput, TrackShareInput, V1Service } from "./v1.service";
import { PublicService } from "../public/public.service";

@Controller("public")
export class PublicV1Controller {
  constructor(private readonly service: V1Service, private readonly publicAuth: PublicService) {}

  @Get("announcements")
  announcements(@Req() req: any, @Query("tenantCode") tenantCode?: string) {
    return this.service.publicAnnouncements(this.tenantContext(req, tenantCode));
  }

  private tenantContext(req: any, tenantCode?: string) {
    const headerCode = req.headers?.["x-tenant-code"];
    const host = req.headers?.["x-forwarded-host"] || req.headers?.host || null;
    return {
      tenantCode: tenantCode || (typeof headerCode === "string" ? headerCode : Array.isArray(headerCode) ? headerCode[0] : null),
      host: typeof host === "string" ? host : null
    };
  }

  @Get("activities/:id/enhanced")
  enhancedActivity(@Req() req: any, @Param("id", ParseIntPipe) id: number, @Query("userId") userId?: string, @Query("source") source?: string, @Query("inviteCode") inviteCode?: string, @Query("tenantCode") tenantCode?: string) {
    return this.service.enhancedActivity(id, this.publicAuth.optionalUserIdFromAuthorization(req.headers?.authorization), source, inviteCode, this.tenantContext(req, tenantCode));
  }

  @Post("activities/:id/share-poster")
  async sharePoster(@Req() req: any, @Param("id", ParseIntPipe) id: number, @Body() body: { tenantCode?: string }, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicAuth.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.sharePoster(id, user, this.tenantContext(req, tenantCode || body.tenantCode));
  }

  @Post("activities/:id/track-share")
  trackShare(@Req() req: any, @Param("id", ParseIntPipe) id: number, @Body() body: TrackShareInput & { tenantCode?: string }, @Query("tenantCode") tenantCode?: string) {
    return this.service.trackShare(id, body, this.tenantContext(req, tenantCode || body.tenantCode));
  }

  @Get("activities/:id/reviews")
  reviews(@Req() req: any, @Param("id", ParseIntPipe) id: number, @Query("tenantCode") tenantCode?: string) {
    return this.service.activityReviews(id, this.tenantContext(req, tenantCode));
  }

  @Post("registrations/:id/review")
  async createReview(@Req() req: any, @Param("id", ParseIntPipe) id: number, @Body() body: ReviewInput & { tenantCode?: string }, @Query("tenantCode") tenantCode?: string) {
    const user = await this.publicAuth.requireUserFromAuthorization(req.headers?.authorization);
    return this.service.createReview(id, body, user, this.tenantContext(req, tenantCode || body.tenantCode));
  }
}
