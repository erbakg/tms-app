# Local development

## Prerequisites

- Node.js 22
- pnpm 10.24.0
- Docker Desktop

## First run

From the repository root:

```bash
pnpm install
docker compose up -d
cp apps/api/.env.example apps/api/.env
pnpm --filter @312kg/api prisma generate
pnpm --filter @312kg/api prisma migrate dev
pnpm --filter @312kg/api start:dev
```

The API listens on `http://localhost:3000`; its health endpoint is `GET /health`.

Docker exposes PostgreSQL at `localhost:5433` and Redis at `localhost:6380`, avoiding common local defaults. Local development credentials exist only for the containers in `compose.yaml`; production credentials are supplied by deployment secrets.

## Verification

Start Docker services before integration or e2e tests that use PostgreSQL:

```bash
pnpm test:coverage
pnpm test:integration
pnpm test:e2e
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
```

To stop containers while preserving local database data:

```bash
docker compose down
```
