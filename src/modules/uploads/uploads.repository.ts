import { Injectable } from "@nestjs/common";
import { or } from "@prisma/orm-postgres/orm-client";
import { PrismaService } from "../../prisma/prisma.service";
import type { Models } from "../../prisma/contract.d.ts";
import type { UploadQueryDto } from "./d.query/upload.query.dto";

type UploadRecord = Pick<
  Models.public_UploadedFile,
  "id" | "originalName" | "mimeType" | "size" | "uploadedById" | "createdAt"
>;

@Injectable()
export class UploadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    query: UploadQueryDto,
    uploadedById?: number,
  ): Promise<{ uploads: UploadRecord[]; total: number }> {
    let collection = this.prisma.db.orm.public.UploadedFile;

    if (uploadedById !== undefined) {
      collection = collection.where({ uploadedById });
    }
    if (query.search) {
      const pattern = `%${query.search}%`;
      collection = collection.where((upload) =>
        or(upload.originalName.ilike(pattern), upload.mimeType.ilike(pattern)),
      );
    }

    const uploads = await collection
      .select("id", "originalName", "mimeType", "size", "uploadedById", "createdAt")
      .orderBy((upload) => upload[query.sortBy][query.sortOrder]())
      .limit(query.limit)
      .offset((query.page - 1) * query.limit)
      .all();
    const aggregate = await collection.aggregate((values) => ({ total: values.count() }));

    return { uploads, total: aggregate.total };
  }

  findById(id: number) {
    return this.prisma.db.orm.public.UploadedFile
      .select(
        "id",
        "originalName",
        "storageName",
        "mimeType",
        "size",
        "uploadedById",
        "createdAt",
      )
      .first({ id });
  }

  create(data: {
    originalName: string;
    storageName: string;
    mimeType: string;
    size: number;
    uploadedById: number;
  }) {
    return this.prisma.db.orm.public.UploadedFile
      .select("id", "originalName", "mimeType", "size", "uploadedById", "createdAt")
      .create(data);
  }

  delete(id: number) {
    return this.prisma.db.orm.public.UploadedFile.where({ id }).delete();
  }
}
