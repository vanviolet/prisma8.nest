import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  StreamableFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBody,
  ApiConsumes,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { createReadStream } from "node:fs";
import { ErrorResponseDto } from "@/common/dto/dto.error.response";
import { ApiEndpoint } from "@/common/decorators/decorator.api.endpoint";
import {
  ApiDataResponse,
  ApiErrorResponses,
  ApiMessageResponse,
  ApiPaginatedResponse,
} from "@/common/decorators/decorator.api.response";
import { CurrentUser } from "@/common/decorators/decorator.current.user";
import type { AuthenticatedUser } from "@/common/types/type.request.context";
import { UploadQueryDto } from "./d.query/dto.upload.query";
import { UploadCreateDto } from "./d.request/dto.upload.create";
import { UploadResponseDto } from "./d.response/dto.upload.response";
import { UploadsResponseDto } from "./d.response/dto.uploads.response";
import { max_upload_size_bytes, uploads_directory } from "./constants.uploads";
import { UploadsService } from "./service.uploads";
import type { UploadedMultipartFile } from "./types/type.uploaded.multipart.file";

@ApiTags("Uploads")
@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploads_service: UploadsService) {}

  @Post()
  @ApiEndpoint({ summary: "Upload a file" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: UploadCreateDto })
  @ApiDataResponse(UploadResponseDto, HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.PAYLOAD_TOO_LARGE,
    type: ErrorResponseDto,
    description: "File exceeds the 10 MB limit",
  })
  @ApiErrorResponses()
  @UseInterceptors(
    FileInterceptor("file", {
      dest: uploads_directory,
      limits: { fileSize: max_upload_size_bytes, files: 1, fields: 0 },
    }),
  )
  upload_file(
    @UploadedFile() file: UploadedMultipartFile | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UploadResponseDto> {
    return this.uploads_service.create_upload(file, user);
  }

  @Get()
  @ApiEndpoint({ summary: "List uploaded files" })
  @ApiPaginatedResponse(UploadResponseDto)
  @ApiErrorResponses()
  get_uploads(
    @Query() query: UploadQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UploadsResponseDto> {
    return this.uploads_service.get_uploads(query, user);
  }

  @Get(":id")
  @ApiEndpoint({ summary: "Get uploaded file metadata" })
  @ApiDataResponse(UploadResponseDto)
  @ApiErrorResponses()
  get_upload(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UploadResponseDto> {
    return this.uploads_service.get_upload(id, user);
  }

  @Get(":id/download")
  @ApiEndpoint({ summary: "Download an uploaded file" })
  @ApiProduces("application/octet-stream")
  @ApiResponse({
    status: HttpStatus.OK,
    schema: { type: "string", format: "binary" },
    description: "File contents",
  })
  @ApiErrorResponses()
  async download_file(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const download = await this.uploads_service.get_download(id, user);
    return new StreamableFile(createReadStream(download.path), {
      type: is_valid_mime_type(download.mime_type)
        ? download.mime_type
        : "application/octet-stream",
      disposition: `attachment; filename*=UTF-8''${encode_file_name(download.original_name)}`,
      length: download.size,
    });
  }

  @Delete(":id")
  @ApiEndpoint({ summary: "Delete an uploaded file" })
  @ApiMessageResponse()
  @ApiErrorResponses()
  delete_upload(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.uploads_service.delete_upload(id, user);
  }
}

function encode_file_name(file_name: string): string {
  return encodeURIComponent(file_name).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function is_valid_mime_type(mime_type: string): boolean {
  return /^[\w.+-]+\/[\w.+-]+$/.test(mime_type);
}
