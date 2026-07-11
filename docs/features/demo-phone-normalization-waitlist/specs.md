Based on the PRD, this document is the implementation-ready Ticket Runner Specification. Requirements are grouped into logical feature areas with explicit dependencies, implementation steps, and testable acceptance criteria.

⸻

Ticket Runner Specification Sheet

Feature Summary

Feature: Country-Aware Demo Qualification & Phone Normalization

Repository: demo_program

Branch: feature/demo-phone-normalization-waitlist

Objective

Implement market-aware qualification that:

* Supports interactive demos only for Netherlands (`NL`) and United States (`US`)
* Normalizes supported phone numbers into E.164 format before security checks and persistence
* Prevents invalid phone numbers from reaching LeadBoard
* Introduces a waitlist flow for unsupported markets (`OTHER`)
* Keeps all changes isolated to demo_program

⸻

Feature Breakdown

| Feature Area | Ticket |
|--------------|--------|
| Shared phone normalization | T001 |
| Qualification UI and frontend validation | T002 |
| Request contract, BFF validation, prospect persistence | T003 |
| Waitlist persistence | T004 |
| Start-flow branching | T005 |
| Discriminated API responses | T006 |
| Waitlist confirmation UX | T007 |
| Contract/spec updates and final regression | T008 |

⸻

Canonical Types and Contracts

Market identifiers

Use exactly these values everywhere (frontend, BFF, normalization package):

```ts
export type BusinessMarket = 'NL' | 'US' | 'OTHER';
export type DemoMarket = 'NL' | 'US'; // supported markets only; never free-form string
```

Unknown `business_market` values must return `400 VALIDATION_FAILED`. They must **not** be treated as `OTHER`.

Request fields (frontend and BFF DTOs)

Add to `StartDemoRequest`:

```ts
business_market: 'NL' | 'US' | 'OTHER';
country_name?: string;   // required when business_market === 'OTHER'
phone_number?: string;   // required when business_market is NL or US; optional for OTHER (see matrix)
```

Existing fields (`full_name`, `business_name`, `email`, `business_location`, etc.) remain required for all markets. `business_location` stays free-text and required for all markets.

Validation matrix

| Market | `country_name` | `phone_number` |
|--------|----------------|----------------|
| `NL` | Not required | Required |
| `US` | Not required | Required |
| `OTHER` | Required (trimmed, max 100 chars) | Optional in request; **ignored by backend and never persisted** |

When `business_market === 'OTHER'`, `phone_number` may be present in transport (e.g. stale browser payloads) but the backend must not validate, normalize, rate-limit, or persist it. The frontend still clears and normally omits the field when switching to `OTHER`.

Phone normalization result (discriminated union)

Do **not** return `e164` and `display` when validation fails. Use:

```ts
export type DemoMarket = 'NL' | 'US';

export type PhoneNormalizationResult =
  | {
      ok: true;
      e164: string;
      display: string;
      countryCode: DemoMarket;
    }
  | {
      ok: false;
      code: 'PHONE_REQUIRED' | 'INVALID_PHONE' | 'UNSUPPORTED_MARKET';
      message: string;
    };
```

Function:

```ts
normalizeDemoPhone(
  rawPhone: string,
  market: DemoMarket,
): PhoneNormalizationResult
```

`OTHER` must not normally reach this function. If it does, return `{ ok: false, code: 'UNSUPPORTED_MARKET', message: '...' }`.

Supported-market start sequence

Order is fixed. Normalization occurs **before** `DemoStartGuard` so rate-limit keys use E.164:

1. Validate required fields (including `business_market`)
2. Validate market-specific fields per matrix above
3. Reject unknown `business_market` values (`400 VALIDATION_FAILED`)
4. Normalize phone to E.164 via shared package
5. Run demo guard (`flow: 'demo'` or existing `evaluate()` with normalized E.164 phone) — not waitlist guard
6. Upsert prospect with E.164 phone and `business_market` (`NL` or `US`)
7. Create experience session
8. Call LeadBoard with E.164 (`prospectPhoneE164`)
9. Issue experience token, start poller (real mode), return `status: 'started'`

Waitlist (`OTHER`) sequence

