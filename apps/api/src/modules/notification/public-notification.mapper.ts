import { Notification } from "../../entities/notification.entity";

export type PublicNotificationMapperDependencies = {
  toVariables: (variables: Record<string, string> | null | undefined, includeSensitive: boolean) => Record<string, string>;
  sanitizeText: (text: string, original: Record<string, string> | null | undefined, safe: Record<string, string>, includeSensitive: boolean) => string;
  toUser: (user: Notification["user"], includeSensitive: boolean) => unknown;
};

/** Maps a notification to the admin/public record without delivery credentials. */
export function toPublicNotificationRecord(
  row: Notification,
  includeSensitive = false,
  dependencies: PublicNotificationMapperDependencies
) {
  const variables = dependencies.toVariables(row.variablesSnapshot, includeSensitive);
  return {
    id: row.id,
    channel: row.channel,
    scene: row.scene,
    tenantScopeKey: row.tenantScopeKey,
    title: dependencies.sanitizeText(row.title, row.variablesSnapshot, variables, includeSensitive),
    content: dependencies.sanitizeText(row.content, row.variablesSnapshot, variables, includeSensitive),
    status: row.status,
    provider: row.provider,
    providerMessageId: includeSensitive ? row.providerMessageId : null,
    errorMessage: includeSensitive ? row.errorMessage : null,
    providerTemplateId: row.providerTemplateId,
    templateVersion: row.templateVersion,
    suppressedReason: row.suppressedReason,
    variablesSnapshot: variables,
    retryCount: row.retryCount,
    sentAt: row.sentAt,
    failedAt: row.failedAt,
    user: dependencies.toUser(row.user, includeSensitive),
    activity: row.activity ? {
      id: row.activity.id,
      title: row.activity.title,
      status: row.activity.status,
      tenant: row.activity.tenant ? {
        id: row.activity.tenant.id,
        code: row.activity.tenant.code,
        name: row.activity.tenant.name
      } : null
    } : null,
    remark: row.remark,
    sensitiveMasked: !includeSensitive,
    createdAt: row.createdAt
  };
}
