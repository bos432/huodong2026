import { Registration } from "../../entities/registration.entity";

export type PublicActivityMapper = (activity: Registration["activity"]) => unknown;

/** Maps a registration without exposing the user's check-in code or entity relations. */
export function toPublicRegistration(registration: Registration, toActivity: PublicActivityMapper) {
  return {
    id: registration.id,
    activity: toActivity(registration.activity),
    status: registration.status,
    answers: registration.answers || [],
    formSchemaVersion: registration.formSchemaVersion,
    formSnapshot: registration.formSnapshot || [],
    companions: registration.companions || [],
    privacyConsentAt: registration.privacyConsentAt,
    reviewRemark: registration.reviewRemark,
    cancelReason: registration.cancelReason,
    createdAt: registration.createdAt,
    updatedAt: registration.updatedAt
  };
}
