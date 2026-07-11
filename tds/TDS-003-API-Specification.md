Technical Design Specification (TDS-003)

Interactive Demo Platform

API Specification

Status: Draft for Implementation Review
Version: 1.0
Related Documents:

* ADR-001 — Interactive Demo Platform Architecture
* PRD-001 — Interactive Demo Platform
* TDS-001 — System Architecture
* TDS-002 — Data Model

⸻

1. Purpose

This document defines the API contracts required for the Interactive Demo Platform.

It covers:

* Public browser-facing API
* Interactive Demo API / BFF
* Experience Engine API
* LeadBoard integration API
* Operations API
* SSE event stream
* Error response conventions

⸻

2. API Architecture

The browser shall communicate with one trusted backend API.

Browser
  ↓
Interactive Demo API / BFF
  ↓
Experience Engine
  ↓
LeadBoard API

The browser shall not directly orchestrate LeadBoard APIs.

⸻

3. API Layers

3.1 Public Browser API

Used by the demo website frontend.

Responsibilities:

* Start demo
* Get session status
* Stream live updates
* Book Discovery Session
* Recover session
* Display user-safe errors

⸻

3.2 Experience Engine API

Internal service API.

Responsibilities:

* Create Experience Sessions
* Manage state transitions
* Enforce eligibility
* Track recovery
* Trigger purge
* Record analytics events

⸻

3.3 LeadBoard Integration API

Internal API exposed by LeadBoard.

Responsibilities:

* Create demo-safe session mirror
* Bind calls to sessions
* Provide restricted lead access
* Emit live processing events
* Purge temporary LeadBoard data

⸻

3.4 Operations API

Internal admin API.

Responsibilities:

* Action Center
* Live Operations
* Session History
* Health overview
* Retry safe failures
* Force purge
* Abuse review

⸻

4. Shared API Conventions

4.1 Content Type

All JSON APIs shall use:

Content-Type: application/json

4.2 API Versioning

All APIs shall be versioned.

Example:

/api/demo/v1
/internal/experience/v1
/internal/leadboard-demo/v1
/api/operations/v1

4.3 Request IDs

Every request shall include or generate a request identifier.

Header:

X-Request-Id: <uuid>

If missing, the receiving service shall generate one.

4.4 Authentication

Public demo APIs use temporary session authorization.

Internal APIs use server-to-server authentication.

Operations APIs require internal admin authentication.

⸻

5. Public Browser API

Base path:

/api/demo/v1

⸻

5.1 Start Demo

Endpoint

POST /api/demo/v1/start

Purpose

Creates or updates a Prospect, validates eligibility, creates an Experience Session, and returns demo instructions.

Request

{
  "full_name": "John Smith",
  "business_name": "Joe's Plumbing",
  "email": "john@example.com",
  "phone_number": "+31612345678",
  "industry": "plumbing",
  "business_location": "Amsterdam, Netherlands",
  "company_size": "2-5",
  "website": "https://joesplumbing.nl",
  "no_website": false,
  "biggest_challenge": "never_miss_calls",
  "implementation_timeframe": "within_3_months",
  "experience_definition_id": "expdef_plumbing_demo_v1",
  "client_context": {
    "landing_page": "/demo",
    "utm_source": "google",
    "utm_campaign": "plumbing_launch"
  }
}

Response — Supported Industry

{
  "status": "started",
  "prospect_id": "prospect_123",
  "experience_session_id": "expsess_123",
  "experience_version": "plumbing_demo_v1",
  "industry_supported": true,
  "session_state": "waiting_for_call",
  "shared_demo_phone_number": "+31201234567",
  "expected_call_duration_seconds": 180,
  "call_timeout_seconds": 900,
  "instructions": {
    "title": "Your interactive demo is ready",
    "message": "Call the number below from the phone number you used to register.",
    "scenario_examples": [
      "Blocked kitchen sink",
      "No hot water",
      "Leaking pipe",
      "Bathroom renovation quote"
    ]
  }
}

Response — Unsupported Industry

