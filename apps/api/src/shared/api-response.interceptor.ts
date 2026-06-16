import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, { code: number; message: string; data: T; requestId?: string }> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<{ code: number; message: string; data: T; requestId?: string }> {
    const requestId = context.switchToHttp().getRequest<{ requestId?: string }>()?.requestId;
    return next.handle().pipe(map((data) => ({ code: 0, message: "ok", data, requestId })));
  }
}
