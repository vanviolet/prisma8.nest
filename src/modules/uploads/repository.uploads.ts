import { Injectable } from "@nestjs/common";
import { or } from "@prisma/orm-postgres/orm-client";
import { PrismaService } from "@/prisma/service.prisma";
import type { Models } from "@/prisma/contract.d.ts";
import type { UploadQueryDto } from "./d.query/dto.upload.query";

type UploadRecord = Pick<
  Models.public_uploaded_file,
  "id" | "original_name" | "mime_type" | "size" | "uploaded_by_id" | "created_at"
>;

@Injectable()
export class UploadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find_many(
    query: UploadQueryDto,
    uploaded_by_id?: number,
  ): Promise<{ uploads: UploadRecord[]; total: number }> {
    let collection = this.prisma.db.orm.public.uploaded_file;

    if (uploaded_by_id !== undefined) {
      collection = collection.where({ uploaded_by_id });
    }
    if (query.search) {
      const pattern = `%${query.search}%`;
      collection = collection.where((upload) =>
        or(upload.original_name.ilike(pattern), upload.mime_type.ilike(pattern)),
      );
    }

    const uploads = await collection
      .select("id", "original_name", "mime_type", "size", "uploaded_by_id", "created_at")
      .orderBy((upload) => upload[query.sort_by][query.sort_order]())
      .limit(query.limit)
      .offset((query.page - 1) * query.limit)
      .all();
    const aggregate = await collection.aggregate((values) => ({ total: values.count() }));

    return { uploads, total: aggregate.total };
  }

  find_by_id(id: number) {
    return this.prisma.db.orm.public.uploaded_file
      .select(
        "id",
        "original_name",
        "storage_name",
        "mime_type",
        "size",
        "uploaded_by_id",
        "created_at",
      )
      .first({ id });
  }

  create(data: {
    original_name: string;
    storage_name: string;
    mime_type: string;
    size: number;
    uploaded_by_id: number;
  }) {
    return this.prisma.db.orm.public.uploaded_file
      .select("id", "original_name", "mime_type", "size", "uploaded_by_id", "created_at")
      .create(data);
  }

  delete(id: number) {
    return this.prisma.db.orm.public.uploaded_file.where({ id }).delete();
  }
}
