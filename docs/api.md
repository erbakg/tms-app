# API contract — current implementation

The API is not versioned yet; versioning and authentication will be introduced before mobile or external clients are connected.

## Load drafts

### `POST /loads`

Creates a persisted `DRAFT` Load. `brokerLoadNumber` is optional.

```json
{ "brokerLoadNumber": "784521" }
```

### `GET /loads/:loadId`

Returns the draft with stops ordered by `position`. A missing Load returns HTTP 404 with code `LOAD_NOT_FOUND`.

## Stops

### `POST /loads/:loadId/stops`

Adds one stop at the end of the route. `type` must be `PICKUP` or `DELIVERY`; all location, appointment, reference, and instruction fields are optional while the dispatcher is preparing the draft.

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

Invalid data returns HTTP 400 with code `INVALID_STOP`; a missing Load returns HTTP 404 with code `LOAD_NOT_FOUND`.

### `PATCH /loads/:loadId/stops/:stopId`

Updates one or more stop fields. The stop must belong to the specified Load. A missing stop returns `STOP_NOT_FOUND`.

### `PATCH /loads/:loadId/stops/reorder`

Replaces the complete route order. Submit each current stop ID exactly once; the API returns stops ordered from position `1`. The operation is transactional, so clients never observe a partially reordered route.

```json
{ "stopIds": ["delivery-stop-uuid", "pickup-stop-uuid"] }
```

### `DELETE /loads/:loadId/stops/:stopId`

Removes the specified stop and returns HTTP 204. Route positions stay stable until a later reorder request.