1. Validate required waitlist fields; ignore any `phone_number` in the payload (AC-27)
2. Normalize email → `email_normalized` for guard and persistence
3. Run waitlist abuse checks (AC-26) — see **Waitlist abuse guard** below
4. Create waitlist record (no phone column)
5. Return waitlisted result (`201 Created` on first submission)

Waitlist abuse guard

The current `DemoStartGuard` uses phone-based rate-limit keys and must **not** be called as-is for waitlist submissions.

Implement one of these (choose one approach in T003/T005; both satisfy the contract):

**Option A — dedicated waitlist path:**

```ts
demoStartGuard.evaluateWaitlist({
  clientIp,
  emailNormalized,
  honeypotValue,
  challengeCompleted,
});
```

**Option B — discriminated guard input:**

```ts
type DemoGuardInput =
  | {
      flow: 'demo';
      phoneE164: string;
      emailNormalized: string;
      clientIp: string;
      honeypotValue?: string;
      challengeCompleted?: boolean;
    }
  | {
      flow: 'waitlist';
      emailNormalized: string;
      clientIp: string;
      honeypotValue?: string;
      challengeCompleted?: boolean;
    };
```

Waitlist flow evaluates **IP**, **normalized email**, **honeypot**, and **challenge state** only. It must not require, synthesize, or rate-limit by phone number.

Duplicate waitlist handling

* Database uniqueness: `email_normalized` column with `UNIQUE` constraint
* Normalization: `email.trim().toLowerCase()` stored in `email_normalized`
* Also store original `email TEXT NOT NULL`
* First submission: `201 Created`
* Duplicate submission: `409 Conflict` with payload:

```json
{
  "error": {
    "code": "WAITLIST_EMAIL_EXISTS",
    "message": "You're already on our waitlist."
  }
}
```

* Existing row is **not** changed on duplicate
* Frontend treats `409 WAITLIST_EMAIL_EXISTS` as a friendly duplicate confirmation state

Do **not** depend on SQLite `UNIQUE(lower(email))` expression indexes unless explicitly validated. Use dedicated `email_normalized TEXT NOT NULL UNIQUE`.

Prospect persistence for supported markets

Add `business_market` to the demo-program prospect record:

* Store `NL` or `US` for supported demos
* Store `country_name` only on the waitlist record for `OTHER`
* Keep existing free-text `business_location` unchanged

Requires experience-engine migration and updates to prospect type/repository (included in T003).

Prospect upsert behavior (supported markets)

`ProspectService.upsert()` may match an existing prospect by email or phone.

For a new supported demo start:

* On **create**: store submitted `business_market` (`NL` or `US`) and E.164 `phone_number`.
* On **match** (existing prospect by email or normalized phone): update `business_market` and `phone_number` to the latest validated supported-market submission, along with other updatable qualification fields per existing `updateProspectEntity()` rules.

`business_market` is not creation-only; returning users who change market or phone get the latest validated values. Immutable-field rules beyond the current upsert contract are unchanged.

Waitlist persistence schema

Phone is omitted. Retain qualification data for attribution:

```
id
created_at
status                    -- default: 'waiting'
full_name
business_name
email
email_normalized          -- UNIQUE
country_name
business_location
industry
company_size
website
no_website
biggest_challenge
implementation_timeframe
client_context            -- serialized JSON; retain for campaign attribution
```

Unsupported-market resource language (precise)

The platform uses a **shared demo number**. The start request does **not** purchase or allocate a Twilio number per prospect.

For waitlist submissions:

* No experience session is created
* No LeadBoard demo-session mirror is created
* No poller is started
* No shared demo phone number is returned
* No experience token is issued

Retell is not invoked because no demo session exists — an indirect consequence, not a separate implementation action.

⸻

Ticket Specifications

⸻

Ticket T001 — Shared phone normalization package

ticket_id: T001

title: Create shared phone normalization package

description: Introduce a reusable package that performs deterministic phone normalization and validation for supported markets only.

inputs

* `rawPhone: string`
* `market: DemoMarket` (`'NL' | 'US'`)

outputs: `PhoneNormalizationResult` (discriminated union above)

implementation_steps

