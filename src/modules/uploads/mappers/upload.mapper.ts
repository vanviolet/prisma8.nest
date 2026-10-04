import type { Models } from "../../../prisma/contract.d.ts";
import type { UploadResponseDto } from "../d.response/upload.response.dto";

type UploadFields = Pick<
  Models.public_UploadedFile,
  "id" | "originalName" | "mimeType" | "size" | "uploadedById" | "createdAt"
>;

export function mapUpload(upload: UploadFields): UploadResponseDto {
  return {
    id: upload.id,
    originalName: upload.originalName,
    mimeType: upload.mimeType,
    size: upload.size,
    uploadedById: upload.uploadedById,
    createdAt: upload.createdAt,
    downloadUrl: `/api/uploads/${upload.id}/download`,
  };
}
