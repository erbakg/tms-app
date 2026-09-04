# Бесплатный тестовый стенд

Этот вариант предназначен для внутренней демонстрации и функционального тестирования. Он не является production-схемой: бесплатные сервисы могут засыпать, перезапускаться и менять лимиты.

## Рекомендуемая схема

| Часть                | Сервис                  | Почему                                                                                      |
| -------------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| Admin (React/Vite)   | Render Static Site      | Статический сайт, HTTPS и deploy из GitHub без отдельного сервера.                          |
| API (NestJS/Fastify) | Render Free Web Service | Подходит для Node HTTP-сервера и автоматического deploy из GitHub.                          |
| PostgreSQL           | Neon Free               | Бессрочный free-план для обучения/демо, 0.5 GB storage и 100 CU-hours в месяц на проект.    |
| Redis для BullMQ     | Upstash Redis Free      | 256 MB и 500 000 команд в месяц — достаточно для тестовой очереди extraction.               |
| Файлы RC             | Cloudflare R2 Standard  | S3-compatible API, 10 GB-month, 1 млн Class A и 10 млн Class B операций в месяц без оплаты. |

R2 требует подключить R2 subscription/billing profile, хотя указанные лимиты входят в бесплатный уровень. Не добавлять платёжные реквизиты, если это неприемлемо: тогда на первом тестовом стенде можно оставить локальный MinIO и не тестировать upload из внешнего окружения.

## Ограничения, которые нельзя скрывать

- Render Free Web Service засыпает после 15 минут без входящего запроса; холодный старт занимает примерно минуту. Локальная файловая система ephemeral, поэтому RC нельзя хранить на диске сервиса.
- Free Render Postgres живёт только 30 дней. Поэтому для этой системы выбран Neon, а не бесплатный Render Postgres.
- Бесплатный Render не даёт отдельный background worker. В текущей архитектуре `apps/api/src/worker.ts` должен быть запущен, иначе задача AI extraction останется в `PENDING`.
- До отдельной настройки worker для демо следует включить `AI_PROVIDER=mock` и запускать worker рядом с API. При настоящем Gemini всё равно нужен рабочий `GEMINI_API_KEY` и доступная квота.

## Что подготовить перед публикацией

1. Создать Neon database, выполнить `pnpm --filter @312kg/api prisma migrate deploy` и перенести её строку подключения в `DATABASE_URL`.
2. Создать Upstash Redis и задать URL в переменной Redis/BullMQ, используемой API.
3. Создать R2 bucket и задать endpoint, access key, secret key, bucket и region в переменных object storage. Формат совместим с S3-клиентом приложения.
4. На Render создать Web Service с корнем репозитория, build-командой `pnpm install --frozen-lockfile && pnpm build`, start-командой API и всеми server-side environment variables. `CORS_ORIGIN` должен быть точным URL admin-сайта.
5. На Render создать Static Site для `apps/admin`, собрать его через `pnpm --filter @312kg/admin build` и указать publish directory `apps/admin/dist`. В build environment задать `VITE_API_URL` как публичный URL API.
6. Создать первого ADMIN через штатную команду `admin:create`, не сохранять пароль в Git и проверить login/upload/driver view живыми запросами.

## Альтернативы

Vercel Hobby удобен для React admin, но по условиям предназначен для personal/non-commercial use. Для публичного коммерческого продукта не стоит строить на нём постоянный стенд. Его можно использовать для личного preview. Render Static Site снимает это ограничение из выбора тестовой схемы.

## Источники тарифов

- [Render Free](https://render.com/docs/free)
- [Neon Pricing](https://neon.com/pricing)
- [Upstash Redis Pricing](https://upstash.com/pricing/redis)
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Vercel Hobby terms](https://vercel.com/docs/plans/hobby)