{
  "status": "started",
  "prospect_id": "prospect_123",
  "experience_session_id": "expsess_123",
  "experience_version": "plumbing_demo_v1",
  "industry_supported": false,
  "industry_notice": {
    "title": "LeadBoard is currently optimized for plumbing businesses",
    "message": "You are welcome to try the interactive demo. The example call uses a plumbing scenario, but it demonstrates the AI call handling, transcript, lead creation, and automation workflow that could power future industry editions."
  },
  "session_state": "waiting_for_call",
  "shared_demo_phone_number": "+31201234567"
}

Errors

{
  "error": {
    "code": "DEMO_ALREADY_COMPLETED",
    "message": "You have already completed this interactive demo. The next step is to book a Discovery Session.",
    "action": "book_discovery"
  }
}

⸻

5.2 Get Demo Session Status

Endpoint

GET /api/demo/v1/sessions/{experience_session_id}/status

Purpose

Returns the current session state for frontend rendering.

Response

{
  "experience_session_id": "expsess_123",
  "state": "processing",
  "current_step": "summary_ready",
  "lead_view_available": true,
  "restricted_lead_view_url": "/demo/view/expsess_123",
  "recovery_available": false,
  "expires_at": "2026-07-08T14:15:00Z"
}

⸻

5.3 Recover Demo Session

Endpoint

POST /api/demo/v1/sessions/{experience_session_id}/recover

Purpose

Restores an inactive session during the recovery window.

Request

{
  "recovery_token": "temporary_browser_session_token"
}

Response

{
  "status": "recovered",
  "experience_session_id": "expsess_123",
  "state": "lead_ready",
  "restricted_lead_view_url": "/demo/view/expsess_123"
}

⸻

5.4 End Demo Session

Endpoint

POST /api/demo/v1/sessions/{experience_session_id}/end

Purpose

Signals that the prospect has closed or explicitly ended the demo experience.

Response

{
  "status": "ending",
  "cleanup_status": "queued"
}

⸻

5.5 Book Discovery Session

Endpoint

POST /api/demo/v1/sessions/{experience_session_id}/book-discovery

Purpose

Books a Discovery Session from the demo experience.

Request

{
  "selected_slot_id": "slot_123",
  "timezone": "Europe/Amsterdam"
}

Response

{
  "status": "booked",
  "discovery_session_id": "disc_123",
  "scheduled_at": "2026-07-09T13:00:00Z",
  "confirmation": {
    "email_sent": true,
    "sms_sent": true
  }
}

⸻

5.6 Show More Discovery Slots

Endpoint

GET /api/demo/v1/discovery-slots?cursor=<cursor>

Purpose

Returns suggested Discovery Session times.

Response

{
  "slots": [
    {
      "slot_id": "slot_123",
      "starts_at": "2026-07-09T09:30:00Z",
      "display": "Tomorrow 09:30"
    },
    {
      "slot_id": "slot_124",
      "starts_at": "2026-07-09T14:00:00Z",
      "display": "Tomorrow 14:00"
    }
  ],
  "next_cursor": "cursor_456"
}

⸻

6. Public SSE API

Base path:

/api/demo/v1

⸻

6.1 Demo Events Stream

Endpoint

GET /api/demo/v1/sessions/{experience_session_id}/events

Purpose

Streams live business events to the demo frontend.

Transport

Server-Sent Events.

Example

event: call_received
data: {"experience_session_id":"expsess_123","label":"Call received","timestamp":"2026-07-08T14:01:00Z"}
event: transcript_ready
data: {"experience_session_id":"expsess_123","label":"Conversation understood","timestamp":"2026-07-08T14:03:00Z"}
event: lead_ready
data: {"experience_session_id":"expsess_123","label":"Lead ready","restricted_lead_view_url":"/demo/view/expsess_123"}

Required Events

session_started
waiting_for_call
call_received
call_active
call_completed
processing_started
transcript_ready
lead_details_extracted
summary_ready
lead_ready
discovery_clicked
discovery_booked
recovery_started
recovery_completed
session_completed
cleanup_started
cleanup_completed
session_expired
technical_failure

⸻

7. Experience Engine Internal API

Base path:

/internal/experience/v1

Authentication:

Server-to-server only.

⸻

7.1 Create Experience Session

POST /internal/experience/v1/sessions

