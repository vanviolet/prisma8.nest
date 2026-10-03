# Instruksi Coding AI

Aturan ini berlaku untuk perubahan kode di project. Prioritas konflik: kebutuhan pengguna, instruksi project, arsitektur dan pola yang sudah ada, lalu pilihan implementasi paling sederhana.

## Alur kerja

- Baca file terkait dan cari pola serupa sebelum mengubah kode.
- Periksa versi package dan API yang terpasang; jangan mengarang API.
- Gunakan helper yang sudah ada. Hindari duplikasi, perubahan yang tidak terkait, dan abstraksi tanpa kebutuhan nyata.
- Jaga kompatibilitas API dan OpenAPI kecuali perubahan kontrak memang diminta.

## Arsitektur

Ikuti alur Controller -> Service -> Repository -> Prisma.

- Controller menangani HTTP, DTO, auth, Swagger, dan status code.
- Service menangani aturan bisnis dan orchestration.
- Repository menangani query dan persistence.
- Gunakan struktur feature-first di src/modules/<feature>/. Jangan pindahkan implementasi domain ke folder controller/service/repository global.
- Pisahkan mapper, enum, atau constant bila tanggung jawabnya berbeda atau dipakai lintas file.

## DTO dan nama file

Di setiap feature module, simpan DTO sesuai jenisnya:

- d.query/ untuk query DTO.
- d.request/ untuk body/request DTO.
- d.response/ untuk response DTO.

Contoh nama file entity-first: user.query.dto.ts, user.create.dto.ts, user.update.dto.ts, user.response.dto.ts, users.response.dto.ts. Gunakan lowercase dan titik sebagai pemisah. DTO bersama tetap berada di src/common/dto/.

- Gunakan class untuk DTO request agar validation, transformation, dan Swagger bekerja.
- Pakai decorator dari src/common/decorators/field.decorator.ts untuk field DTO. Hindari menumpuk decorator Swagger dan validator yang melakukan hal sama.
- Jangan gunakan model Prisma sebagai response DTO. Mapping database ke response dilakukan di mapper.

## API dan Swagger

OpenAPI adalah kontrak publik.

- Gunakan ApiEndpoint untuk operation summary, operationId, dan metadata auth. Letakkan @ApiEndpoint di atas @Roles atau @Public agar metadata akses terbaca.
- Gunakan decorator response yang ada di api.response.decorator.ts.
- Beri enum yang diekspos schema name stabil.
- Gunakan bentuk response project: single { data }, collection { data, meta }, message { message }, dan error berisi statusCode, code, message, timestamp, serta path.
- Collection memakai page, limit, search, sortBy, dan sortOrder bila relevan. Sorting wajib memakai whitelist.
- Jangan mengubah route, operationId, status, atau schema tanpa alasan requirement.

## Prisma dan database

Project memakai Prisma 8. Sebelum menulis query atau mengubah contract/migration, baca skill yang sesuai di .agents/skills/prisma-8/ dan referensi versinya. Verifikasi versi package dan contract artifacts terlebih dahulu.

- Semua query domain berada di repository dan mengikuti API Prisma 8 yang terpasang.
- Jangan expose error Prisma/SQL atau informasi internal kepada client; gunakan ErrorCode aplikasi.
- Perubahan schema harus konsisten dengan contract, migration, repository, DTO, mapper, dan Swagger.
- Jangan mengedit contract.json, contract.d.ts, atau file generated secara manual; ubah sumbernya lalu jalankan generator yang sesuai.

## TypeScript, validasi, dan keamanan

- Ikuti strict typing. Hindari any, type assertion, dan non-null assertion jika ada alternatif aman.
- Validasi input dengan DTO dan field decorator; aturan bisnis tetap berada di Service.
- Jangan mengakses process.env tersebar. Gunakan configuration layer dan validasi environment saat startup.
- Perlakukan semua input sebagai tidak tepercaya. Jangan log atau mengembalikan password, hash, token, secret, atau header authorization.
- Tambahkan dependency hanya jika kebutuhan tidak dapat dipenuhi oleh API bawaan atau dependency yang ada.
- Komentar menjelaskan alasan atau constraint, bukan mengulang kode.

## Sebelum selesai

Periksa import/type error, DTO validation, schema OpenAPI, operationId, error code, sorting whitelist, keamanan, dan dampak ke kontrak yang sudah ada. Jalankan typecheck/build yang tersedia; jalankan test sesuai permintaan dan jangan mengklaim pemeriksaan yang tidak dijalankan.