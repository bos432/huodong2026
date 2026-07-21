export const NOTIFICATION_VARIABLES = ["activityTitle", "activityLocation", "location", "startTime", "endTime", "userName", "userPhone", "registrationStatus", "checkInCode"] as const;

export function notificationTemplateVariables(...templates: string[]) {
  return Array.from(new Set(templates.flatMap(template => Array.from(String(template || "").matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g), match => match[1]))));
}

export function unknownNotificationTemplateVariables(...templates: string[]) {
  const allowed = new Set<string>(NOTIFICATION_VARIABLES);
  return notificationTemplateVariables(...templates).filter(variable => !allowed.has(variable));
}

export function renderNotificationTemplate(template: string, variables: Record<string, string>) {
  return String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => variables[key] ?? "");
}
