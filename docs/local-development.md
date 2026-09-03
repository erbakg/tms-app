# Локальная разработка

## Требования

- Node.js 22
- pnpm 10.24.0
- Docker Desktop

## Первый запуск

Из корня репозитория:

```bash
pnpm install
docker compose up -d
cp apps/api/.env.example apps/api/.env
pnpm --filter @312kg/api prisma generate
pnpm --filter @312kg/api prisma migrate dev
pnpm --filter @312kg/api start:dev
```

API слушает `http://localhost:3000`; endpoint проверки состояния — `GET /health`.

Docker открывает PostgreSQL на `localhost:5433` и Redis на `localhost:6380`, чтобы не занимать стандартные локальные порты. Учётные данные для локальной разработки существуют только для контейнеров из `compose.yaml`; production-данные передаются через секреты среды развёртывания.

## Проверка

Перед integration- или e2e-тестами, использующими PostgreSQL, запустите Docker-сервисы:

```bash
pnpm test:coverage
pnpm test:integration
pnpm test:e2e
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
```

Чтобы остановить контейнеры и сохранить локальные данные базы:

```bash
docker compose down
```
