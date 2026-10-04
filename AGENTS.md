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

Nama file memakai kategori di depan dan titik sebagai pemisah, misalnya `dto.user.query.ts`, `dto.user.create.ts`, `dto.user.response.ts`, `enum.user.role.ts`, dan `decorator.api.endpoint.ts`. Ganti tanda hubung pada nama file dengan titik. DTO bersama tetap berada di `src/common/dto/`.

- Gunakan class untuk DTO request agar validation, transformation, dan Swagger bekerja.
- Pakai decorator PascalCase dari `src/common/decorators/decorator.field.ts` untuk field DTO. Hindari menumpuk decorator Swagger dan validator yang melakukan hal sama.
- Jangan gunakan model Prisma sebagai response DTO. Mapping database ke response dilakukan di mapper.

## API dan Swagger

OpenAPI adalah kontrak publik.

- Gunakan `@ApiEndpoint` untuk operation summary, operationId, dan metadata auth. Letakkan di atas `@Roles` atau `@Public` agar metadata akses terbaca.
- Gunakan decorator response yang ada di `decorator.api.response.ts`.
- Beri enum yang diekspos schema name stabil.
- Gunakan bentuk response project: single { data }, collection { data, meta }, message { message }, dan error berisi status_code, code, message, timestamp, serta path.
- Collection memakai page, limit, search, sort_by, dan sort_order bila relevan. Sorting wajib memakai whitelist.
- Jangan mengubah route, operationId, status, atau schema tanpa alasan requirement.

## Prisma dan database

Project memakai Prisma 8. Sebelum menulis query atau mengubah contract/migration, baca skill yang sesuai di .agents/skills/prisma-8/ dan referensi versinya. Verifikasi versi package dan contract artifacts terlebih dahulu.

- Semua query domain berada di repository dan mengikuti API Prisma 8 yang terpasang.
- Jangan expose error Prisma/SQL atau informasi internal kepada client; gunakan enum `ErrorCode` aplikasi.
- Perubahan schema harus konsisten dengan contract, migration, repository, DTO, mapper, dan Swagger.
- Jangan mengedit contract.json, contract.d.ts, atau file generated secara manual; ubah sumbernya lalu jalankan generator yang sesuai.

## Konvensi penamaan

- Gunakan `snake_case` huruf kecil untuk fungsi, method, variabel, parameter, properti dan field DTO yang didefinisikan project. Contoh: `findMany` menjadi `find_many` dan `updatedAt` menjadi `updated_at`.
- Gunakan `PascalCase` untuk class, interface, type alias, enum TypeScript/Prisma, dan nama decorator seperti `ApiEndpoint`, `CurrentUser`, serta `StringField`. Enum member TypeScript memakai `snake_case`; member Prisma mengikuti kontrak database.
- Gunakan `snake_case` untuk model dan field Prisma. Contoh: `model UploadedFile` menjadi `model uploaded_file`.
- Pertahankan ejaan identifier yang diwajibkan framework atau dependency agar cocok dengan kontrak eksternal, misalnya lifecycle method `onModuleInit`, method interceptor `intercept`, dan decorator NestJS `UploadedFile`.
- Untuk nama file, letakkan kategori di depan dan pisahkan semua bagian dengan titik; jangan gunakan tanda hubung.
- Gunakan alias `@/*` dari `tsconfig.json` untuk import lintas direktori di `src`; hindari import relatif bertingkat seperti `../../..`. Import file dalam direktori yang sama boleh memakai `./`.
- Nama environment variable dan nama fisik database yang dipertahankan lewat `@map`/`@@map` mengikuti kontrak eksternalnya.
- Nama field DTO dan parameter query publik menggunakan `snake_case`. Pertahankan route, status, dan `operationId` OpenAPI yang sudah ada kecuali requirement meminta perubahan.

## TypeScript, validasi, dan keamanan

- Ikuti strict typing. Hindari any, type assertion, dan non-null assertion jika ada alternatif aman.
- Validasi input dengan DTO dan field decorator; aturan bisnis tetap berada di Service.
- Jangan mengakses process.env tersebar. Gunakan configuration layer dan validasi environment saat startup.
- Perlakukan semua input sebagai tidak tepercaya. Jangan log atau mengembalikan password, hash, token, secret, atau header authorization.
- Tambahkan dependency hanya jika kebutuhan tidak dapat dipenuhi oleh API bawaan atau dependency yang ada.
- Komentar menjelaskan alasan atau constraint, bukan mengulang kode.

## Sebelum selesai

Periksa import/type error, DTO validation, schema OpenAPI, operationId, error code, sorting whitelist, keamanan, dan dampak ke kontrak yang sudah ada. Jalankan typecheck/build yang tersedia; jalankan test sesuai permintaan dan jangan mengklaim pemeriksaan yang tidak dijalankan.
