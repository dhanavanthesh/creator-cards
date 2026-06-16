# Creator Cards API

A small REST microservice for publishing shareable creator profile cards - think
"link-in-bio" cards with an attached rate card. Creators can publish a card, share it
by slug, gate it behind an access code, and delete it.

Built on Node.js + Express with MongoDB for persistence.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/creator-cards` | Create a card (validates input, enforces slug uniqueness and access rules) |
| `GET` | `/creator-cards/:slug` | Publicly retrieve a card by slug (respects draft status and private access) |
| `DELETE` | `/creator-cards/:slug` | Delete a card by slug (soft delete) |

All endpoints live at the root of the base URL - there is no versioning prefix and no
authentication.

## The Creator Card

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string (ULID) | Stored as `_id`, always serialized as `id` |
| `title` | string | 3-100 chars, required |
| `description` | string | max 500 chars |
| `slug` | string | 5-50 chars, unique, `[A-Za-z0-9_-]`; auto-generated from the title if omitted |
| `creator_reference` | string | exactly 20 chars, required |
| `links[]` | object[] | `{ title (1-100), url (max 200, http/https) }` |
| `service_rates` | object | `{ currency: NGN\|USD\|GBP\|GHS, rates[]: { name, description, amount } }` |
| `status` | string | `draft` \| `published`, required |
| `access_type` | string | `public` \| `private`, defaults to `public` |
| `access_code` | string | exactly 6 alphanumeric chars, required for private cards only |
| `created` / `updated` | number | Unix epoch milliseconds |
| `deleted` | number \| null | `null` while active, timestamp once deleted |

`access_code` is returned when a card is created or deleted, but is **never** included in
public retrieval responses.

## Response shape

Success:

```json
{ "status": "success", "message": "Creator Card Created Successfully.", "data": { } }
```

Error:

```json
{ "status": "error", "message": "Slug is already taken", "code": "SL02" }
```

### Business-rule error codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `SL02` | 400 | Slug is already taken |
| `AC01` | 400 | access_code required when access_type is private |
| `AC05` | 400 | access_code only allowed on private cards |
| `NF01` | 404 | Card not found (or deleted) |
| `NF02` | 404 | Card exists but is a draft |
| `AC03` | 403 | Private card requires an access code |
| `AC04` | 403 | Invalid access code |

Field-level validation (types, lengths, enums) is handled by the framework validator and
always returns HTTP 400.

## Getting started

Requirements: Node.js 16+ and a MongoDB instance.

```bash
npm install
cp .env.example .env   # then set MONGODB_URI and PORT
node bootstrap.js
```

### Environment variables

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `PORT` | Port the server listens on |

## Testing

Automated tests run against an in-memory mock model - no database required:

```bash
npm test
```

See [TESTS.md](./TESTS.md) for the full list of covered scenarios, including the manual
request/response matrix.

## Project structure

```
endpoints/creator-cards/   HTTP handlers (create, get, delete)
services/creator-cards/    business logic, validation, slug + serialization helpers
repository/creator-card/   data access (repository factory)
models/creator-card.js     Mongoose schema (ULID id, unique slug, soft delete)
messages/creator-card.js   user-facing messages
test/                      automated test suite
```
