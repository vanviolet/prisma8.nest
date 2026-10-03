import { applyDecorators, type Type } from "@nestjs/common";
import {
  ApiExtraModels,
  ApiResponse,
  getSchemaPath,
} from "@nestjs/swagger";
import { ErrorResponseDto } from "../dto/error.response.dto";
import { PaginationMetaDto } from "../dto/pagination.meta.dto";
import { MessageResponseDto } from "../dto/message.response.dto";

export function ApiDataResponse(model: Type<unknown>, status = 200, description?: string) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      schema: {
        type: "object",
        required: ["data"],
        properties: { data: { $ref: getSchemaPath(model) } },
      },
    }),
  );
}

export function ApiPaginatedResponse(model: Type<unknown>) {
  return applyDecorators(
    ApiExtraModels(model, PaginationMetaDto),
    ApiResponse({
      status: 200,
      schema: {
        type: "object",
        required: ["data", "meta"],
        properties: {
          data: { type: "array", items: { $ref: getSchemaPath(model) } },
          meta: { $ref: getSchemaPath("PaginationMetaDto") },
        },
      },
    }),
  );
}

export function ApiErrorResponses() {
  return applyDecorators(
    ApiExtraModels(ErrorResponseDto),
    ApiResponse({ status: 400, type: ErrorResponseDto, description: "Invalid request" }),
    ApiResponse({ status: 404, type: ErrorResponseDto, description: "Resource not found" }),
    ApiResponse({ status: 409, type: ErrorResponseDto, description: "Resource conflict" }),
    ApiResponse({ status: 401, type: ErrorResponseDto, description: "Authentication required" }),
    ApiResponse({ status: 403, type: ErrorResponseDto, description: "Insufficient permissions" }),
    ApiResponse({ status: 422, type: ErrorResponseDto, description: "Request validation failed" }),
    ApiResponse({ status: 500, type: ErrorResponseDto, description: "Internal server error" }),
  );
}

export function ApiMessageResponse(status = 200) {
  return applyDecorators(
    ApiExtraModels(MessageResponseDto),
    ApiResponse({
      status,
      type: MessageResponseDto,
    }),
  );
}
