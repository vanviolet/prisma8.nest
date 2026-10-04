import { resolve } from "node:path";

export const UPLOADS_DIRECTORY = resolve(process.cwd(), "uploads");
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
export const UPLOAD_SORT_FIELDS = ["originalName", "size", "createdAt"] as const;

export type UploadSortField = (typeof UPLOAD_SORT_FIELDS)[number];
