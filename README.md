# NestJS + Prisma 8 Boilerplate

NestJS 11 API starter with Prisma 8, PostgreSQL, Swagger/OpenAPI, DTO validation, user management, and a JWT authentication foundation. Database access follows the feature flow `Controller → Service → Repository → Prisma 8`.

## Requirements

- Bun 1.4+
- Node.js 22.18+ or 24.11+
- PostgreSQL 15+ for direct local development

## Run locally

Copy `.env.example` to `.env`, set `DATABASE_URL`, and replace `JWT_SECRET` with a random value of at least 32 characters. For example:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Run the app directly against PostgreSQL:

```bash
bun run dev
```

Or use Prisma Composer's local database and runtime:

```bash
bun run dev:composer
```

Composer receives `JWT_SECRET` through a secret binding. It reads `CORS_ORIGIN`, `JWT_EXPIRES_IN_SECONDS`, and `NODE_ENV` as optional environment parameters. `CORS_ORIGIN` accepts comma-separated origins.

The API uses the `/api` prefix. `GET /api/health` is public. Swagger UI is available at `/docs`, with the OpenAPI JSON at `/docs-json`.

## Authentication

Register a user through `POST /api/users`, then log in through `POST /api/auth/login`. The login response contains a short-lived HS256 bearer token; `GET /api/auth/me` returns the authenticated profile. Passwords are hashed with Node's built-in `scrypt` implementation.

User listing, reading, updating, and deleting require the `ADMIN` role. New registrations always receive `USER`; to bootstrap an administrator, promote a trusted account with an approved database administration tool. The password hash is never included in an API response.

## API conventions

- Single resources use `{ "data": ... }`.
- Collections use `{ "data": [], "meta": { "page", "limit", "total", "totalPages" } }`.
- Message responses use `{ "message": ... }`.
- Errors expose a stable `code`, a human-readable message, the request path, and a timestamp.
- Collection queries use `page`, `limit`, `search`, `sortBy`, and `sortOrder`; sort fields are whitelisted.

## Prisma contract and migrations

- Contract source: `src/prisma/contract.prisma`
- Generated artifacts: `src/prisma/contract.json` and `src/prisma/contract.d.ts`
- Runtime setup: `src/prisma/db.ts`

After changing the contract, emit the generated artifacts and review the migration plan before applying database changes:

```bash
bun run contract:emit
bun run migration:plan
```

Apply migrations using the Prisma 8 commands configured for the target environment. Do not deploy a changed contract before reviewing its migration plan.

## Build and deploy

```bash
bun run build
bun run start
```

For Prisma Composer deployment:

```bash
bun run deploy
```
