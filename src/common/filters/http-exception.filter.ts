import { Catch, HttpException, HttpStatus } from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import type { RequestContext } from "../types/request-context.type";
import { AppException } from "../exceptions/app.exception";
import { ErrorCode } from "../enums/error-code.enum";

interface HttpResponse {
  status(statusCode: number): HttpResponse;
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
    const appException = exception instanceof AppException ? exception : undefined;
    const code = appException?.code ?? this.getErrorCode(status);
    const body = {
      statusCode: status,
      code,
      message: status >= 500 ? "Internal server error" : this.getMessage(exception),
      ...(appException?.errors ? { errors: appException.errors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url.split("?")[0] ?? request.url,
    };

    response.status(status).json(body);
  }

  private getMessage(exception: unknown): string {
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

  private getErrorCode(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      default:
        return status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.VALIDATION_ERROR;
    }
  }
}
