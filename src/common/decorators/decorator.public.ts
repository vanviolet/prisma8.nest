import { SetMetadata } from "@nestjs/common";

export const is_public_key = "isPublic";
export const Public = () => SetMetadata(is_public_key, true);
