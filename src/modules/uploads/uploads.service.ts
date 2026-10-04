import { HttpStatus, Injectable } from "@nestjs/common";
import { constants as fsConstants } from "node:fs";
import { access, unlink } from "node:fs/promises";
import { join } from "node:path";
import { AppException } from "../../common/exceptions/app.exception";
import { ErrorCode } from "../../common/enums/error-code.enum";
import { UserRole } from "../../common/enums/user-role.enum";
import type { AuthenticatedUser } from "../../common/types/request-context.type";
import type { UploadQueryDto } from "./d.query/upload.query.dto";
import type { UploadResponseDto } from "./d.response/upload.response.dto";
import { mapUpload } from "./mappers/upload.mapper";
import { UPLOADS_DIRECTORY } from "./uploads.constants";
import { UploadsRepository } from "./uploads.repository";
import type { UploadedMultipartFile } from "./types/uploaded.multipart-file.type";

@Injectable()
export class UploadsService {
  constructor(private readonly uploadsRepository: UploadsRepository) {}

  async getUploads(query: UploadQueryDto, user: AuthenticatedUser) {
    const uploadedById = user.role === UserRole.ADMIN ? undefined : user.sub;
    const { uploads, total } = await this.uploadsRepository.findMany(query, uploadedById);

    return {
      data: uploads.map(mapUpload),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async createUpload(file: UploadedMultipartFile | undefined, user: AuthenticatedUser) {
    if (!file) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.UNPROCESSABLE_ENTITY,
        "A file is required",
        [{ field: "file", message: "Upload a file using the file field" }],
      );
    }

    try {
      const originalName = this.getSafeOriginalName(file.originalname);
      const upload = await this.uploadsRepository.create({
        originalName,
        storageName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        uploadedById: user.sub,
      });
      return mapUpload(upload);
    } catch (error) {
      await unlink(file.path).catch(() => undefined);
      throw error;
    }
  }

  async getUpload(id: number, user: AuthenticatedUser): Promise<UploadResponseDto> {
    const upload = await this.findAccessibleUpload(id, user);
    return mapUpload(upload);
  }

  async getDownload(id: number, user: AuthenticatedUser) {
    const upload = await this.findAccessibleUpload(id, user);
    const path = this.getStoragePath(upload.storageName);

    try {
      await access(path, fsConstants.R_OK);
    } catch {
      throw this.uploadNotFound();
    }

    return {
      path,
      mimeType: upload.mimeType,
      originalName: upload.originalName,
      size: upload.size,
    };
  }

  async deleteUpload(id: number, user: AuthenticatedUser): Promise<{ message: string }> {
    const upload = await this.findAccessibleUpload(id, user);
    const path = this.getStoragePath(upload.storageName);

    await this.uploadsRepository.delete(id);
    await unlink(path).catch((error: unknown) => {
      if (isNodeError(error) && error.code === "ENOENT") return;
      throw error;
    });

    return { message: "File successfully deleted" };
  }

  private async findAccessibleUpload(id: number, user: AuthenticatedUser) {
    const upload = await this.uploadsRepository.findById(id);
    if (
      !upload ||
      (user.role !== UserRole.ADMIN && upload.uploadedById !== user.sub)
    ) {
      throw this.uploadNotFound();
    }
    return upload;
  }

  private getSafeOriginalName(originalName: string): string {
    const name = (originalName.split(/[\\/]/).at(-1) ?? "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim();
    if (!name || name.length > 255) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.UNPROCESSABLE_ENTITY,
        "Invalid file name",
        [{ field: "file", message: "File name must be between 1 and 255 characters" }],
      );
    }
    return name;
  }

  private getStoragePath(storageName: string): string {
    if (!storageName || storageName === "." || storageName === ".." || /[\\/]/.test(storageName)) {
      throw this.uploadNotFound();
    }
    return join(UPLOADS_DIRECTORY, storageName);
  }

  private uploadNotFound(): AppException {
    return new AppException(ErrorCode.UPLOAD_NOT_FOUND, HttpStatus.NOT_FOUND, "File not found");
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
