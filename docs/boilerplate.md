# NestJS + Prisma 8 Boilerplate

Buat sebuah **production-ready backend boilerplate** menggunakan NestJS, Prisma 8, PostgreSQL, dan Swagger/OpenAPI.

Boilerplate ini akan digunakan sebagai fondasi untuk banyak project, sehingga struktur kode harus:

- Modular
- Scalable
- Type-safe
- Mudah dipelihara
- Tidak over-engineered
- Konsisten
- Mudah dikembangkan oleh manusia maupun AI
- Memiliki OpenAPI contract yang sangat rapi untuk kebutuhan frontend code generation

---

# 1. Technology Stack

Gunakan:

- NestJS
- TypeScript
- Prisma ORM 8
- PostgreSQL
- Swagger / OpenAPI
- `class-validator`
- `class-transformer`
- Zod untuk environment validation
- Bun sebagai package manager/runtime jika kompatibel
- ESLint / Oxlint jika diperlukan
- Prettier atau formatter yang sesuai
- JWT Authentication sebagai fondasi auth

Jangan menambahkan dependency yang tidak memiliki kebutuhan jelas.

---

# 2. Architecture

Gunakan arsitektur sederhana:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Prisma
    ↓
PostgreSQL
```

Tanggung jawab masing-masing layer:

### Controller

Controller hanya bertanggung jawab terhadap:

- HTTP routing
- Request DTO
- Response DTO
- Authentication
- Authorization
- Swagger/OpenAPI
- HTTP status code

Controller **tidak boleh** berisi query Prisma atau business logic kompleks.

### Service

Service bertanggung jawab terhadap:

- Business logic
- Validasi business rule
- Orchestration antar repository/service
- Transaction orchestration jika diperlukan

Service tidak boleh bergantung pada detail HTTP.

### Repository

Repository bertanggung jawab terhadap:

- Prisma query
- Database access
- Filtering
- Sorting
- Pagination query
- Persistence

Repository tidak boleh berisi business logic.

---

# 3. Folder Structure

Gunakan pendekatan **feature-first / module-first**.

```text
src/
├── main.ts
├── app.module.ts
│
├── config/
│   ├── app.config.ts
│   ├── env.config.ts
│   └── swagger.config.ts
│
├── prisma/
│   ├── contract.prisma
│   ├── db.ts
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── common/
│   ├── constants/
│   │   └── app.constant.ts
│   │
│   ├── decorators/
│   │   ├── api.response.decorator.ts
│   │   ├── api.paginated.decorator.ts
│   │   ├── current.user.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── public.decorator.ts
│   │
│   ├── dto/
│   │   ├── pagination.query.dto.ts
│   │   ├── pagination.meta.dto.ts
│   │   ├── error.response.dto.ts
│   │   └── message.response.dto.ts
│   │
│   ├── enums/
│   │   ├── sort-order.enum.ts
│   │   └── environment.enum.ts
│   │
│   ├── exceptions/
│   │   ├── app.exception.ts
│   │   └── error-code.enum.ts
│   │
│   ├── filters/
│   │   └── http-exception.filter.ts
│   │
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── roles.guard.ts
│   │
│   ├── interceptors/
│   │   ├── response.interceptor.ts
│   │   └── logging.interceptor.ts
│   │
│   ├── pipes/
│   │   └── validation.pipe.ts
│   │
│   ├── types/
│   │   └── request-context.type.ts
│   │
│   └── utils/
│       ├── date.util.ts
│       ├── pagination.util.ts
│       └── string.util.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   │
│   │   ├── dto/
│   │   │   ├── request/
│   │   │   │   └── login.dto.ts
│   │   │   └── response/
│   │   │       └── login.response.dto.ts
│   │   │
│   │   ├── guards/
│   │   ├── strategies/
│   │   └── auth.constant.ts
│   │
│   └── users/
│       ├── users.module.ts
│       ├── users.controller.ts
│       ├── users.service.ts
│       ├── users.repository.ts
│       │
│       ├── dto/
│       │   ├── request/
│       │   │   ├── create.user.dto.ts
│       │   │   ├── update.user.dto.ts
│       │   │   └── find.users.dto.ts
│       │   │
│       │   └── response/
│       │       ├── user.response.dto.ts
│       │       └── users.response.dto.ts
│       │
│       ├── mappers/
│       │   └── user.mapper.ts
│       │
│       ├── enums/
│       │   └── user-status.enum.ts
│       │
│       └── constants/
│           └── user.constant.ts
│
└── health/
    ├── health.module.ts
    └── health.controller.ts
```

Jangan membuat folder global seperti:

```text
controllers/
services/
repositories/
```

Semua file yang berkaitan dengan satu domain harus berada di module domain tersebut.

---

# 4. Prisma 8

Gunakan pola Prisma 8 terbaru.

Pisahkan Prisma infrastructure pada:

```text
src/prisma/
```

Database access dari module harus melalui repository.

Contoh:

```text
UsersController
      ↓