Request

{
  "prospect_id": "prospect_123",
  "experience_definition_id": "expdef_plumbing_demo_v1",
  "industry": "plumbing",
  "phone_number": "+31612345678",
  "metadata": {
    "source": "interactive_demo",
    "utm_campaign": "plumbing_launch"
  }
}

Response

{
  "experience_session_id": "expsess_123",
  "state": "waiting_for_call",
  "expires_at": "2026-07-08T14:15:00Z",
  "session_secret": "one_time_secret"
}

⸻

7.2 Complete Experience Session

POST /internal/experience/v1/sessions/{experience_session_id}/complete

Request

{
  "leadboard_lead_id": "lead_123",
  "completed_at": "2026-07-08T14:05:00Z"
}

Response

{
  "status": "completed"
}

⸻

7.3 Fail Experience Session

POST /internal/experience/v1/sessions/{experience_session_id}/fail

Request

{
  "failure_type": "processing_failure",
  "failure_reason": "summary_generation_failed",
  "retry_available": true
}

Response

{
  "status": "failed",
  "retry_available": true
}

⸻

7.4 Purge Experience Session

POST /internal/experience/v1/sessions/{experience_session_id}/purge

Response

{
  "status": "purge_requested"
}

⸻

8. LeadBoard Integration API

Base path:

/internal/leadboard-demo/v1

Authentication:

Server-to-server only.

⸻

8.1 Create LeadBoard Demo Session Mirror

POST /internal/leadboard-demo/v1/sessions

Purpose

Creates a minimal LeadBoard-side session record for auth, call binding, and cleanup.

Request

{
  "experience_session_id": "expsess_123",
  "prospect_phone_e164": "+31612345678",
  "experience_definition_id": "expdef_plumbing_demo_v1",
  "shared_demo_org_id": "org_demo_shared",
  "expires_at": "2026-07-08T14:15:00Z"
}

Response

{
  "leadboard_demo_session_id": "lbds_123",
  "status": "active"
}

⸻

8.2 Exchange Session For Restricted Lead Token

POST /internal/leadboard-demo/v1/sessions/{leadboard_demo_session_id}/token

Request

{
  "experience_session_id": "expsess_123",
  "lead_id": "lead_123"
}

Response

{
  "access_token": "jwt",
  "expires_at": "2026-07-08T16:00:00Z",
  "restricted_lead_view_url": "https://app.leadboard.ai/demo/view?token=jwt"
}

⸻

8.3 Get LeadBoard Demo Session Status

GET /internal/leadboard-demo/v1/sessions/{leadboard_demo_session_id}

Response

{
  "leadboard_demo_session_id": "lbds_123",
  "experience_session_id": "expsess_123",
  "status": "lead_bound",
  "lead_id": "lead_123",
  "call_sid": "CAxxxxxxxx",
  "processing_state": "summary_ready"
}

⸻

8.4 Purge LeadBoard Demo Data

POST /internal/leadboard-demo/v1/sessions/{leadboard_demo_session_id}/purge

Response

{
  "status": "purged",
  "deleted": {
    "lead": true,
    "transcript": true,
    "summary": true,
    "timeline": true,
    "call_records": true
  }
}

⸻

9. Restricted Lead View API

These endpoints may be implemented as existing LeadBoard routes protected by demo-scoped JWT middleware.

Base path:

/api/leads

⸻

9.1 Get Restricted Lead

GET /api/leads/{lead_id}
Authorization: Bearer <demo_scoped_jwt>

Response

Same LeadBoard lead serializer as production, filtered to demo-safe fields.

⸻

9.2 Get Lead Timeline

GET /api/leads/{lead_id}/timeline
Authorization: Bearer <demo_scoped_jwt>

⸻

9.3 Get Call Transcript

GET /api/leads/{lead_id}/calls/{call_id}/transcript
Authorization: Bearer <demo_scoped_jwt>

⸻

9.4 Get AI Summary

GET /api/leads/{lead_id}/calls/{call_id}/summary
Authorization: Bearer <demo_scoped_jwt>

⸻

Explicitly Forbidden For Demo JWT

