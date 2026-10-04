import { HttpException, Injectable, Logger } from "@nestjs/common";
import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { tap, type Observable } from "rxjs";

interface RequestLogContext {
  method: string;
  url: string;
}

interface ResponseLogContext {
  statusCode: number;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestLogContext>();
    const response = context.switchToHttp().getResponse<ResponseLogContext>();
    const method = request.method;
    const path = request.url.split("?")[0] ?? request.url;
    const startedAt = Date.now();

    const logRequest = (statusCode: number, errorMessage?: string) => {
      const duration = Date.now() - startedAt;
      const message = [
        `${method} ${path} ${statusCode} ${duration}ms`,
        errorMessage,
      ]
        .filter(Boolean)
        .join(" - ");

      if (statusCode >= 500) {
        this.logger.error(message);
      } else {
        this.logger.log(message);
      }
    };

    return next.handle().pipe(
      tap({
        next: () => logRequest(response.statusCode),
        error: (error: unknown) => {
          const statusCode = error instanceof HttpException ? error.getStatus() : 500;
          const errorMessage = error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "Unknown error";

          logRequest(statusCode, errorMessage);
        },
      }),
    );
  }
}