1. Create `packages/phone-normalization`
2. Install `libphonenumber-js`
3. Implement `normalizeDemoPhone(rawPhone, market): PhoneNormalizationResult`
4. Support Netherlands (`NL`) and United States (`US`)
5. Return `UNSUPPORTED_MARKET` if `OTHER` or any non-`NL`/`US` value reaches the function
6. Export types: `DemoMarket`, `PhoneNormalizationResult`
7. Integrate package into `demo-web` and `demo-api-bff`

acceptance_criteria

* AC-1: Same implementation used by frontend and backend
* AC-2: NL numbers normalize to `+31…` E.164
* AC-3: US numbers normalize to `+1…` E.164
* AC-4: Invalid numbers return `{ ok: false, code: 'INVALID_PHONE' }`
* AC-5: Empty phone returns `{ ok: false, code: 'PHONE_REQUIRED' }`
* AC-6: Output uses discriminated union; no `e164`/`display` on failure paths

dependencies: None

tests (this ticket)

* Unit tests in `packages/phone-normalization/tests/` for NL, US, invalid, empty, whitespace, already-E.164, `UNSUPPORTED_MARKET`

edge_cases

* Empty input
* Invalid characters
* Unsupported market passed to function
* Already formatted E.164
* Extra whitespace
* `0646275553` vs `06 4627 5553` vs `+31646275553` → same E.164

assumptions: `libphonenumber-js` supports required parsing.

⸻

Ticket T002 — Qualification UI and frontend validation

ticket_id: T002

title: Implement Business Market qualification flow

description: Update qualification UI with market selector, conditional fields, on-blur formatting, and market-switch reset rules.

inputs: User qualification input

outputs: Validated form payload ready for `POST /api/demo/v1/start`

implementation_steps

1. Add Business Market selector with values `NL`, `US`, `OTHER` (labels: Netherlands, United States, Another Country)
2. If `NL` or `US`: show required Phone field
3. If `OTHER`: hide Phone; show required Country field (`country_name`, max 100 chars)
4. Normalize phone on blur using shared package; show formatted display value
5. Show inline validation errors from discriminated result
6. Update CTA text contextually (e.g. “Start interactive demo” vs “Join waitlist”)
7. Implement market-switch reset rules (locked):

| Transition | Behavior |
|------------|----------|
| `NL` ↔ `US` | Clear phone field and its validation result |
| Supported → `OTHER` | Clear and hide phone field |
| `OTHER` → `NL`/`US` | Show empty required phone field |
| Any market change | Never reuse previous normalized phone value |
| → `OTHER` | Reveal required `country_name` |
| Away from `OTHER` | Clear `country_name` |

8. Extend `StartDemoRequest` in `demo-api-client.ts` with `business_market`, `country_name?`, conditional `phone_number`

acceptance_criteria

* AC-7: Phone hidden for `OTHER`
* AC-8: `country_name` required only for `OTHER`
* AC-9: Blur formats phone using shared package
* AC-10: Invalid numbers prevent submission
* AC-19: Switching between markets clears incompatible phone/country values

dependencies: T001

tests (this ticket)

* `apps/demo-web/tests/demo-web.test.tsx`: market selector, conditional fields, market-switch resets, blur formatting, CTA text

edge_cases

* Switching market after entering phone
* NL → US with Dutch E.164 still in field (must clear)
* Rapid market changes
* Stale `phone_number` in `OTHER` payload (backend ignores; waitlist still succeeds)

assumptions: Current form supports conditional rendering.

⸻

Ticket T003 — Request contract, BFF validation, and prospect persistence

ticket_id: T003

title: Request contract, BFF validation, and prospect persistence

description: Add DTO fields, authoritative server-side validation, normalized security key, E.164 prospect storage, and supported-market persistence.

inputs: `StartDemoRequest` with `business_market`

outputs: Validated request; prospect stored with E.164 and `business_market` for supported markets

implementation_steps

