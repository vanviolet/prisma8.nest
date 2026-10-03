# AI Coding Instructions

Instruksi ini adalah aturan wajib ketika membuat, mengubah, memperbaiki, atau melakukan refactor pada project ini.

Semua perubahan harus mengikuti architecture, convention, dan coding standards yang ditentukan di bawah.

---

# 1. General Rules

Selalu prioritaskan:

1. Correctness
2. Existing project architecture
3. Type safety
4. Consistency
5. Readability
6. Maintainability
7. Simplicity

Jangan melakukan perubahan architecture tanpa kebutuhan nyata.

Jangan membuat abstraction berlebihan.

Jangan mengubah code yang tidak berhubungan dengan task.

---

# 2. Understand Before Editing

Sebelum membuat perubahan:

1. Baca file terkait.
2. Pahami pattern yang sudah digunakan.
3. Cari implementation serupa di project.
4. Gunakan existing helper jika tersedia.
5. Jangan membuat duplicate utility, DTO, decorator, constant, atau component.
6. Pastikan perubahan tidak merusak public API atau OpenAPI contract.

Jangan berasumsi tentang isi file yang belum diperiksa.

---

# 3. Never Hallucinate APIs

Jangan mengarang:

- Library API
- Prisma API
- NestJS API
- Function
- Type
- Decorator
- Package
- Configuration property

Jika API bergantung pada versi package, periksa:

```text
package.json
lockfile
existing implementation
installed types
official documentation jika tersedia
```

Project menggunakan **Prisma 8**.

Jangan menggunakan Prisma API dari versi lama hanya karena syntax tersebut lebih familiar.

---

# 4. Architecture

Gunakan alur:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Prisma
```

### Controller

Controller hanya menangani:

- HTTP
- DTO
- Authentication
- Authorization
- Swagger
- Status code

Jangan letakkan business logic kompleks atau Prisma query di Controller.

### Service

Service menangani:

- Business logic
- Business validation
- Orchestration
- Transaction coordination

### Repository

Repository menangani:

- Prisma
- Database query
- Persistence
- Database filtering
- Database sorting

---

# 5. Module Structure

Gunakan feature-first structure.

```text
modules/
└── users/
    ├── users.module.ts
    ├── users.controller.ts
    ├── users.service.ts
    ├── users.repository.ts
    ├── dto/
    ├── mappers/
    ├── enums/
    └── constants/
