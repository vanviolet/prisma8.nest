import { HttpStatus, Injectable } from "@nestjs/common";
import { constants as fsConstants } from "node:fs";
import { access, unlink } from "node:fs/promises";
import { join } from "node:path";
import { AppException } from "@/common/exceptions/exception.app";
import { ErrorCode } from "@/common/enums/enum.error.code";
import { user_role } from "@/common/enums/enum.user.role";
import type { AuthenticatedUser } from "@/common/types/type.request.context";
import type { UploadQueryDto } from "./d.query/dto.upload.query";
import type { UploadResponseDto } from "./d.response/dto.upload.response";
import { map_upload } from "./mappers/mapper.upload";
import { uploads_directory } from "./constants.uploads";
import { UploadsRepository } from "./repository.uploads";
import type { UploadedMultipartFile } from "./types/type.uploaded.multipart.file";

@Injectable()
export class UploadsService {
  constructor(private readonly uploads_repository: UploadsRepository) {}

  async get_uploads(query: UploadQueryDto, user: AuthenticatedUser) {
    const uploaded_by_id = user.role === user_role.admin ? undefined : user.sub;
    const { uploads, total } = await this.uploads_repository.find_many(query, uploaded_by_id);

    return {
      data: uploads.map(map_upload),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
      },
    };
  }

  async create_upload(file: UploadedMultipartFile | undefined, user: AuthenticatedUser) {
    if (!file) {
      throw new AppException(
        ErrorCode.validation_error,
        HttpStatus.UNPROCESSABLE_ENTITY,
        "A file is required",
        [{ field: "file", message: "Upload a file using the file field" }],
      );
    }

    try {
      const original_name = this.get_safe_original_name(file.originalname);
      const upload = await this.uploads_repository.create({
        original_name,
        storage_name: file.filename,
        mime_type: file.mimetype,
        size: file.size,
        uploaded_by_id: user.sub,
      });
      return map_upload(upload);
    } catch (error) {
      await unlink(file.path).catch(() => undefined);
      throw error;
    }
  }

  async get_upload(id: number, user: AuthenticatedUser): Promise<UploadResponseDto> {
    const upload = await this.find_accessible_upload(id, user);
    return map_upload(upload);
  }

  async get_download(id: number, user: AuthenticatedUser) {
    const upload = await this.find_accessible_upload(id, user);
    const path = this.get_storage_path(upload.storage_name);

    try {
      await access(path, fsConstants.R_OK);
    } catch {
      throw this.upload_not_found();
    }

    return {
      path,
      mime_type: upload.mime_type,
      original_name: upload.original_name,
      size: upload.size,
    };
  }

  async delete_upload(id: number, user: AuthenticatedUser): Promise<{ message: string }> {
    const upload = await this.find_accessible_upload(id, user);
    const path = this.get_storage_path(upload.storage_name);

    await this.uploads_repository.delete(id);
    await unlink(path).catch((error: unknown) => {
      if (is_node_error(error) && error.code === "ENOENT") return;
      throw error;
    });

    return { message: "File successfully deleted" };
  }

  private async find_accessible_upload(id: number, user: AuthenticatedUser) {
    const upload = await this.uploads_repository.find_by_id(id);
    if (
      !upload ||
      (user.role !== user_role.admin && upload.uploaded_by_id !== user.sub)
    ) {
      throw this.upload_not_found();
    }
    return upload;
  }

  private get_safe_original_name(original_name: string): string {
    const name = (original_name.split(/[\\/]/).at(-1) ?? "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim();
    if (!name || name.length > 255) {
      throw new AppException(
        ErrorCode.validation_error,
        HttpStatus.UNPROCESSABLE_ENTITY,
        "Invalid file name",
        [{ field: "file", message: "File name must be between 1 and 255 characters" }],
      );
    }
    return name;
  }

  private get_storage_path(storage_name: string): string {
    if (!storage_name || storage_name === "." || storage_name === ".." || /[\\/]/.test(storage_name)) {
      throw this.upload_not_found();
    }
    return join(uploads_directory, storage_name);
  }

  private upload_not_found(): AppException {
    return new AppException(ErrorCode.upload_not_found, HttpStatus.NOT_FOUND, "File not found");
  }
}

function is_node_error(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