1. Extend `StartDemoRequest` and related domain/request types in BFF `types/api.ts` and `@experience-platform/shared-types` as needed (**not** `StartDemoResponse` — owned by T006)
2. Extend `validateStartDemoRequest()` with market matrix validation
3. Reject unknown `business_market` → `400 VALIDATION_FAILED` (AC-20)
4. For `NL`/`US`: call `normalizeDemoPhone()` **before** demo guard evaluation
5. Pass normalized E.164 phone to demo guard rate-limit key (AC-17)
6. For `OTHER`: skip phone normalization; ignore any `phone_number` in payload (AC-27)
7. Implement waitlist guard path (`evaluateWaitlist` or discriminated `DemoGuardInput` with `flow: 'waitlist'`) — AC-26
8. Experience-engine migration: add `business_market TEXT` to `prospects` (nullable for legacy rows; required for new supported demos)
9. Update `Prospect` type, repository, `ProspectService.upsert()` to persist `business_market` with upsert-update behavior defined above
10. Store prospect `phone_number` as E.164 for all new/updated `NL`/`US` prospects (AC-18)
11. Do **not** branch waitlist or define response types here — T005 branches; T006 owns `StartDemoResponse`, `WaitlistedResponse`, HTTP status codes, and API-client response mapping

acceptance_criteria

* AC-11: Backend never trusts frontend validation alone
* AC-17: Supported-market phone normalization occurs before security rate-key generation
* AC-18: Prospect phone stored in E.164 for newly created NL/US demo prospects
* AC-20: Unknown `business_market` values return `400 VALIDATION_FAILED`
* AC-24: `business_location` remains required for all markets
* AC-26: Waitlist guard uses normalized email and client IP; no phone required, synthesized, or rate-limited
* AC-27: `OTHER` requests ignore `phone_number`; never persisted to waitlist
* Invalid phone for supported market → `400 VALIDATION_FAILED` with clear message
* Existing prospect match updates `business_market` and E.164 phone to latest submission

dependencies: T001

tests (this ticket)

* `services/demo-api-bff/tests/demo-api.test.ts`: market validation matrix, unknown market, E.164 storage, demo guard key uses normalized phone
* `packages/demo-security/tests/demo-security.test.ts`: waitlist guard path (no phone key)
* `services/experience-engine/tests/prospect-service.test.ts`: `business_market` persistence and upsert update on match

edge_cases

* Tampered frontend payload (wrong market/phone combo)
* Missing phone for NL/US
* Stale `phone_number` present on `OTHER` request (ignored; submission succeeds)
* Legacy prospects without `business_market`
* Returning prospect with different market/phone updates stored values

assumptions: `validateStartDemoRequest()` remains the first validation gate; normalization inserts before guard for supported markets only.

⸻

Ticket T004 — Waitlist persistence

ticket_id: T004

title: Create waitlist persistence

description: Persist unsupported-market qualification into local SQLite with normalized-email uniqueness and duplicate behavior.

inputs: Qualification payload for `OTHER` market

outputs: `waitlist_entry` row or duplicate detection

implementation_steps

1. Create experience-engine migration (e.g. `005_create_waitlist_entries.sql`)
2. Create table per schema above (`email_normalized TEXT NOT NULL UNIQUE`)
3. Implement `WaitlistRepository` (SQLite)
4. Implement `WaitlistService.create()`:
   * Normalize email → `email_normalized`
   * Serialize `client_context` as JSON if present
   * Default `status` → `waiting`
   * On unique violation → surface `WAITLIST_EMAIL_EXISTS`
5. Phone field omitted entirely

acceptance_criteria

* AC-12: Phone omitted from waitlist records (AC-27: never read from request)
* AC-22: Duplicate waitlist submissions return `409 WAITLIST_EMAIL_EXISTS`; existing row unchanged
* AC-13: Status defaults to `waiting`
* First submission persists all qualification fields listed in schema

dependencies: None (may proceed in parallel with T001–T003)

tests (this ticket)

* `services/experience-engine/tests/waitlist-service.test.ts`: create, duplicate, email normalization, field persistence, `client_context` JSON

edge_cases

* Email casing (`User@Example.com` vs `user@example.com`)
* Trailing spaces on email
* Concurrent duplicate inserts (DB constraint wins)

assumptions: SQLite `UNIQUE` on `email_normalized` column is sufficient.

⸻

Ticket T005 — Start-flow branching

ticket_id: T005

title: Implement supported vs unsupported market branching

description: Short-circuit waitlist submissions before experience-session and LeadBoard creation.

inputs: Validated `StartDemoRequest`

outputs: Either interactive demo path or waitlist path

implementation_steps

