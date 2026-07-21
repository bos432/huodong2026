import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentAdmin = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest();
  const user = request.user;
  if (!user) return user;
  const forwarded = request.headers?.["x-forwarded-for"];
  const clientIp = typeof forwarded === "string" && forwarded.trim() ? forwarded.split(",")[0].trim() : request.ip || request.socket?.remoteAddress || null;
  return { ...user, clientIp, userAgent: request.headers?.["user-agent"] || null, requestId: request.requestId || null };
});
