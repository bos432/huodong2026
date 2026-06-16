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
    if (exception instanceof Error && exception.message) return { message: exception.message };
    return { message: "服务器开小差了，请稍后再试" };
  }

  private pickDetails(record: Record<string, unknown>) {
    const details = { ...record };
    delete details.message;
    delete details.error;
    delete details.statusCode;
    return Object.keys(details).length ? details : undefined;
  }
}
