# Процесс поставки

Каждое изменение поведения следует циклу red → green → refactor:

1. Добавить падающий unit-, integration- или e2e-тест, описывающий требуемое поведение.
2. Реализовать минимальное изменение, при котором тест проходит.
3. Рефакторить, пока полный набор тестов остаётся зелёным.

GitHub Actions запускает coverage unit-тестов, integration-тесты PostgreSQL, e2e-тесты, ESLint, проверку Prettier, проверку типов TypeScript и production build для pull request и push в `main`.

Используйте узконаправленные ветки, например `feat/persist-load-drafts`, и conventional commit subjects, например `feat(api): persist load drafts`.