GET /api/leads
POST /api/leads
PATCH /api/leads/{lead_id}
DELETE /api/leads/{lead_id}
POST /api/leads/{lead_id}/notes
POST /api/leads/{lead_id}/messages
POST /api/leads/{lead_id}/calls
GET /api/settings/*
GET /api/users/*
GET /api/orgs/*

Forbidden requests shall return a generic authorization failure.

⸻

10. Operations API

Base path:

/api/operations/v1

Authentication:

Internal admin only.

⸻

10.1 Action Center

GET /api/operations/v1/actions

Response

{
  "actions": [
    {
      "action_id": "act_123",
      "priority": "critical",
      "type": "processing_failed",
      "title": "Demo processing failed",
      "experience_session_id": "expsess_123",
      "recommended_action": "retry_processing"
    }
  ]
}

⸻

10.2 Live Operations

GET /api/operations/v1/live-sessions

Response

{
  "sessions": [
    {
      "experience_session_id": "expsess_123",
      "prospect_name": "John Smith",
      "business_name": "Joe's Plumbing",
      "industry": "plumbing",
      "state": "call_active",
      "started_at": "2026-07-08T14:00:00Z"
    }
  ]
}

⸻

10.3 Session History

GET /api/operations/v1/sessions?email=john@example.com

Response

{
  "sessions": [
    {
      "experience_session_id": "expsess_123",
      "prospect_id": "prospect_123",
      "business_name": "Joe's Plumbing",
      "industry": "plumbing",
      "outcome": "completed_booked",
      "created_at": "2026-07-08T14:00:00Z"
    }
  ]
}

⸻

10.4 Retry Processing

POST /api/operations/v1/sessions/{experience_session_id}/retry

Response

{
  "status": "retry_started"
}

⸻

10.5 Force Purge

POST /api/operations/v1/sessions/{experience_session_id}/purge

Response

{
  "status": "purge_requested"
}

⸻

10.6 Block Abuse Source

POST /api/operations/v1/abuse/block

Request

{
  "type": "phone_number",
  "value": "+31612345678",
  "reason": "Repeated abusive demo attempts"
}

Response

{
  "status": "blocked"
}

⸻

11. Analytics API

Base path:

/internal/analytics/v1

⸻

11.1 Record Analytics Event

POST /internal/analytics/v1/events

Request

{
  "event_type": "demo_started",
  "prospect_id": "prospect_123",
  "experience_session_id": "expsess_123",
  "experience_definition_id": "expdef_plumbing_demo_v1",
  "industry": "plumbing",
  "timestamp": "2026-07-08T14:00:00Z",
  "metadata": {
    "source": "landing_page",
    "utm_campaign": "plumbing_launch"
  }
}

Response

{
  "status": "recorded"
}

⸻

12. Error Response Format

All APIs shall return errors in the following structure.

{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable safe message",
    "details": {},
    "request_id": "req_123"
  }
}

⸻

13. Standard Error Codes

VALIDATION_FAILED
SESSION_NOT_FOUND
SESSION_EXPIRED
SESSION_NOT_RECOVERABLE
DEMO_ALREADY_COMPLETED
DISCOVERY_ALREADY_BOOKED
PHONE_NUMBER_MISMATCH
RATE_LIMITED
RISK_CHALLENGE_REQUIRED
UNAUTHORIZED
FORBIDDEN
LEAD_NOT_READY
PROCESSING_FAILED
PURGE_FAILED
INTERNAL_ERROR

⸻

14. Security Rules

The API shall enforce:

* No public write access to LeadBoard.
* No prospect account creation.
* No password authentication.
* No cross-session lead access.
* No production organization access.
* No list endpoints for demo tokens.
* No mutation endpoints for demo tokens.
* Short-lived restricted tokens.
* Server-to-server credentials for internal APIs.

⸻

15. API Success Criteria

This API specification is complete when:

* The browser can complete the entire demo journey through the BFF.
* LeadBoard can process calls without knowing marketing details.
* Temporary leads can be viewed only by the correct session.
* SSE events can update the frontend live.
* Operations can inspect and intervene.
* Cleanup can be triggered and verified.
* No API requires the browser to orchestrate multiple backend systems directly.