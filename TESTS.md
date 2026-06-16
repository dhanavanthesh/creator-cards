# Test Coverage

Two layers of testing back this service.

## 1. Automated tests (`npm test`)

21 tests run against the framework's in-memory mock model (no database needed). They cover
the pure helpers and the full business logic of every service.

| Suite | Scenarios |
| --- | --- |
| `slugify` | lowercasing, whitespace → hyphen, stripping invalid characters |
| `generateRandomString` | length and alphanumeric charset |
| `serializeCard` | `_id` → `id`, no `_id` leak, conditional `access_code`, `deleted` 0 → null, optional-field defaults |
| `createCreatorCard` | public create, slug auto-generation, duplicate slug (SL02), private without code (AC01), code on public (AC05), non-integer amount (400) |
| `getCreatorCard` | not found (NF01), draft (NF02), private no code (AC03), wrong code (AC04), public success without `access_code` |
| `deleteCreatorCard` | not found (NF01), deleted card returned in creation format with `deleted` timestamp |

## 2. Request/response matrix

The following valid and invalid cases were exercised end-to-end against a running instance.

### Valid

| Case | Request | Expected |
| --- | --- | --- |
| Full create | `POST /creator-cards` with all fields | 200, `id` exposed (no `_id`) |
| Slug auto-generation | `POST` without `slug` | 200, slug derived from title |
| Private create | `POST` with `access_type: private` + `access_code` | 200, `access_code` returned |
| Retrieve public | `GET /creator-cards/:slug` | 200, no `access_code` field |
| Retrieve private | `GET /creator-cards/:slug?access_code=…` | 200, no `access_code` field |
| Delete | `DELETE /creator-cards/:slug` | 200, deleted card in creation format, `deleted` set |

### Invalid

| Case | Request | Expected |
| --- | --- | --- |
| Duplicate slug | `POST` with an existing slug | 400, `SL02` |
| Private missing code | `POST` `access_type: private`, no code | 400, `AC01` |
| Code on public card | `POST` `access_type: public` + code | 400, `AC05` |
| Bad enum value | `POST` `status: archived` | 400 (framework validation) |
| Decimal amount | `POST` rate `amount: 100.5` | 400 |
| Bad link url | `POST` link url `ftp://…` | 400 |
| Unsupported currency | `POST` currency `EUR` | 400 |
| Non-existent card | `GET /creator-cards/missing` | 404, `NF01` |
| Draft card | `GET` a draft slug | 404, `NF02` |
| Private, no code | `GET` a private slug | 403, `AC03` |
| Private, wrong code | `GET` private slug `?access_code=WRONG1` | 403, `AC04` |
| Delete non-existent | `DELETE /creator-cards/missing` | 404, `NF01` |
| Retrieve deleted | `GET` a deleted slug | 404, `NF01` |
