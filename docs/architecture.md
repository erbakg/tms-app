# Architecture

The repository is a TypeScript monorepo. The API is NestJS with Fastify; future dispatcher administration and driver mobile applications live in separate `apps/` directories and consume its public API.

## API boundaries

- **HTTP controllers** validate input and expose transport-level contracts.
- **Application services** implement use cases.
- **Infrastructure repositories** persist domain entities through Prisma.
- **Domain types** are independent from NestJS and Prisma where practical.

PostgreSQL is the source of truth for operational data. Redis is reserved for background jobs such as Rate Confirmation OCR/AI extraction. Original RC files will be stored in object storage, not in Git or the database.

## Driver-data boundary

Financial and internal dispatcher data must never be returned from driver-facing endpoints. `LoadFieldVisibility` is the initial persistence mechanism for field-level driver visibility; a dedicated driver projection endpoint will enforce it.
