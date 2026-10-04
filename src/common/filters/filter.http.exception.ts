import { Catch, HttpException, HttpStatus } from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import type { RequestContext } from "@/common/types/type.request.context";
import { AppException } from "@/common/exceptions/exception.app";
import { ErrorCode } from "@/common/enums/enum.error.code";

interface HttpResponse {
  status(status_code: number): HttpResponse;
  json(body: unknown): void;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestContext & { url: string }>();
    const response = context.getResponse<HttpResponse>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const app_exception = exception instanceof AppException ? exception : undefined;
    const code = app_exception?.code ?? this.get_error_code(status);
    const body = {
      status_code: status,
      code,
      message: status >= 500 ? "Internal server error" : this.get_message(exception),
      ...(app_exception?.errors ? { errors: app_exception.errors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url.split("?")[0] ?? request.url,
    };

    response.status(status).json(body);
  }

  private get_message(exception: unknown): string {
    if (exception instanceof AppException) {
      return exception.message;
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === "string") {
        return response;
      }
      if (typeof response === "object" && response !== null && "message" in response) {
        const message = response.message;
        return typeof message === "string" ? message : "Request failed";
      }
    }

    return "Internal server error";
  }

  private get_error_code(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.validation_error;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.unauthorized;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.forbidden;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.not_found;
      case HttpStatus.CONFLICT:
        return ErrorCode.conflict;
      default:
        return status >= 500 ? ErrorCode.internal_server_error : ErrorCode.validation_error;
    }
  }
}
