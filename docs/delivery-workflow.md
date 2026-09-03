# Delivery workflow

Every behavior change follows red → green → refactor:

1. Add a failing unit, integration, or e2e test describing the behavior.
2. Implement the smallest change that passes it.
3. Refactor while the complete suite remains green.

GitHub Actions runs unit coverage, PostgreSQL integration tests, e2e tests, ESLint, Prettier verification, TypeScript type-checking, and the production build for pull requests and pushes to `main`.

Use focused branches such as `feat/persist-load-drafts` and use conventional commit subjects, for example `feat(api): persist load drafts`.