```

Jangan membuat global folder seperti:

```text
controllers/
services/
repositories/
```

untuk domain-specific implementation.

---

# 6. File Naming

Gunakan lowercase.

Gunakan titik untuk memisahkan multiple words.

Benar:

```text
create.user.dto.ts
user.response.dto.ts
current.user.decorator.ts
pagination.query.dto.ts
http-exception.filter.ts
```

Salah:

```text
createUserDto.ts
create-user.dto.ts
CurrentUserDecorator.ts
```

Gunakan suffix sesuai fungsi file.

---

# 7. File Responsibility

Satu file harus memiliki responsibility yang jelas.

Pisahkan file jika:

- Ukuran file semakin besar
- Berisi beberapa responsibility
- Terdapat reusable logic
- Terdapat mapping kompleks
- Terdapat constant atau enum yang digunakan lintas file

Jangan split file secara berlebihan untuk logic yang sangat kecil dan hanya digunakan sekali.

---

# 8. Reusability

Sebelum membuat function baru, cari apakah sudah terdapat:

- Utility
- Helper
- Decorator
- DTO
- Mapper
- Constant
- Type
- Enum

yang memiliki fungsi serupa.

Gunakan kembali implementation yang sudah ada.

Jangan membuat duplicate logic.

Tetapi jangan membuat generic abstraction hanya karena kemungkinan akan digunakan di masa depan.

---

# 9. Prisma Rules

Semua Prisma query domain harus berada di Repository.

Jangan menggunakan Prisma langsung di Controller.

Hindari menggunakan Prisma langsung di Service kecuali benar-benar diperlukan untuk orchestration transaction dan tidak ada repository abstraction yang sesuai.

Jangan expose Prisma model sebagai API response.

Jangan membuat repository generic seperti:

```text
BaseRepository<T>
GenericRepository<T>
```

kecuali terdapat kebutuhan nyata.

Repository harus domain-oriented.

---

# 10. DTO Rules

Pisahkan:

```text
dto/request/
dto/response/
```

Request DTO bertanggung jawab terhadap input API.

Response DTO merupakan contract output API.

Jangan gunakan Prisma model sebagai Response DTO.

Jangan menggunakan interface sebagai request validation DTO.

Gunakan class agar:

- validation
- transformation
- Swagger metadata

dapat bekerja dengan benar.

---

# 11. Swagger Is a Contract

Swagger/OpenAPI adalah public contract.

Perubahan OpenAPI harus dilakukan secara hati-hati.

Setiap endpoint harus memiliki schema yang jelas.

Pastikan:

```text
operationId
request
response
enum
pagination
error
authentication
```

terdefinisi dengan konsisten.

Jangan menghasilkan response schema ambigu.

---

# 12. Operation ID

Operation ID harus:

- Unique
- Stable
- Descriptive
- Frontend friendly

Gunakan:

```text
getUsers
getUser
createUser
updateUser
deleteUser
```

Hindari:

```text
findAll
findOne
create
update
remove
```

karena OpenAPI digunakan untuk frontend client generation.

---

# 13. Swagger Enum

Enum yang diekspos melalui OpenAPI harus memiliki schema name yang stabil.

Contoh:

```typescript
@ApiProperty({
  enum: UserStatus,
  enumName: 'UserStatus',
})
```

Hindari menghasilkan enum anonymous atau duplicate.

---

# 14. API Response

Gunakan standard response project.

Single:

```json
{
  "data": {}
}
```

Collection:

```json
{
  "data": [],
  "meta": {}
}
```

Error:

```json
{
  "statusCode": 400,
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "timestamp": "...",
  "path": "..."
}
```

Jangan membuat bentuk response baru jika standard response yang ada sudah dapat digunakan.

---

# 15. Error Handling

Jangan expose:

- Prisma error
- SQL error
- stack trace
- internal error
- infrastructure information

kepada client.

Gunakan application error code.

Contoh:

```text
USER_NOT_FOUND
USER_EMAIL_EXISTS
VALIDATION_ERROR
FORBIDDEN
```

Frontend harus dapat mengandalkan `code`.

---

# 16. Validation

Gunakan DTO + `class-validator`.

Jangan melakukan manual validation jika decorator sudah cukup.

Gunakan:

```text
whitelist
forbidNonWhitelisted
transform
```

secara konsisten.

Validation business rule tetap dilakukan di Service.

---

# 17. Pagination

Semua collection endpoint harus mengikuti convention project.

Gunakan:

```text
page
limit
search
sortBy
sortOrder
```

jika relevan.

Jangan membuat nama parameter berbeda untuk fungsi yang sama tanpa alasan kuat.

---

# 18. Sorting

Jangan memasukkan `sortBy` dari client langsung ke database tanpa whitelist.

Hanya field yang diizinkan yang boleh digunakan untuk sorting.

---

# 19. TypeScript

Jangan menggunakan:

```typescript
any
```

kecuali tidak ada alternatif dan alasannya jelas.

Prioritaskan:

```typescript
unknown
```

untuk value yang belum diketahui.

Gunakan strict typing.

Hindari unnecessary:

```typescript
as SomeType
```

Hindari non-null assertion:

```typescript
value!
```

jika dapat diselesaikan dengan proper control flow.

---

# 20. Function Design

Function harus:

- Memiliki satu tujuan utama
- Memiliki nama yang jelas
- Tidak terlalu panjang
- Tidak memiliki side effect tersembunyi

Gunakan early return jika meningkatkan readability.

Hindari nested condition terlalu dalam.

---

# 21. Naming

Nama variable dan function harus menjelaskan maksudnya.

Benar:

```typescript
existingUser
requestedUserId
totalPages
getUserById()
validateUserAccess()
```

Hindari:

```typescript
data
item
value
temp
res
x
```

jika context tidak jelas.

---

# 22. Constants

Magic values yang memiliki business meaning harus dipindahkan ke constant atau config.

Contoh buruk:

```typescript
if (attempt > 5)
```

Jika `5` merupakan business rule, gunakan constant.

Jangan membuat constant untuk value trivial yang hanya digunakan sekali dan sudah jelas.

---

# 23. Environment Variables

Jangan mengakses:

```typescript
process.env
```

secara tersebar.

Gunakan configuration layer project.

Environment variable harus divalidasi saat startup.

Jangan hardcode:

- URL
- Secret
- Token
- Password
- Environment-specific value

---

# 24. Security

Jangan pernah:

- Log password
- Log access token
- Log refresh token
- Log Authorization header
- Commit secrets
- Return password hash
- Return internal database error

Selalu perlakukan user input sebagai untrusted input.

---

# 25. Dependencies

Jangan menambahkan package baru jika:

- Native API cukup
- Existing dependency sudah dapat menyelesaikan masalah
- Utility kecil dapat dibuat dengan sederhana

Sebelum install package baru, pastikan benar-benar diperlukan.

---

# 26. Comments

Jangan menulis komentar yang hanya mengulang kode.

Buruk:

```typescript
// Get user
const user = getUser();
```

Komentar hanya digunakan untuk menjelaskan:

- Why
- Constraint
- Non-obvious decision
- Workaround
- External limitation

---

# 27. Do Not Over-Engineer

Jangan otomatis menerapkan:

- Clean Architecture penuh
- DDD
- CQRS
- Event Sourcing
- Generic Repository
- Abstract Factory
- Excessive interfaces
- Excessive inheritance

Gunakan hanya jika requirement benar-benar membutuhkannya.

Prefer:

```text
simple
explicit
readable
type-safe
```

---

# 28. Do Not Create Unnecessary Interfaces

Jangan membuat:

```typescript
IUsersService
IUsersRepository
```

hanya untuk membungkus satu implementation.

Interface digunakan ketika memang terdapat lebih dari satu implementation atau terdapat architectural reason yang jelas.

---

# 29. Preserve Existing Patterns

Jika project sudah memiliki pattern untuk:

- Response
- Error
- Repository
- DTO
- Mapper
- Swagger
- Pagination
- Authentication

ikuti pattern tersebut.

Jangan membuat pattern kedua untuk masalah yang sama.

---

# 30. Refactoring Rules

Ketika refactor:

- Jangan mengubah behavior tanpa requirement.
- Jangan mengubah API contract tanpa kebutuhan.
- Jangan rename public API sembarangan.
- Jangan mengubah unrelated files.
- Jangan melakukan massive rewrite jika perubahan lokal cukup.

Prefer incremental changes.

---

# 31. Generated Files

Jangan edit generated file secara manual kecuali memang didesain untuk diedit.

Jika file berasal dari generator, ubah source configuration atau source schema yang menghasilkan file tersebut.

---

# 32. Database Changes

Perubahan database harus sinkron dengan:

```text
Prisma contract
Migration
Repository
DTO
Mapper
Swagger
```

jika bagian tersebut terdampak.

Jangan hanya mengubah database schema tanpa memeriksa API contract.

---

# 33. API Changes

Ketika membuat atau mengubah endpoint, cek:

```text
Route
Method
Request DTO
Validation
Service
Repository
Response DTO
Swagger
Error cases
Authorization
```

Semua harus konsisten.

---

# 34. Before Finishing a Task

Sebelum menyatakan task selesai, periksa:

- TypeScript error
- Import error
- Unused import
- DTO validation
- Swagger schema
- Operation ID
- Error response
- Naming convention
- Existing reusable utilities
- Potential duplicate implementation
- Prisma query correctness
- API contract compatibility

Jika tersedia, jalankan:

```text
typecheck
lint
test
build
```

Jangan menyatakan berhasil jika build/test belum dijalankan.

Jika tidak dapat menjalankan verification, nyatakan bagian yang belum diverifikasi.

---

# 35. AI Behavior

AI harus:

- Menganalisis existing code sebelum mengubahnya.
- Tidak mengarang file atau API yang belum diperiksa.
- Tidak membuat dependency tanpa alasan.
- Tidak membuat duplicate abstraction.
- Tidak mengubah architecture tanpa requirement.
- Tidak menggunakan syntax library versi lama.
- Tidak menyelesaikan masalah dengan `any`.
- Tidak menghapus code hanya karena terlihat tidak digunakan sebelum memeriksa referensinya.
- Tidak menambahkan TODO sebagai pengganti implementasi kecuali memang diminta.
- Tidak meninggalkan placeholder implementation.
- Tidak menghasilkan pseudo-code jika diminta implementasi nyata.

---

# 36. Decision Priority

Jika terdapat konflik, gunakan urutan prioritas:

```text
1. User requirement
2. Project instruction
3. Existing architecture
4. Existing coding convention
5. Official library behavior
6. Simplicity
7. Personal preference AI
```

Preferensi AI tidak boleh mengalahkan aturan project.

---

# 37. Primary Principle

Gunakan prinsip berikut dalam seluruh project:

> Buat kode sesederhana mungkin, tetapi tetap scalable, type-safe, konsisten, dan eksplisit.

Dan:

> Jangan membuat abstraction untuk masalah yang belum ada.

Serta:

> OpenAPI adalah contract, bukan sekadar dokumentasi.

Dan:

> Database model bukan API contract.