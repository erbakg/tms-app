# Контракт API — текущая реализация

API пока не версионируется. Версионирование и аутентификация будут добавлены до подключения мобильного или внешнего клиента.

## Черновики Load

### `POST /loads`

Создаёт сохраняемый в БД `DRAFT` Load. Поле `brokerLoadNumber` необязательно.

```json
{ "brokerLoadNumber": "784521" }
```

### `GET /loads/:loadId`

Возвращает черновик со stops, отсортированными по `position`. Если Load не найден, API возвращает HTTP 404 с кодом `LOAD_NOT_FOUND`.

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
