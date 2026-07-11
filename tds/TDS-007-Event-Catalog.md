Technical Design Specification (TDS-007)

Experience Platform

Event Catalog

Status: Draft for Implementation

Version: 1.0

Related Documents

* ADR-001 Interactive Demo Platform Architecture
* PRD-001 Interactive Demo Platform
* TDS-001 System Architecture
* TDS-002 Data Model
* TDS-003 API Specification
* TDS-004 State Machines
* TDS-005 Database Schema
* TDS-006 Authentication & Authorization

⸻

1. Purpose

This document defines every domain event within the Experience Platform.

The goals are:

* Standardize communication between services.
* Eliminate polling wherever possible.
* Support live user experiences.
* Feed analytics.
* Feed operations.
* Enable future integrations.

Events are immutable.

Events describe something that already happened.

⸻

2. Event Principles

Every event shall:

* Represent a completed business action.
* Be immutable.
* Have a unique identifier.
* Contain an occurrence timestamp.
* Reference the Experience Session.
* Be safe to replay.
* Be idempotent.

Events must never represent commands.

Correct:

experience.completed

Incorrect:

complete_experience

⸻

3. Standard Event Envelope

Every event shall use the following envelope.

{
  "event_id": "evt_123",
  "event_name": "experience.call_completed",
  "event_version": 1,
  "occurred_at": "2026-07-08T14:01:00Z",
  "experience_session_id": "expsess_123",
  "experience_definition_id": "expdef_plumbing_demo_v1",
  "prospect_id": "prospect_123",
  "payload": {}
}

⸻

4. Experience Lifecycle Events

experience.created

Published when an Experience Session is created.

Payload

{
  "state": "draft"
}

⸻

experience.qualified

Published after qualification completes.

⸻

experience.waiting_for_call

Published after the shared phone number is presented.

⸻

experience.call_started

Published when Twilio confirms an active call.

⸻

experience.call_completed

Published when the AI conversation ends successfully.

⸻

experience.processing_started

Published when LeadBoard begins processing.

⸻

experience.lead_ready

Published when the restricted Lead View becomes available.

Payload

{
  "leadboard_lead_id": "lead_123"
}

⸻

experience.discovery_started

Published when the prospect opens the Discovery booking flow.

⸻

experience.discovery_booked

Published after booking succeeds.

⸻

experience.completed

Published after the demo journey completes.

⸻

experience.purged

Published after all temporary resources have been removed.

⸻

5. Recovery Events

experience.connection_lost

Published when the active client disconnects.

⸻

experience.recovery_started

Payload

{
  "recovery_deadline": "2026-07-08T14:12:00Z"
}

⸻

experience.recovered

Published after a successful reconnect.

⸻

experience.expired

Published after the waiting period expires.

⸻

6. LeadBoard Events

Published by LeadBoard.

leadboard.call_received

⸻

leadboard.transcript_ready

⸻

leadboard.facts_extracted

⸻

leadboard.timeline_ready

⸻

leadboard.summary_ready

⸻

leadboard.lead_created

Payload

{
  "leadboard_lead_id": "lead_123"
}

⸻

leadboard.processing_completed

⸻

leadboard.cleanup_completed

⸻

7. Discovery Events

discovery.slot_viewed

discovery.slot_selected

discovery.booked

discovery.confirmation_sent

⸻

8. Analytics Events

These events are written to the analytics store.

Examples:

landing.viewed
industry.selected
qualification.completed
demo.started
call.started
call.completed
lead.viewed
discovery.clicked
discovery.booked

Analytics events shall never modify business state.

⸻

9. Operations Events

Examples:

operations.processing_failed
operations.cleanup_failed
operations.retry_started
operations.retry_completed
operations.abuse_detected
operations.session_blocked

Operations events feed the Action Center.

⸻

10. Browser SSE Events

The browser receives simplified business events.

These events are optimized for user experience rather than internal architecture.

Allowed SSE events:

waiting_for_call
call_started
call_completed
processing_started
transcript_ready
customer_details_ready
timeline_ready
summary_ready
lead_ready
discovery_available
session_recovered
session_expired
cleanup_started
completed

The browser shall never receive internal infrastructure events.

⸻

11. Event Consumers

Event Category	Consumers
Experience	Experience Engine, Analytics, Operations
LeadBoard	Experience Engine, Browser (via BFF), Analytics
Discovery	Analytics, Sales
Operations	Operations Center
Analytics	BI Dashboards

⸻

12. Event Ordering

Within a single Experience Session:

* Events must preserve order.
* Duplicate events shall be ignored.
* Missing events shall trigger operational alerts.
* Event replay shall not duplicate business actions.

⸻

13. Event Versioning

Every event includes:

event_name
event_version

Breaking payload changes require:

* New version.
* Backward compatibility period.
* Consumer migration.

⸻

14. Event Delivery

Internal services:

* At-least-once delivery.

Browser:

* Live SSE only.
* Lost browser events are recovered through session status reconciliation after reconnect.

⸻

15. Event Retention

Experience events:

Retained according to operational policy.

Analytics events:

Permanent.

Browser SSE:

Transient only.

⸻

16. Event Naming Standard

All event names follow:

<domain>.<business_action>

Examples:

experience.call_started
leadboard.summary_ready
operations.processing_failed
analytics.demo_completed
discovery.booked

Infrastructure names are prohibited.

Incorrect:

redis.message_received
queue.finished
database.updated

⸻

17. Success Criteria

The Event Catalog is complete when:

* Every business transition emits an event.
* Browser updates require no polling.
* Operations receives all operational signals.
* Analytics receives all business signals.
* Future services can subscribe without modifying producers.
* Event contracts remain stable and versioned.