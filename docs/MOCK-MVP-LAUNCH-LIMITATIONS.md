# Mock MVP Launch Limitations

This document describes the current limitations of the Experience Platform mock MVP in `demo_program`.

## Integration boundaries

- LeadBoard integration uses `MockLeadBoardClient` only. Real telephony and LeadBoard adapters require EP-11.
- Discovery booking uses local mock services. No real calendar, email, or SMS providers are connected.
- Challenge verification is a placeholder checkbox. Cloudflare Turnstile is not integrated.

## Security and operations

- Rate limiting and adaptive risk scoring are in-memory and process-local.
- Operations Center access uses `X-Ops-Internal-Token`, not full role-based admin auth.
- Analytics and demo persistence use separate local SQLite databases.

## Observability

- Platform health views report local/mock component status.
- No production monitoring stack, alerting provider, or BI warehouse is configured.

## Validation scope

- End-to-end, concurrency, and production-readiness checks validate the mock MVP path only.
- Real `twilio_transcribe_new` validation is required after EP-11 before production launch.

Run `pnpm production-readiness` for an automated pre-launch checklist.
