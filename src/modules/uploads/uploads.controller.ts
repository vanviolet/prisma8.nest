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
import { ApiBody, ApiConsumes, ApiProduces, ApiResponse, ApiTags } from "@nestjs/swagger";
import { createReadStream } from "node:fs";
import { ErrorResponseDto } from "../../common/dto/error.response.dto";
import { ApiEndpoint } from "../../common/decorators/api.endpoint.decorator";
import {
  ApiDataResponse,
  ApiErrorResponses,
  ApiMessageResponse,
  ApiPaginatedResponse,
} from "../../common/decorators/api.response.decorator";
import { CurrentUser } from "../../common/decorators/current.user.decorator";
import type { AuthenticatedUser } from "../../common/types/request-context.type";
import { UploadQueryDto } from "./d.query/upload.query.dto";
import { UploadCreateDto } from "./d.request/upload.create.dto";
import { UploadResponseDto } from "./d.response/upload.response.dto";
import { UploadsResponseDto } from "./d.response/uploads.response.dto";
import { MAX_UPLOAD_SIZE_BYTES, UPLOADS_DIRECTORY } from "./uploads.constants";
import { UploadsService } from "./uploads.service";
import type { UploadedMultipartFile } from "./types/uploaded.multipart-file.type";

@ApiTags("Uploads")
@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

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
      dest: UPLOADS_DIRECTORY,
      limits: { fileSize: MAX_UPLOAD_SIZE_BYTES, files: 1, fields: 0 },
    }),
  )
  uploadFile(
    @UploadedFile() file: UploadedMultipartFile | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UploadResponseDto> {
    return this.uploadsService.createUpload(file, user);
  }

  @Get()
  @ApiEndpoint({ summary: "List uploaded files" })
  @ApiPaginatedResponse(UploadResponseDto)
  @ApiErrorResponses()
  getUploads(
    @Query() query: UploadQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UploadsResponseDto> {
    return this.uploadsService.getUploads(query, user);
  }

  @Get(":id")
  @ApiEndpoint({ summary: "Get uploaded file metadata" })
  @ApiDataResponse(UploadResponseDto)
  @ApiErrorResponses()
  getUpload(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UploadResponseDto> {
    return this.uploadsService.getUpload(id, user);
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
  async downloadFile(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const download = await this.uploadsService.getDownload(id, user);
    return new StreamableFile(createReadStream(download.path), {
      type: isValidMimeType(download.mimeType) ? download.mimeType : "application/octet-stream",
      disposition: `attachment; filename*=UTF-8''${encodeFileName(download.originalName)}`,
      length: download.size,
    });
  }

  @Delete(":id")
  @ApiEndpoint({ summary: "Delete an uploaded file" })
  @ApiMessageResponse()
  @ApiErrorResponses()
  deleteUpload(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.uploadsService.deleteUpload(id, user);
  }
}

function encodeFileName(fileName: string): string {
  return encodeURIComponent(fileName).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function isValidMimeType(mimeType: string): boolean {
  return /^[\w.+-]+\/[\w.+-]+$/.test(mimeType);
}
