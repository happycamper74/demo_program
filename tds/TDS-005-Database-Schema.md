Technical Design Specification (TDS-005)

Interactive Demo Platform

Database Schema

Status: Draft for Implementation

Version: 1.0

Related Documents

* ADR-001 Interactive Demo Platform Architecture
* PRD-001 Interactive Demo Platform
* TDS-001 System Architecture
* TDS-002 Data Model
* TDS-003 API Specification
* TDS-004 State Machines

⸻

1. Purpose

This document defines the logical database schema for the Interactive Demo Platform.

The schema supports:

* Prospect management
* Experience orchestration
* Discovery Sessions
* Analytics
* Operations
* Abuse protection
* Future experience versions

This document intentionally avoids vendor-specific SQL.

⸻

2. Design Principles

The schema shall satisfy:

* Single ownership
* Clear lifecycle
* Soft ownership boundaries
* Immutable business events
* Forward compatibility

Temporary LeadBoard entities remain inside LeadBoard.

The Interactive Demo Platform stores references only.

⸻

3. Entity Relationship Diagram

Prospect
│
├──────────────┐
│              │
▼              ▼
ExperienceSession    DiscoverySession
│
▼
ExperienceDefinition
│
▼
ExperienceEvent
│
▼
AnalyticsEvent

WaitlistEntry (standalone; no Prospect or Experience Session)

⸻

4. Prospect

Purpose

Permanent marketing record for supported-market demo submissions (`NL`, `US`).

Primary Key

prospect_id

Fields

prospect_id
full_name
business_name
email
phone_number
business_market
industry
business_location
company_size
website
biggest_challenge
implementation_timeframe
current_status
created_at
updated_at

Field Notes

* `phone_number` — stored as normalized E.164 for supported-market submissions.
* `business_market` — `'NL'` or `'US'` for new supported-market prospects. Nullable for legacy rows created before market-aware qualification.

Indexes

email
phone_number
industry
business_name

⸻

4.1 Waitlist Entry

Purpose

Stores qualification submissions from unsupported markets (`OTHER`). Independent of `prospects` and `experience_sessions`.

Primary Key

id

Table

waitlist_entries

Fields

id
created_at
status
full_name
business_name
email
email_normalized
country_name
business_location
industry
company_size
website
no_website
biggest_challenge
implementation_timeframe
client_context

Field Notes

* `status` — defaults to `waiting`.
* `email_normalized` — lowercase normalized email used for deduplication.
* `email_normalized` has a `UNIQUE` constraint.
* There is **no** `phone_number` column. Phone data is not collected or persisted for waitlist submissions.
* `website` is nullable when `no_website` is true.
* `client_context` — optional JSON attribution metadata.

Indexes

email_normalized (`UNIQUE`)
idx_waitlist_entries_email_normalized on `email_normalized`

Duplicate Handling

Duplicate waitlist submissions are prevented by the `email_normalized UNIQUE` constraint. A second insert with the same normalized email fails at the database layer and is surfaced by the API as `409 WAITLIST_EMAIL_EXISTS`. The existing row is unchanged.

⸻

5. Experience Definition

Purpose

Defines a reusable experience.

Examples

* Plumbing Demo V1
* Plumbing Demo V2
* Electrical Demo V1
* Trade Show Demo

Primary Key

experience_definition_id

Fields

name
slug
version
industry
status
estimated_duration_seconds
maximum_call_duration_seconds
scenario
ai_agent_identifier
booking_configuration
active
created_at

⸻

6. Experience Session

Purpose

Represents one execution of an experience.

Primary Key

experience_session_id

Foreign Keys

prospect_id
experience_definition_id

LeadBoard Reference

leadboard_demo_session_id
leadboard_lead_id

Fields

state
recovery_state
failure_reason
cleanup_state
started_at
expires_at
completed_at
purged_at

Indexes

prospect_id
state
expires_at
leadboard_lead_id

⸻

7. Discovery Session

Primary Key

discovery_session_id

Foreign Key

prospect_id

Fields

booking_status
selected_slot
scheduled_at
sales_owner
meeting_provider
meeting_identifier
sms_confirmation_sent
email_confirmation_sent
created_at

⸻

8. Experience Events

Purpose

Immutable event log.

Primary Key

experience_event_id

Fields

experience_session_id
event_name
event_version
payload
occurred_at

Events are append-only.

Events shall never be updated.

⸻

9. Analytics Events

Purpose

Business analytics.

Primary Key

analytics_event_id

Fields

prospect_id
experience_session_id
experience_definition_id
event_type
industry
metadata
occurred_at

Indexes

event_type
industry
occurred_at

⸻

10. Operations Incidents

Purpose

Action Center.

Primary Key

incident_id

Fields

severity
status
category
experience_session_id
title
description
recommended_action
assigned_to
resolved_at
created_at

⸻

11. Abuse Tracking

Purpose

Adaptive abuse protection.

Primary Key

abuse_record_id

Fields

phone_number
email
ip_address
device_fingerprint
risk_score
current_status
reason
last_detected_at

Indexes

phone_number
email
risk_score

⸻

12. Relationships

Prospect

1

↓

Many

Experience Sessions

⸻

Experience Definition

1

↓

Many

Experience Sessions

⸻

Experience Session

1

↓

Many

Experience Events

⸻

Experience Session

1

↓

Many

Analytics Events

⸻

Prospect

1

↓

Many

Discovery Sessions

⸻

13. Retention Policy

Permanent

* Prospect
* Waitlist Entry
* Discovery Session
* Analytics Event
* Experience Definition

Temporary

* Experience Session runtime state

LeadBoard owns:

* Temporary Lead
* Transcript
* Summary
* Timeline
* Calls

⸻

14. Constraints

A Prospect may have many Experience Sessions.

Only one Experience Session may be active for the same:

* Prospect
* Experience Definition

Only one Discovery Session may be active per Experience Session.

Experience Events are immutable.

Analytics Events are immutable.

⸻

15. Audit

Every table shall include

created_at
updated_at

Mutable tables additionally include

updated_by

Append-only tables do not.

⸻

16. Future Compatibility

The schema supports:

* Multiple industries
* Multiple AI providers
* Multiple booking providers
* Multiple demo versions
* Multiple experience types

without structural redesign.

⸻

17. Success Criteria

The schema is complete when:

* Every business entity has a persistence model.
* Ownership boundaries remain clear.
* LeadBoard remains the owner of product data.
* The Interactive Demo Platform remains the owner of prospect data.
* Future experiences require configuration rather than schema redesign.