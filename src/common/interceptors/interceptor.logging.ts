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
    const started_at = Date.now();

    const log_request = (status_code: number, error_message?: string, error_stack?: string) => {
      const duration = Date.now() - started_at;
      const message = [
        `${method} ${path} ${status_code} ${duration}ms`,
        error_message,
      ]
        .filter(Boolean)
        .join(" - ");

      if (status_code >= 500) {
        this.logger.error(message, error_stack);
      } else {
        this.logger.log(message);
      }
    };

    return next.handle().pipe(
      tap({
        next: () => log_request(response.statusCode),
        error: (error: unknown) => {
          const status_code = error instanceof HttpException ? error.getStatus() : 500;
          const exception_response = error instanceof HttpException ? error.getResponse() : undefined;
          const response_message = typeof exception_response === "string"
            ? exception_response
            : typeof exception_response === "object" && exception_response !== null && "message" in exception_response
              ? exception_response.message
              : undefined;
          const error_message = typeof response_message === "string"
            ? response_message
            : Array.isArray(response_message)
              ? response_message.filter((message): message is string => typeof message === "string").join("; ")
              : error instanceof Error && error.message
                ? error.message
                : typeof error === "string"
                  ? error
                  : "Unknown error";
          const error_stack = error instanceof Error ? error.stack : undefined;

          log_request(status_code, error_message, error_stack);
        },
      }),
    );
  }
}
