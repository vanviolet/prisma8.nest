import { Injectable, StreamableFile } from "@nestjs/common";
import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { map, type Observable } from "rxjs";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (data instanceof StreamableFile) {
          return data;
        }
        if (
          typeof data === "object" &&
          data !== null &&
          ("data" in data || "message" in data)
        ) {
          return data;
        }
        return { data };
      }),
    );
  }
}
