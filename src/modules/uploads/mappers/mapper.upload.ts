import type { Models } from "@/prisma/contract.d.ts";
import type { UploadResponseDto } from "@/modules/uploads/d.response/dto.upload.response";

type UploadFields = Pick<
  Models.public_berkas,
  "id" | "nama_asli" | "tipe_mime" | "ukuran" | "diunggah_oleh_id_pegawai" | "dibuat_pada"
>;

export function map_upload(upload: UploadFields): UploadResponseDto {
  return {
    id: upload.id,
    original_name: upload.nama_asli,
    mime_type: upload.tipe_mime,
    size: upload.ukuran,
    uploaded_by_username: upload.diunggah_oleh_id_pegawai,
    created_at: upload.dibuat_pada,
    download_url: `/api/uploads/${upload.id}/download`,
  };
}
