# Visa D API — Multi-Tenant CRM Backend

Node.js / Express / Prisma / PostgreSQL backend for the KRS CRM frontend.

## Prerequisites

- Node.js 20+
- PostgreSQL (local or Docker)

## Quick start

```bash
cd Backend/visa-d-api
npm install

# Start Postgres (optional — if not already running)
docker compose up -d

# Run migrations and seed demo data (local dev)
npm run db:migrate
npm run db:seed

# Start dev server on port 4000
npm run dev
```

### Production (no shell access)

On `npm start`, the API automatically:

1. Runs `prisma migrate deploy` (creates/updates tables)
2. Seeds demo data **once** if the database is empty (no tenants)

Set `NODE_ENV=production` and `DATABASE_URL` in your hosting panel, then use start command:

```bash
npm run build && npm start
```

**Important:** Deploy the full `KRS` repo (or ensure `Frontend/krs-crm-ui/src/mocks/data` exists relative to the backend) so the one-time seed can load JSON files.

## Environment

Copy `.env.example` to `.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Min 32 chars |
| `JWT_REFRESH_SECRET` | Min 32 chars |
| `PORT` | API port (default `4000`) |
| `CORS_ORIGIN` | Comma-separated frontend origins (default `http://localhost:5173`) |

## Demo credentials

| Portal | Email | Password |
|--------|-------|----------|
| Admin | `admin@deducationist.com` | `admin123` |
| Partner | `partner@deducationist.com` | `partner123` |
| Student | `student@deducationist.com` | `student123` |

## API

- Base URL: `http://localhost:4000/api`
- Health: `GET /health`
- Auth: `POST /api/auth/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`
- All other routes require `Authorization: Bearer <accessToken>`
- File uploads stored in `uploads/` (local disk)

See `Frontend/krs-crm-ui/docs/API_CONTRACT.md` for the full contract.

## Frontend integration

In `Frontend/krs-crm-ui`:

```env
VITE_API_URL=http://localhost:4000/api
VITE_USE_MOCK_API=false
```

The Vite dev server proxies `/api` to `http://localhost:4000`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run db:migrate` | Run Prisma migrations (local dev) |
| `npm run db:deploy` | Apply migrations (production CLI) |
| `npm run db:seed` | Seed demo tenant + mock data (manual) |
| `npm start` | Start API; auto-migrates and seeds empty DB |
| `npm test` | Run integration tests |

## Architecture

- **Multi-tenant**: every business table has `tenantId`; JWT carries tenant context
- **RBAC**: roles per portal (`admin`, `partner`, `student`)
- **Scoping**: partners auto-filtered by `partnerId`; students by `studentRef`
