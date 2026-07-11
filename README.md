# LeadBoard Experience Platform

Monorepo for the LeadBoard Experience Platform interactive demo (mock MVP).

The mock MVP includes a public demo website, demo API backend-for-frontend (BFF), analytics service, and operations center. Telephony, LeadBoard, and calendar integrations are mocked for local development.

## Documentation

- [docs/00-START-HERE.md](docs/00-START-HERE.md) — architecture and implementation guidance
- [docs/MOCK-MVP-LAUNCH-LIMITATIONS.md](docs/MOCK-MVP-LAUNCH-LIMITATIONS.md) — known mock MVP limitations
- [docs/local-demo-startup.md](docs/local-demo-startup.md) — one-command local LeadBoard demo stack

## Prerequisites

- Node.js 20 or later (see [.nvmrc](.nvmrc))
- [pnpm](https://pnpm.io/) 10 or later (see `packageManager` in [package.json](package.json))

pnpm 10+ does not run dependency install scripts unless they are allowlisted. This repo allowlists `better-sqlite3` so its native binding is compiled during `pnpm install`.

If `pnpm` is not installed globally, use the lockfile version via npx:

```bash
npx --yes pnpm@10.12.1 install
```

## Install and verify

From a clean checkout:

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm lint
pnpm production-readiness
```

Use `npx --yes pnpm@10.12.1` in place of `pnpm` if Corepack or global pnpm is unavailable.

## Run the Mock MVP

Start four processes (one terminal each). Order matters: start the backends before the frontends.

**Terminal 1 — demo API BFF (port 3000)**

```bash
pnpm --filter @experience-platform/demo-api-bff dev
```

**Terminal 2 — analytics service (port 3003)**

```bash
pnpm --filter @experience-platform/analytics dev
```

**Terminal 3 — demo website (port 5173)**

```bash
pnpm --filter @experience-platform/demo-web dev
```

**Terminal 4 — operations center (port 5174)**

```bash
pnpm --filter @experience-platform/operations-center dev
```

### URLs to open

| What | URL |
|------|-----|
| Demo website (start here) | http://localhost:5173 |
| Operations center | http://localhost:5174 |
| BFF health | http://localhost:3000/health |
| Analytics health | http://localhost:3003/health |

The demo website proxies `/api/demo` to the BFF. The operations center proxies `/api/ops` to the BFF.

Ensure ports **5173** and **5174** are free before starting the frontends. If Vite picks another port, use the URL printed in the terminal.

### Manual demo flow

1. Open http://localhost:5173 and click through to start the demo.
2. Select **Plumbing** (fully supported industry).
3. Complete the qualification form (leave the hidden website honeypot empty).
4. Read the call instructions, then open the live experience page.
5. Click **Simulate incoming call (mock)** — no real phone call is placed.
6. Watch progress through transcript, summary, and lead creation.
7. Optionally book a discovery call from the booking flow.
8. Open http://localhost:5174 to inspect live sessions, history, funnel analytics, and platform health.

### Environment variables (local defaults)

All variables are optional for local development. Defaults are suitable for a single developer machine.

| Variable | Used by | Local default |
|----------|---------|---------------|
| `DEMO_DATABASE_PATH` | demo-api-bff | `.data/demo.sqlite` |
| `ANALYTICS_DATABASE_PATH` | demo-api-bff, analytics | BFF: `.data/analytics.sqlite`; standalone analytics: `.data/analytics-service.sqlite` |
| `EXPERIENCE_TOKEN_SIGNING_SECRET` | demo-api-bff | `local-dev-signing-secret` |
| `OPS_INTERNAL_TOKEN` | demo-api-bff (ops routes) | `local-ops-dev-token` |
| `LEADBOARD_ADAPTER_MODE` | demo-api-bff | `mock` |
| `LEADBOARD_BASE_URL` | demo-api-bff (real mode) | none — required when `LEADBOARD_ADAPTER_MODE=real` |
| `LEADBOARD_INTERNAL_API_KEY` | demo-api-bff (real mode) | none — server-side only; must match `LEADBOARD_DEMO_INTERNAL_API_KEY` in twilio_transcribe_new |
| `LEADBOARD_STATUS_POLL_INTERVAL_MS` | demo-api-bff (real mode) | `2000` — interval for polling LeadBoard session status |
| `LEADBOARD_SHARED_DEMO_ORG_ID` | demo-api-bff | mock default: `org_demo_shared`; **required UUID** when `LEADBOARD_ADAPTER_MODE=real` (LeadBoard demo org from `bootstrapDemoOrg`) |
| `LEADBOARD_SHARED_DEMO_PHONE_NUMBER` | demo-api-bff | mock default: `+31201234567`; real-mode fallback when LeadBoard omits `shared_demo_phone_number` |
| `PORT` | any HTTP service | BFF `3000`, analytics `3003`, demo-web `5173`, operations-center `5174` |
| `VITE_DEMO_API_BASE_URL` | demo-web | `/api/demo/v1` (Vite dev proxy) |

On first start, the BFF seeds the active plumbing experience definition (`expdef_plumbing_demo_v1`). SQLite files are created under `.data/` automatically.

Rate limiting and risk-scoring knobs (`RATE_LIMIT_*`, `RISK_*`) use in-memory defaults; see [docs/MOCK-MVP-LAUNCH-LIMITATIONS.md](docs/MOCK-MVP-LAUNCH-LIMITATIONS.md).

### Health checks

```bash
curl http://localhost:3000/health
curl http://localhost:3003/health
```

Expected response shape: `{"status":"ok","service":"<service-name>"}`.

### Production readiness

With services running:

```bash
pnpm production-readiness
```

Offline checks still pass with warnings when health endpoints are unreachable.

## Repository structure

```
apps/
  demo-web/              Public interactive demo website
  operations-center/     Internal operations dashboard
services/
  demo-api-bff/          Demo API backend-for-frontend
  experience-engine/     Experience session orchestration
  workflow-orchestrator/ Workflow state transitions
  analytics/             Standalone analytics HTTP API
  cleanup-worker/        Background cleanup worker (scaffold)
  notification-worker/   Background notification worker (scaffold)
packages/
  shared-types/          Shared TypeScript types
  auth/                  Experience token utilities
  analytics-core/        Analytics event storage and reports
  demo-security/         Rate limiting, honeypot, adaptive risk
  discovery-booking/     Mock discovery booking
  event-contracts/       Domain event contracts
  leadboard-client/      LeadBoard client (mock adapter)
  sdk/                   Client SDK
  ui/                    Shared UI components
docs/                    Product and technical documentation
scripts/                 Shared tooling (production-readiness check)
```

## License

Private — internal use only.
