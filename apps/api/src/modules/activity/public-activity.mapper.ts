import { Activity } from "../../entities/activity.entity";
import { testActivityBookingMessage } from "../../shared/activity-test-policy";

export type PublicActivityMapperDependencies = {
  environment?: string;
  toTenant: (tenant: Activity["tenant"]) => unknown;
  toMemberLevel: (level: Activity["minMemberLevel"]) => unknown;
};

export type PublicActivityProjection = Record<string, unknown>;

/**
 * Maps an Activity entity to the public contract without exposing entity-only
 * fields. Querying, tenant resolution and capacity statistics stay outside so
 * this boundary can be tested without a database.
 */
export function toPublicActivity(activity: Activity, dependencies: PublicActivityMapperDependencies): PublicActivityProjection {
  const rules = activity.eligibilityRules || null;
  return {
    id: activity.id,
    isTest: Boolean(activity.isTest),
    bookingDisabledReason: testActivityBookingMessage(activity.isTest, dependencies.environment),
    title: activity.title,
    tenant: dependencies.toTenant(activity.tenant),
    coverUrl: activity.coverUrl,
    shareTitle: activity.shareTitle,
    shareDescription: activity.shareDescription,
    shareImageUrl: activity.shareImageUrl,
    description: activity.description,
    notice: activity.notice,
    location: activity.location,
    locationProvince: activity.locationProvince,
    locationCity: activity.locationCity,
    locationDistrict: activity.locationDistrict,
    locationLatitude: activity.locationLatitude,
    locationLongitude: activity.locationLongitude,
    locationMapUrl: activity.locationMapUrl,
    startTime: activity.startTime,
    endTime: activity.endTime,
    registrationDeadline: activity.registrationDeadline,
    capacity: activity.capacity,
    price: activity.price,
    status: activity.status,
    cancelledAt: activity.cancelledAt,
    cancellationReason: activity.cancellationReason,
    featured: activity.featured,
    requireReview: activity.requireReview,
    allowCancel: activity.allowCancel,
    category: activity.category ? {
      id: activity.category.id,
      name: activity.category.name,
      iconUrl: activity.category.iconUrl,
      coverUrl: activity.category.coverUrl
    } : null,
    agent: activity.agent ? {
      id: activity.agent.id,
      name: activity.agent.name,
      region: activity.agent.region
    } : null,
    minMemberLevel: dependencies.toMemberLevel(activity.minMemberLevel),
    priorityMemberLevel: dependencies.toMemberLevel(activity.priorityMemberLevel),
    priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt,
    fields: (activity.fields || []).map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      options: field.options || [],
      sortOrder: field.sortOrder
    })),
    formSchemaVersion: activity.formSchemaVersion,
    eligibilityRules: rules ? {
      minAge: rules.minAge,
      maxAge: rules.maxAge,
      allowedRegions: rules.allowedRegions || [],
      maxRegistrationsPerUser: rules.maxRegistrationsPerUser,
      requirePrivacyConsent: rules.requirePrivacyConsent,
      allowCompanions: rules.allowCompanions,
      maxCompanions: rules.maxCompanions
    } : null
  };
}