1. Modify `DemoService.startDemo()` branching after T003 validation:
2. If `business_market === 'OTHER'`:
   * Run waitlist guard (`evaluateWaitlist` or `flow: 'waitlist'`) — AC-26
   * Ignore any `phone_number` in request (AC-27)
   * Call `WaitlistService.create()`
   * Hand off to T006 for waitlisted response shape and HTTP status (do not create session/mirror/token/poller)
3. If `business_market === 'NL' | 'US'`:
   * Phone already normalized (T003)
   * Continue existing flow: prospect upsert → experience session → LeadBoard mirror → token → poller
4. Ensure these are **not** invoked for `OTHER` (AC-21):
   * `createExperienceSession()`
   * `leadBoardClient.createDemoSessionMirror()`
   * `realModeStatusPoller.trackSession()`
   * `createExperienceToken()`

acceptance_criteria

* AC-14: Supported markets preserve existing demo behavior (with E.164 phone)
* AC-21: `OTHER` submissions do not invoke session, mirror, poller, or token issuance
* AC-26: Waitlist path uses waitlist guard only (no phone rate-limit key)
* AC-27: `OTHER` path ignores any `phone_number` in request
* AC-15: No experience session or LeadBoard demo-session mirror for waitlist
* AC-16: No shared demo phone number returned for waitlist

dependencies: T003, T004

tests (this ticket)

* `services/demo-api-bff/tests/demo-api.test.ts`: OTHER path skips LeadBoard client mock; NL/US path still calls mirror
* Assert no `trackSession` for waitlist

edge_cases

* Unknown market (handled in T003, never reaches branch)
* Waitlist duplicate (409 from T004, surfaced in T006)

assumptions: T003 and T004 are complete before this ticket merges.

⸻

Ticket T006 — Discriminated API responses

ticket_id: T006

title: Implement discriminated API responses

description: **Exclusive owner** of response types, HTTP status mapping, and API-client response/error handling. T003 owns request types only.

inputs: Branch outcome from T005

outputs

Supported (`NL`/`US`) — unchanged shape, `status: 'started'`:

```ts
{ status: 'started'; /* existing fields */ }
```

Waitlist first submission — `201 Created`:

```ts
{
  status: 'waitlisted';
  country_name: string;
  message: string;
}
```

No `experience_session_id`, `experience_token`, or `shared_demo_phone_number`.

Duplicate waitlist — `409 Conflict`:

```ts
{
  error: {
    code: 'WAITLIST_EMAIL_EXISTS';
    message: "You're already on our waitlist.";
  }
}
```

implementation_steps

1. Define `StartDemoResponse` discriminated union: `status: 'started' | 'waitlisted'` (BFF `types/api.ts`)
2. Define `WaitlistedResponse` type
3. Wire `DemoService.startDemo()` / routes to HTTP status: `200` for `started`, `201` for new waitlist, `409` for duplicate
4. Map `WAITLIST_EMAIL_EXISTS` to `409` in routes/error handler
5. Update `demo-api-client.ts`: `StartDemoResponse`, `WaitlistedResponse`, and `WAITLIST_EMAIL_EXISTS` error handling

T006 does **not** modify `StartDemoRequest` or prospect/waitlist persistence logic.

acceptance_criteria

* AC-14: Supported `started` responses unchanged for existing consumers
* Waitlisted response matches contract above
* AC-22: Duplicate returns 409 with `WAITLIST_EMAIL_EXISTS`
* No demo session fields on waitlist success response

dependencies: T005

tests (this ticket)

* `services/demo-api-bff/tests/demo-api.test.ts`: response shapes, status codes, 409 payload
* `packages/leadboard-client/tests/` unchanged (no new LeadBoard calls for waitlist)

edge_cases

* Duplicate waitlist entry
* Malformed `business_market` (400 from T003, not this ticket)

assumptions: API path remains `POST /api/demo/v1/start`.

⸻

Ticket T007 — Waitlist confirmation UX

ticket_id: T007

title: Implement waitlist confirmation experience

description: Confirmation page for new and duplicate waitlist submissions; defined refresh and direct-navigation behavior.

inputs: API response (`waitlisted` or `409 WAITLIST_EMAIL_EXISTS`)