UsersService
      ↓
UsersRepository
      ↓
PrismaService
      ↓
Prisma 8
```

Jangan melakukan:

```typescript
this.prisma...
```

langsung di Controller.

Jangan expose model database Prisma sebagai API response secara langsung.

---

# 5. DTO Convention

Pisahkan Request DTO dan Response DTO.

```text
dto/
├── request/
└── response/
```

Contoh:

```text
create.user.dto.ts
update.user.dto.ts
find.users.dto.ts

user.response.dto.ts
users.response.dto.ts
```

Request DTO digunakan untuk:

- Validation
- Transformation
- Swagger request schema

Response DTO digunakan untuk:

- OpenAPI response contract
- Frontend generated types
- Mencegah database model bocor ke public API

Model Prisma **tidak boleh digunakan sebagai public API DTO**.

---

# 6. Swagger / OpenAPI

Swagger adalah bagian penting dari architecture karena OpenAPI akan digunakan untuk menghasilkan API client frontend.

OpenAPI harus dianggap sebagai **public contract**.

Setiap endpoint harus memiliki:

- Tag
- Operation ID
- Summary
- Request schema
- Response schema
- Error response yang relevan
- Authentication metadata jika diperlukan

Contoh operation ID:

```text
getUsers
getUser
createUser
updateUser
deleteUser
```

Hindari operation ID generic seperti:

```text
findAll
findOne
create
update
remove
```

Gunakan nama method Controller yang eksplisit:

```typescript
getUsers()
getUser()
createUser()
updateUser()
deleteUser()
```

Configure Swagger agar operation ID stabil.

OpenAPI JSON harus tersedia untuk frontend generator.

Contoh:

```text
/docs
/docs-json
```

---

# 7. Swagger DTO Rules

Gunakan Swagger CLI plugin jika memungkinkan agar metadata DTO dapat dihasilkan secara otomatis.

Jangan menambahkan `@ApiProperty()` ke semua property jika informasi tersebut sudah dapat diinfer oleh Swagger plugin.

Gunakan `@ApiProperty()` secara eksplisit apabila diperlukan untuk:

- Enum
- Custom example
- Description khusus
- Complex schema
- Union
- Nested schema
- Format khusus

Untuk enum yang digunakan di Swagger, berikan nama schema yang stabil.

Contoh:

```typescript
@ApiProperty({
  enum: UserStatus,
  enumName: 'UserStatus',
})
status: UserStatus;
```

Hal ini penting agar frontend generator tidak menghasilkan enum duplikat.

---

# 8. Mapper

Gunakan mapper ketika database entity berbeda dengan API response.

```text
mappers/
└── user.mapper.ts
```

Contoh tanggung jawab:

```text
Database Model
     ↓
Mapper
     ↓
Response DTO
```

Mapper tidak boleh melakukan database query.

---

# 9. Standard API Response

Gunakan response structure yang konsisten.

## Single Data

```json
{
  "data": {
    "id": "uuid"
  }
}
```

## Collection

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Message

```json
{
  "message": "User successfully deleted"
}
```

---

# 10. Error Response

Semua error harus mempunyai format yang konsisten.

```json
{
  "statusCode": 422,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "email must be an email"
    }
  ],
  "timestamp": "2026-10-04T00:00:00.000Z",
  "path": "/api/users"
}
```

Gunakan machine-readable error code.

Contoh:

```typescript
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_EMAIL_EXISTS = 'USER_EMAIL_EXISTS',

  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}
```

Frontend harus bisa menentukan behavior berdasarkan:

```text
error.code
```

bukan berdasarkan text `message`.

---

# 11. Pagination

Gunakan pagination convention yang sama untuk semua module.

Request:

```text
?page=1
&limit=20
&search=keyword
&sortBy=createdAt
&sortOrder=desc
```

Response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Default:

```text
page = 1
limit = 20
```

Maximum limit harus dibatasi.

Contoh:

```text
100
```

---

# 12. Filtering & Sorting

Setiap module boleh menentukan filter sendiri.

Contoh:

```text
GET /users

