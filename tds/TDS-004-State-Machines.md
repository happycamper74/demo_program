Technical Design Specification (TDS-004)

Interactive Demo Platform

State Machines

Status: Approved

Version: 1.0

Related Documents

* ADR-001 – Interactive Demo Platform Architecture
* PRD-001 – Interactive Demo Platform
* TDS-001 – System Architecture
* TDS-002 – Data Model
* TDS-003 – API Specification

⸻

1. Purpose

This document defines every state machine used by the Interactive Demo Platform.

State machines guarantee:

* Predictable behaviour
* Safe retries
* Recovery after failures
* Idempotent processing
* Clear operational visibility

A resource may only exist in one state at a time.

Transitions must always be explicit.

⸻

2. Experience Session State Machine

The Experience Session is the primary orchestration entity.

Draft
    │
    ▼
Qualified
    │
    ▼
WaitingForCall
    │
    ▼
CallActive
    │
    ▼
Processing
    │
    ▼
LeadReady
    │
    ▼
Discovery
    │
    ▼
Completed
    │
    ▼
Purged

Failure states

WaitingForCall
      │
      ▼
Expired
CallActive
      │
      ▼
CallFailed
Processing
      │
      ▼
TechnicalFailure
Any Active State
      │
      ▼
Recovery

⸻

3. State Definitions

Draft

Created.

Qualification not complete.

Allowed transitions

* Qualified

⸻

Qualified

Prospect completed qualification.

Allowed transitions

* WaitingForCall

⸻

WaitingForCall

Experience Session exists.

Phone number displayed.

15-minute timer active.

Allowed transitions

* CallActive
* Expired

⸻

CallActive

Prospect is speaking with AI.

Allowed transitions

* Processing
* CallFailed

⸻

Processing

LeadBoard owns processing.

Progress may include

* Transcript
* Extraction
* Timeline
* Summary

Allowed transitions

* LeadReady
* TechnicalFailure
* Recovery

⸻

LeadReady

Restricted Lead View available.

Allowed transitions

* Discovery
* Completed

⸻

Discovery

Prospect is interacting with Discovery booking.

Allowed transitions

* Completed

⸻

Completed

Experience finished successfully.

Allowed transitions

* Purged

⸻

Purged

Terminal state.

No further transitions permitted.

⸻

4. Recovery State Machine

Loss of active connection.

Connected
↓
Disconnected
↓
Recovery
↓
Reconnect?
├── Yes → Previous State
└── No → Purged

Recovery duration

Five minutes.

Recovery timer starts after loss of active connection.

⸻

5. LeadBoard Processing State Machine

LeadBoard processing is independent from Experience Session.

Call Received
↓
Transcript Stored
↓
Facts Extracted
↓
Timeline Built
↓
Summary Generated
↓
Lead Ready

Failures resume from the last completed step.

Example

Transcript Stored
✓
Facts Extracted
✓
Summary Failed
↓
Retry Summary
↓
Lead Ready

Previously completed stages shall never execute again unless explicitly required.

⸻

6. Cleanup State Machine

Pending
↓
Queued
↓
Running
↓
Completed

Failure

Running
↓
Failed
↓
Retry
↓
Completed

Cleanup must be idempotent.

Running cleanup multiple times shall not create inconsistent data.

⸻

7. Discovery Session State Machine

Suggested
↓
Selected
↓
Booked
↓
Confirmed
↓
Completed

Alternative paths

Suggested
↓
Expired
or
Cancelled

⸻

8. Abuse Protection State Machine

Normal
↓
Suspicious
↓
Challenge Required
↓
Blocked

Recovery

Blocked
↓
Manual Review
↓
Normal

⸻

9. Operations State Machine

Operational incidents

Detected
↓
Queued
↓
Assigned
↓
Resolved
↓
Closed

Not every incident requires manual intervention.

Automatic retries may resolve incidents before assignment.

⸻

10. Analytics Funnel State Machine

Landing Viewed
↓
Industry Selected
↓
Qualification Completed
↓
Demo Started
↓
Call Started
↓
Call Completed
↓
Lead Ready
↓
Lead Viewed
↓
Discovery Clicked
↓
Discovery Booked

Every transition records an immutable analytics event.

⸻

11. Retry Rules

Retries are allowed only for recoverable failures.

Recoverable

* Summary generation
* Timeline generation
* Event delivery
* Cleanup
* Temporary network failures

Non-recoverable

* Invalid qualification
* Phone mismatch
* Duplicate completed demo
* Unauthorized access

⸻

12. Timeout Rules

Waiting for Call

15 minutes

Recovery

5 minutes

Maximum AI Call

4 minutes

Operations Retry

Configurable

Cleanup

Automatic background worker

⸻

13. State Transition Rules

Every transition shall:

* Be atomic.
* Be logged.
* Emit an event.
* Update timestamps.
* Be idempotent.

No transition may skip required intermediate states.

⸻

14. Invalid Transitions

Examples

Completed

↓

WaitingForCall

❌ Invalid

Purged

↓

Processing

❌ Invalid

Expired

↓

CallActive

❌ Invalid

LeadReady

↓

WaitingForCall

❌ Invalid

⸻

15. Event Emission

Every successful transition shall emit a domain event.

Examples

experience.qualified
experience.waiting_for_call
experience.call_started
experience.processing
experience.lead_ready
experience.completed
experience.purged

These events feed:

* Analytics
* Operations Center
* SSE
* Audit log

⸻

16. Concurrency Rules

Only one active Experience Session may exist for the same Prospect and Experience Definition.

Only one cleanup process may execute for an Experience Session.

Only one Discovery booking may be confirmed for an Experience Session.

State transitions must use optimistic or pessimistic locking to prevent race conditions.

⸻

17. Design Principles

State machines shall always be:

* Deterministic
* Observable
* Recoverable
* Idempotent
* Forward-only

Backward transitions are prohibited except when explicitly defined for recovery.

⸻

18. Success Criteria

This specification is complete when:

* Every business process has a defined lifecycle.
* Every state transition is explicit.
* Invalid transitions are rejected.
* Recovery paths are defined.
* Cleanup is deterministic.
* Engineers never need to infer lifecycle behaviour.