outputs: `/demo/waitlist-confirmed` confirmation page

implementation_steps

1. Add route `/demo/waitlist-confirmed` in `App.tsx`
2. Add `WaitlistConfirmedPage.tsx` (pattern: `BookingConfirmedPage.tsx`)
3. On successful waitlist (`201`): navigate to confirmation; store minimal sessionStorage:
   ```ts
   { outcome: 'created' | 'already_exists'; country_name: string }
   ```
4. On `409 WAITLIST_EMAIL_EXISTS`: navigate to confirmation with `outcome: 'already_exists'`
5. Display messages:
   * New: “Thank you…” (per PRD copy)
   * Duplicate: “You're already on our waitlist.”
6. Browser refresh behavior (locked):
   * `/demo/waitlist-confirmed` is standalone
   * Refresh reads sessionStorage and keeps showing confirmation
   * Direct navigation without confirmation state → redirect to `/demo/qualify`
   * **Never** store full qualification payload in browser storage
7. Supported-market success still navigates to `/demo/instructions` (unchanged)

acceptance_criteria

* AC-23: Waitlist confirmation survives browser refresh without storing full qualification payload
* New waitlist shows thank-you message
* Duplicate shows friendly already-on-waitlist message
* Direct visit without state redirects to qualification

dependencies: T006

tests (this ticket)

* `apps/demo-web/tests/demo-web.test.tsx`: navigation branches, refresh with sessionStorage, redirect without state, duplicate 409 UX

edge_cases

* Browser refresh on confirmation page
* Back button from confirmation
* Opening confirmation URL in new tab without sessionStorage

assumptions: `QualificationPage` branches on `status: 'waitlisted'` and `WAITLIST_EMAIL_EXISTS`.

⸻

Ticket T008 — Contract/spec updates and final regression

ticket_id: T008

title: Contract/spec updates and final regression

description: Update TDS documents; run full suite, lint, typecheck; verify no LeadBoard/Twilio/Retell changes.

inputs: Completed T001–T007

outputs: Updated docs; green CI checks

implementation_steps

1. Update `tds/TDS-003-API-Specification.md`: new request fields, `waitlisted` response, `409 WAITLIST_EMAIL_EXISTS`
2. Update `tds/TDS-005-Database-Schema.md`: `prospects.business_market`, `waitlist_entries` table
3. Run full test suite (`pnpm test`)
4. Run lint (`pnpm lint`) and typecheck (`pnpm typecheck`)
5. Verify no changes in `twilio_transcribe_new` (LeadBoard, Twilio, Retell)
6. Final regression pass covering cross-ticket scenarios not covered in per-ticket tests

acceptance_criteria

* AC-25: API and database TDS documents reflect new request, response, and waitlist contracts
* All PRD scenarios covered
* All automated tests, lint, typecheck pass
* No LeadBoard/Twilio/Retell code changes

dependencies: T001–T007 (final integration pass)

tests (this ticket)

* Full regression suite
* End-to-end scenarios: NL demo start with local phone → E.164 → LeadBoard; US demo; OTHER waitlist; duplicate waitlist; market switch UI

edge_cases

* Regression failures from cross-ticket integration

assumptions: Per-ticket tests already added in T001–T007; T008 is final doc sync and regression gate.

⸻

Dependency Graph

```
T001 ──┬── T002
       └── T003
T004 (parallel; no dependency on T001–T003)
T003 + T004
      ↓
     T005
      ↓
     T006
      ↓
     T007
T008 — final regression and TDS updates after T001–T007; per-ticket tests land with each ticket
```

T004 must complete before T005 (waitlist service must exist before start-flow branching).

T003 must complete before T005 (validation and prospect shape must exist).

T008 is not “all tests at the end only.” Each ticket T001–T007 adds focused tests; T008 runs the full regression pass and updates TDS docs.

⸻

