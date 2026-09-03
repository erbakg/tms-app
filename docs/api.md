# Контракт API — текущая реализация

API пока не версионируется. Все endpoints, кроме `GET /health` и `POST /auth/login`, требуют JWT Bearer token. Операции Dispatcher доступны только ролям `ADMIN` и `DISPATCHER`.

## Аутентификация

### `POST /auth/login`

Принимает email и password, возвращает `accessToken` и сведения о пользователе. Token передаётся в последующих запросах как `Authorization: Bearer <accessToken>`.

## Черновики Load

### `POST /loads`

Создаёт сохраняемый в БД `DRAFT` Load. Поле `brokerLoadNumber` необязательно.

```json
{ "brokerLoadNumber": "784521" }
```

### `POST /loads/rate-confirmations`

Единый intake endpoint для первого шага процесса: принимает тот же `multipart/form-data` файл `file` (PDF/JPG/PNG до 20 MiB), создаёт `DRAFT` Load, прикрепляет к нему RC версии 1 и ставит extraction в очередь. Необязательное текстовое поле multipart `brokerLoadNumber` предварительно заполняет номер брокера. Это основной путь для сценария «загрузить RC → получить черновик для review».

### `GET /loads/:loadId`

Возвращает черновик со stops, отсортированными по `position`. Если Load не найден, API возвращает HTTP 404 с кодом `LOAD_NOT_FOUND`.

### `PATCH /loads/:loadId`

Сохраняет результаты обязательного ревью диспетчера. Передаются только поля, которые нужно изменить; значение `null` очищает поле. Поддерживаются номер и реквизиты брокера, ставка, груз, вес, pieces, equipment, temperature, special instructions, detention/layover/TONU/lumper, tracking/POD, billing/factoring/required documents и `internalComments`.

AI не вызывает этот endpoint самостоятельно: диспетчер сначала видит `confidence`, исправляет результат и только затем явно сохраняет выбранные значения.

## Stops

### `POST /loads/:loadId/stops`

Добавляет stop в конец маршрута. `type` должен быть равен `PICKUP` или `DELIVERY`; пока диспетчер заполняет черновик, все поля адреса, appointment, reference и instructions необязательны.

```json
{
  "type": "PICKUP",
  "facilityName": "Acme Warehouse",
  "addressLine1": "101 Main Street",
  "city": "Dallas",
  "state": "TX",
  "postalCode": "75201",
  "referenceNumber": "PU-1098"
}
```

При невалидных данных API возвращает HTTP 400 с кодом `INVALID_STOP`; при отсутствии Load — HTTP 404 с кодом `LOAD_NOT_FOUND`.

### `PATCH /loads/:loadId/stops/:stopId`

Обновляет одно или несколько полей stop. Stop должен принадлежать указанному Load. Если stop не найден, возвращается код `STOP_NOT_FOUND`.

### `PATCH /loads/:loadId/stops/reorder`

Полностью заменяет порядок маршрута. Необходимо передать идентификатор каждого текущего stop ровно один раз; API возвращает stops с позициями, начиная с `1`. Операция выполняется в транзакции, поэтому клиент никогда не увидит частично изменённый маршрут.

```json
{ "stopIds": ["delivery-stop-uuid", "pickup-stop-uuid"] }
```

### `DELETE /loads/:loadId/stops/:stopId`

Удаляет указанный stop и возвращает HTTP 204. Позиции остальных stops не меняются до следующего запроса reorder.

## Документы Rate Confirmation

### `POST /loads/:loadId/documents`

Принимает один файл через `multipart/form-data` с именем поля `file`. Поддерживаются PDF, JPG и PNG, размер файла ограничен 20 MiB. Каждый новый файл создаёт следующую версию `RATE_CONFIRMATION`: предыдущая версия сохраняется, но получает `isCurrent: false`.

### `GET /loads/:loadId/documents`

Возвращает метаданные всех версий документов Load в порядке их версий. Содержимое файлов в ответ не включается.

### `GET /loads/:loadId/documents/:documentId/download`

Возвращает короткоживущую (5 минут) signed URL для скачивания документа. Если документ не принадлежит указанному Load или отсутствует, API возвращает `DOCUMENT_NOT_FOUND`.

## AI-извлечение Rate Confirmation

После каждой загрузки Rate Confirmation API создаёт запись extraction со статусом `PENDING` и ставит задачу в Redis/BullMQ. Запущенный worker переводит её в `PROCESSING`, затем в `COMPLETED` либо `FAILED`. Статус не означает, что данные уже внесены в Load: результат будет доступен диспетчеру для обязательной проверки и ручной корректировки.

### `GET /loads/:loadId/documents/:documentId/extraction`

Возвращает статус и результат extraction. Возможные статусы: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.

При `COMPLETED` поле `result` содержит broker contacts, broker load number, rate, cargo/equipment/temperature, commercial terms, billing/factoring requirements, notes и массив `stops`. Каждое значение хранится как `{ "value": string | null, "confidence": "HIGH" | "MEDIUM" | "LOW" | "NOT_FOUND" }`; это позволяет интерфейсу выделять сомнительные данные и не выдавать предположение за факт.

### `POST /loads/:loadId/documents/:documentId/extraction/apply-stops`

Явно создаёт маршрут из `stops` уже завершённого AI extraction. Это действие выполняет диспетчер после проверки; API не применяет stops при загрузке автоматически. Разрешено только для `DRAFT` без существующих stops. Создание всех stops выполняется в одной транзакции, поэтому частичный маршрут не появится.

### `POST /loads/:loadId/confirm`

Подтверждает черновик. В одной транзакции присваивает неизменяемый внутренний ID формата `312KG-10000` и переводит `status` в `CONFIRMED`. Повторный вызов возвращает уже подтверждённый Load без выдачи нового номера.

## Пользователи и водитель

### `POST /users`

Только `ADMIN`. Создаёт учётную запись, в том числе `DRIVER`; пароль должен иметь не менее 12 символов. Это позволяет назначать реального водителя и проверять мобильный API без обхода аутентификации.

### `POST /loads/:loadId/assign-driver`

Назначает пользователя с ролью `DRIVER` на подтверждённый Load. Для черновика API возвращает `LOAD_NOT_CONFIRMED`; несуществующий пользователь или пользователь другой роли даёт `DRIVER_NOT_FOUND`.

### `PATCH /loads/:loadId/field-visibility`

Управляет одним полем, доступным водителю:

```json
{ "field": "specialInstructions", "visibleToDriver": true }
```

Разрешены только операционные поля: broker load number/name, commodity, weight/pieces, equipment, temperature, instructions, tracking, POD и required documents. Финансовые и внутренние поля (`rate`, billing, factoring, comments и условия оплаты) нельзя открыть этим endpoint.

### `GET /driver/loads`

Только `DRIVER`. Возвращает только подтверждённые Load, назначенные пользователю из JWT. В ответе всегда есть внутренний ID, статус и stops; остальные поля выдаются исключительно после их включения диспетчером. Финансовые и internal fields в этом ответе отсутствуют независимо от настроек.
