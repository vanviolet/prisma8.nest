import { resolve } from "node:path";

export const uploads_directory = resolve(process.cwd(), "uploads");
export const max_upload_size_bytes = 10 * 1024 * 1024;
export const upload_sort_fields = ["original_name", "size", "created_at"] as const;

export type UploadSortField = (typeof upload_sort_fields)[number];
