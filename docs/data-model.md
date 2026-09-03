# Initial data model

## Load lifecycle

`Load.status` starts as `DRAFT`. The dispatcher may revise all extracted Rate Confirmation data while it is a draft. Confirmation will allocate a unique internal `312KG` ID in a later use case; it is intentionally `null` for drafts.

## Entities

- **User** — future Dispatcher, Driver, Admin, Accounting, and Safety identities.
- **Load** — the aggregate root, broker load number, lifecycle, internal identifier, and assigned driver.
- **Stop** — ordered pickup or delivery stop. A unique `(loadId, position)` prevents ambiguous route order.
- **LoadDocument** — object-storage metadata and immutable document version history. It does not contain file bytes.
- **LoadFieldVisibility** — per-load, per-field driver visibility settings. Its default is private.

All relationships from a Load use cascade deletion at the database level. Production retention/deletion policy must be established before exposing any destructive operation.
