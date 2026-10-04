import { Injectable } from "@nestjs/common";
import { or } from "@prisma/orm-postgres/orm-client";
import { PrismaService } from "@/prisma/service.prisma";
import type { Models } from "@/prisma/contract.d.ts";
import type { UploadQueryDto } from "./d.query/dto.upload.query";

type UploadRecord = Pick<
  Models.public_berkas,
  "id" | "nama_asli" | "tipe_mime" | "ukuran" | "diunggah_oleh_id_pegawai" | "dibuat_pada"
>;

@Injectable()
export class UploadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find_many(
    query: UploadQueryDto,
    diunggah_oleh_id_pegawai?: string,
  ): Promise<{ uploads: UploadRecord[]; total: number }> {
    let collection = this.prisma.db.orm.public.berkas;

    if (diunggah_oleh_id_pegawai !== undefined) {
      collection = collection.where({ diunggah_oleh_id_pegawai });
    }
    if (query.search) {
      const pattern = `%${query.search}%`;
      collection = collection.where((berkas) =>
        or(berkas.nama_asli.ilike(pattern), berkas.tipe_mime.ilike(pattern)),
      );
    }

    const sort_field = {
      original_name: "nama_asli",
      size: "ukuran",
      created_at: "dibuat_pada",
    } as const satisfies Record<UploadQueryDto["sort_by"], string>;
    const uploads = await collection
      .select("id", "nama_asli", "tipe_mime", "ukuran", "diunggah_oleh_id_pegawai", "dibuat_pada")
      .orderBy((berkas) => berkas[sort_field[query.sort_by]][query.sort_order]())
      .limit(query.limit)
      .offset((query.page - 1) * query.limit)
      .all();
    const aggregate = await collection.aggregate((values) => ({ total: values.count() }));

    return { uploads, total: aggregate.total };
  }

  find_by_id(id: number) {
    return this.prisma.db.orm.public.berkas
      .select(
        "id",
        "nama_asli",
        "nama_penyimpanan",
        "tipe_mime",
        "ukuran",
        "diunggah_oleh_id_pegawai",
        "dibuat_pada",
      )
      .first({ id });
  }

  create(data: {
    nama_asli: string;
    nama_penyimpanan: string;
    tipe_mime: string;
    ukuran: number;
    diunggah_oleh_id_pegawai: string;
  }) {
    return this.prisma.db.orm.public.berkas
      .select("id", "nama_asli", "tipe_mime", "ukuran", "diunggah_oleh_id_pegawai", "dibuat_pada")
      .create(data);
  }

  delete(id: number) {
    return this.prisma.db.orm.public.berkas.where({ id }).delete();
  }
}
