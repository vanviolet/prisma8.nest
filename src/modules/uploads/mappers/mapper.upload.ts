import type { Models } from "@/prisma/contract.d.ts";
import type { UploadResponseDto } from "@/modules/uploads/d.response/dto.upload.response";

type UploadFields = Pick<
  Models.public_uploaded_file,
  "id" | "original_name" | "mime_type" | "size" | "uploaded_by_id" | "created_at"
>;

export function map_upload(upload: UploadFields): UploadResponseDto {
  return {
    id: upload.id,
    original_name: upload.original_name,
    mime_type: upload.mime_type,
    size: upload.size,
    uploaded_by_id: upload.uploaded_by_id,
    created_at: upload.created_at,
    download_url: `/api/uploads/${upload.id}/download`,
  };
}