Global Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-1 | Shared normalization package used by frontend and backend |
| AC-2 | NL numbers normalize to `+31…` E.164 |
| AC-3 | US numbers normalize to `+1…` E.164 |
| AC-4 | Invalid numbers return discriminated failure |
| AC-5 | Empty phone returns `PHONE_REQUIRED` |
| AC-6 | No `e164`/`display` on failure paths |
| AC-7 | Phone hidden for `OTHER` |
| AC-8 | `country_name` required only for `OTHER` |
| AC-9 | Blur formats phone on frontend |
| AC-10 | Invalid numbers prevent client submission |
| AC-11 | Backend never trusts frontend alone |
| AC-12 | Phone omitted from waitlist records |
| AC-13 | Waitlist status defaults to `waiting` |
| AC-14 | Supported `started` responses unchanged |
| AC-15 | No experience session or LeadBoard mirror for waitlist |
| AC-16 | No shared demo phone number for waitlist |
| AC-17 | Normalization before security rate-key generation |
| AC-18 | Prospect phone stored as E.164 for NL/US |
| AC-19 | Market switch clears incompatible phone/country |
| AC-20 | Unknown `business_market` → `400 VALIDATION_FAILED` |
| AC-21 | `OTHER` skips session, mirror, poller, token |
| AC-22 | Duplicate waitlist → `409 WAITLIST_EMAIL_EXISTS`; row unchanged |
| AC-23 | Confirmation survives refresh; no full payload in storage |
| AC-24 | `business_location` required for all markets |
| AC-25 | TDS API and database docs updated |
| AC-26 | Waitlist abuse protection uses normalized email and client IP; no phone required, synthesized, or rate-limited |
| AC-27 | `OTHER` requests: `phone_number` optional in transport, ignored by backend, never persisted |

⸻

Technical Considerations

* Use `libphonenumber-js` as the single source of truth for phone parsing.
* Frontend and backend must consume the same `packages/phone-normalization` package.
* Normalize phone before `DemoStartGuard` for supported markets so `0646275553`, `06 4627 5553`, and `+31646275553` share one rate-limit identity.
* For waitlist: no experience session, no LeadBoard demo-session mirror, no poller, no shared demo number, no experience token.
* Enforce waitlist email uniqueness via `email_normalized UNIQUE` column.
* Keep `started` response backward compatible for supported-market consumers.
* Persist `business_market` on prospects for analytics and debugging.
* On prospect upsert match, update `business_market` and E.164 phone to latest validated supported-market submission.
* `OTHER` payloads: ignore `phone_number` in backend; do not introduce unsupported-country phone validation.
* T003 owns request/DTO types; T006 owns response types and HTTP status mapping.

⸻

Resolved Ambiguities

| # | Decision |
|---|----------|
| 1 | Market identifiers: exactly `'NL' \| 'US' \| 'OTHER'` |
| 2 | Country input: required free-text for `OTHER`, trimmed, max 100 characters |
| 3 | Database uniqueness: dedicated `email_normalized` column with `UNIQUE` constraint |
| 4 | Duplicate response: `409 Conflict`, code `WAITLIST_EMAIL_EXISTS`; frontend shows friendly confirmation |
| 5 | Normalization package market type: strict `'NL' \| 'US'` union only |
| 6 | `OTHER` + `phone_number`: optional in transport; backend ignores; never persisted |
| 7 | Waitlist abuse: dedicated guard path without phone keys (AC-26) |
| 8 | Prospect upsert: `business_market` and E.164 phone updated on match, not creation-only |
| 9 | Ticket ownership: T003 = request types; T006 = response types and HTTP mapping |

⸻

Definition of Done

The feature is complete when:

* Business Market selector (`NL` / `US` / `OTHER`) is implemented with market-switch reset rules
* NL and US phone numbers normalize to valid E.164 before guard and persistence
* Shared normalization package uses discriminated `PhoneNormalizationResult`
* LeadBoard receives only normalized E.164 numbers for supported markets
* `business_market` persisted on prospects (updated on upsert match); `country_name` on waitlist only
* `OTHER` ignores stale `phone_number` in transport; no phone in waitlist records
* Waitlist guard uses email + IP only (AC-26)
* Unsupported markets create waitlist entries; no session, mirror, poller, token, or shared demo number
* Duplicate waitlist emails return `409 WAITLIST_EMAIL_EXISTS` with friendly UX
* Waitlist confirmation page handles refresh and direct-navigation rules
* TDS API and database documents updated
* No changes to LeadBoard, Twilio, or Retell
* Per-ticket tests pass; full regression, lint, and typecheck pass