?page=1
&limit=20
&search=irvan
&status=ACTIVE
&sortBy=createdAt
&sortOrder=desc
```

Jangan mengizinkan frontend mengirim field sorting arbitrary tanpa whitelist.

Valid `sortBy` harus didefinisikan secara eksplisit.

---

# 13. Validation

Gunakan global validation.

Configuration minimal:

```typescript
new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
})
```

Payload dengan property yang tidak didefinisikan oleh DTO harus ditolak.

Jangan melakukan validation manual jika dapat ditangani oleh DTO.

---

# 14. Environment Configuration

Jangan membaca:

```typescript
process.env.*
```

langsung dari banyak lokasi aplikasi.

Centralize environment configuration.

Gunakan Zod untuk melakukan validation ketika aplikasi startup.

Application harus gagal startup jika required environment variable tidak tersedia atau invalid.

Sediakan:

```text
.env.example
```

Tanpa secret.

---

# 15. Authentication

Siapkan foundation authentication menggunakan JWT.

Pisahkan:

```text
authentication
authorization
```

Sediakan reusable:

```text
@Public()
@CurrentUser()
@Roles()
```

serta:

```text
AuthGuard
RolesGuard
```

Password wajib di-hash.

Jangan pernah mengembalikan password/hash pada response API.

---

# 16. Naming Convention

Gunakan lowercase filename.

Jika nama file memiliki lebih dari satu kata, gunakan titik sebagai separator.

Benar:

```text
theme.provider.ts
current.user.decorator.ts
pagination.query.dto.ts
user.response.dto.ts
error-code.enum.ts
```

Hindari:

```text
themeProvider.ts
theme-provider.ts
currentUserDecorator.ts
```

Gunakan suffix berdasarkan fungsi file:

```text
*.controller.ts
*.service.ts
*.repository.ts
*.module.ts

*.dto.ts
*.response.dto.ts

*.guard.ts
*.filter.ts
*.interceptor.ts
*.decorator.ts
*.pipe.ts

*.util.ts
*.constant.ts
*.enum.ts
*.type.ts
*.mapper.ts
```

---

# 17. Reusable Code

Jika ditemukan:

- Function reusable
- Constant reusable
- Decorator reusable
- DTO reusable
- Type reusable
- Utility reusable

pindahkan ke area reusable yang sesuai.

Tetapi jangan membuat abstraction sebelum benar-benar digunakan.

Gunakan prinsip:

> Extract when reusable, not because it might someday be reusable.

---

# 18. File Splitting

Hindari file yang terlalu besar.

Pisahkan kode jika satu file menangani terlalu banyak responsibility.

Contoh module:

```text
users/
├── users.controller.ts
├── users.service.ts
├── users.repository.ts
├── users.module.ts
├── dto/
├── mappers/
├── enums/
└── constants/
```

Jangan membuat satu file `users.ts` yang menangani controller, query, mapping dan business logic sekaligus.

---

# 19. TypeScript

Gunakan TypeScript strict.

Hindari:

```typescript
any
```

Jika tipe belum diketahui gunakan:

```typescript
unknown
```

dan lakukan narrowing.

Jangan melakukan unnecessary type assertion:

```typescript
as Something
```

Gunakan type inference jika jelas.

Export type hanya jika memang digunakan oleh file lain.

---

# 20. API Design

Gunakan REST convention.

Contoh:

```text
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id
```

Gunakan plural resource name.

Gunakan HTTP status code yang tepat.

Jangan memasukkan action pada URL jika REST resource sudah cukup.

Hindari:

```text
POST /users/create
POST /users/delete
```

---

# 21. Health Check

Sediakan endpoint minimal:

```text
GET /health
```

Digunakan untuk:

- Deployment
- Docker
- Kubernetes
- Load balancer
- Monitoring

---

# 22. Logging

Sediakan struktur logging yang dapat dikembangkan.

Jangan menggunakan `console.log` untuk production application logic.

Sensitive value tidak boleh dicetak ke log:

- Password
- Authorization header
- Access token
- Refresh token
- Secret
- API key

---

# 23. Security

Minimal security rules:

- Password hashing
- Request validation
- Input sanitization jika diperlukan
- CORS configurable
- Helmet jika sesuai
- Rate limiting jika diperlukan
- Jangan expose stack trace pada production
- Jangan expose internal Prisma/database error kepada client
- Jangan expose secret pada log
- Jangan expose password/hash pada DTO

---

# 24. Code Quality

Prioritaskan:

```text
Readability
Consistency
Type Safety
Maintainability
Explicit Contracts
```

Daripada abstraction yang terlalu kompleks.

Jangan menerapkan Clean Architecture, DDD, CQRS, Event Sourcing atau pattern kompleks lainnya kecuali terdapat kebutuhan nyata.

Boilerplate harus tetap terasa sebagai aplikasi NestJS yang sederhana dan familiar.

---

# 25. Expected Result

Hasil akhir harus memiliki minimal:

```text
NestJS application
Prisma 8 configuration
PostgreSQL support

Swagger/OpenAPI
OpenAPI JSON

Global validation
Global exception handling
Standard response

Pagination
Sorting
Filtering

Environment validation

User module
Auth foundation
Health module

Repository pattern

Request DTO
Response DTO
Mapper

Reusable Swagger decorators
Reusable error handling
```

Pastikan project dapat digunakan sebagai **base repository** untuk project NestJS selanjutnya tanpa harus melakukan refactor besar.