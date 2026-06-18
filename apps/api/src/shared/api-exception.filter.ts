import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";

type ErrorResponseBody = {
  code: number;
  message: string;
  data: null;
  requestId?: string;
  details?: unknown;
  path?: string;
  timestamp: string;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<{ requestId?: string; originalUrl?: string; url?: string }>();
    const response = ctx.getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;
    const { message, details } = this.normalizeExceptionResponse(exceptionResponse, exception);
    const body: ErrorResponseBody = {
      code: status,
      message,
      data: null,
      requestId: request?.requestId,
      timestamp: new Date().toISOString()
    };
    if (details !== undefined) body.details = details;
    if (status >= 500) body.path = request?.originalUrl || request?.url;
    if (response.headersSent) return;
    if (status >= 500) {
      const rawMessage = exception instanceof Error ? exception.message : String(exception || "");
      console.error(JSON.stringify({ type: "api_error", requestId: request?.requestId, path: body.path, status, rawMessage, stack: exception instanceof Error ? exception.stack : undefined }));
    }
    response.status(status).json(body);
  }

  private normalizeExceptionResponse(response: unknown, exception: unknown) {
    if (typeof response === "string") return { message: response };
    if (response && typeof response === "object") {
      const record = response as Record<string, unknown>;
      const rawMessage = record.message;
      if (Array.isArray(rawMessage)) return { message: rawMessage.join("; "), details: rawMessage };
      if (typeof rawMessage === "string") return { message: rawMessage, details: this.pickDetails(record) };
      if (rawMessage && typeof rawMessage === "object") return { message: "请求处理失败", details: rawMessage };
      if (typeof record.error === "string") return { message: record.error, details: this.pickDetails(record) };
      if (Object.keys(record).length) return { message: "请求处理失败", details: record };
    }
    const databaseMessage = this.normalizeDatabaseExceptionMessage(exception);
    if (databaseMessage) return { message: databaseMessage };
    if (exception instanceof Error && exception.message) return { message: exception.message };
    return { message: "服务器开小差了，请稍后再试" };
  }

  private normalizeDatabaseExceptionMessage(exception: unknown) {
    const record = exception && typeof exception === "object" ? (exception as Record<string, unknown>) : {};
    const driverError = record.driverError && typeof record.driverError === "object" ? (record.driverError as Record<string, unknown>) : {};
    const message = exception instanceof Error ? exception.message : String(record.message || "");
    const code = String(driverError.code || record.code || "");
    const errno = Number(driverError.errno || record.errno || 0);
    if (code === "ER_BAD_FIELD_ERROR" || errno === 1054 || /Unknown column/i.test(message)) {
      const field = message.match(/Unknown column '([^']+)'/i)?.[1]?.split(".").pop();
      const scope = field === "clientOrderKey" ? "商城订单" : "系统";
      return `系统数据库未完成升级，${scope}缺少新版本字段${field ? `“${field}”` : ""}。请联系技术人员执行数据库迁移后再刷新页面。`;
    }
    if (code === "ER_NO_SUCH_TABLE" || errno === 1146 || /Table .* doesn't exist/i.test(message)) {
      return "系统数据库未完成初始化或升级，缺少必要数据表。请联系技术人员执行数据库迁移后再刷新页面。";
    }
    return "";
  }

  private pickDetails(record: Record<string, unknown>) {
    const details = { ...record };
    delete details.message;
    delete details.error;
    delete details.statusCode;
    return Object.keys(details).length ? details : undefined;
  }
}
