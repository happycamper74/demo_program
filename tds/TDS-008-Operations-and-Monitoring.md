Technical Design Specification (TDS-008)

Experience Platform

Operations & Monitoring

Status: Draft for Implementation

Version: 1.0

Related Documents

* ADR-001 – Interactive Demo Platform Architecture
* PRD-001 – Interactive Demo Platform
* TDS-001 – System Architecture
* TDS-002 – Data Model
* TDS-003 – API Specification
* TDS-004 – State Machines
* TDS-005 – Database Schema
* TDS-006 – Authentication & Authorization
* TDS-007 – Event Catalog

⸻

1. Purpose

This document defines how the Experience Platform is operated, monitored, observed, and supported in production.

It defines:

* Operational responsibilities
* Monitoring
* Alerting
* Health reporting
* Incident management
* Recovery
* Operational dashboards

⸻

2. Operational Principles

The platform shall be:

* Observable
* Recoverable
* Self-healing where possible
* Operationally simple
* Measurable

Operations personnel should spend time responding to business exceptions rather than manually monitoring systems.

⸻

3. Operations Center

The Operations Center is the primary operational interface.

It consists of four workspaces:

* Action Center
* Live Operations
* Session History
* Platform Health

⸻

4. Action Center

Purpose

Display only items requiring human attention.

The Action Center shall never display informational events.

Priority Levels

Critical

High

Medium

Low

Information

Examples

Critical

* Processing permanently failed
* Cleanup permanently failed
* Event pipeline unavailable

High

* Recovery failed
* Discovery booking failure
* Abuse detected

Medium

* Retry in progress
* Session waiting for manual review

Low

* New industry milestone reached
* Demo version adoption

⸻

5. Live Operations

Purpose

Display all active Experience Sessions.

Each session shall display:

* Prospect
* Business
* Industry
* Experience Definition
* Current State
* Current Processing Stage
* Elapsed Time
* Assigned Incident (if any)

Live updates shall be event-driven.

No manual refresh required.

⸻

6. Session History

Operations shall be able to search by:

* Prospect
* Business
* Email
* Phone
* Industry
* Experience Session
* Experience Definition
* LeadBoard Lead
* Discovery Session
* Date Range

Every session shall expose a complete event timeline.

⸻

7. Platform Health

Platform Health provides an executive operational overview.

Components

Experience Engine

Interactive Demo API

LeadBoard Integration

Telephony

AI Provider

Analytics Pipeline

Operations Queue

Discovery Booking

Cleanup Worker

Each component reports:

Healthy

Warning

Critical

Offline

⸻

8. Health Checks

Every service shall expose:

GET /health

Minimum response

{
  "status": "healthy",
  "service": "experience-engine",
  "version": "1.0.0",
  "timestamp": "2026-07-08T14:00:00Z"
}

Extended health endpoints may include:

* Dependency status
* Queue depth
* Database connectivity
* External provider connectivity

⸻

9. Operational Metrics

The platform shall measure:

Experience Sessions Started

Experience Sessions Completed

Experience Completion Rate

Average Session Duration

Average AI Call Duration

Average Lead Processing Time

Average Discovery Booking Rate

Recovery Rate

Retry Success Rate

Cleanup Success Rate

Operations Incident Count

Abuse Detection Count

⸻

10. Alerting

Automatic alerts shall be generated for:

Critical

* AI provider unavailable
* Telephony unavailable
* LeadBoard unavailable
* Event bus unavailable

High

* Recovery failures exceed threshold
* Cleanup failures exceed threshold
* Processing failures exceed threshold

Medium

* Increased abandonment
* Increased abuse detection

⸻

11. Self-Healing

The platform shall automatically retry:

* Summary generation
* Timeline generation
* Cleanup
* Event delivery
* Temporary external failures

The platform shall not automatically retry:

* Invalid phone number
* Duplicate completed experience
* Unauthorized requests
* Invalid qualification

⸻

12. Incident Management

Incident Lifecycle

Detected

↓

Created

↓

Prioritized

↓

Assigned

↓

Resolved

↓

Closed

Incidents shall reference:

* Experience Session
* Prospect
* Related Events
* Root Cause
* Resolution

⸻

13. Logging

Every service shall produce structured logs.

Every log entry shall include:

Request ID

Experience Session ID

Correlation ID

Timestamp

Severity

Component

Event Name

Logs shall never contain:

* Full transcripts
* Access tokens
* Secrets
* Internal credentials

⸻

14. Audit Trail

The platform shall maintain immutable audit records for:

Experience lifecycle

Discovery bookings

Operations actions

Security events

Administrative actions

Audit records shall not be editable.

⸻

15. Recovery Operations

Operations personnel may:

Retry Processing

Retry Cleanup

Force Cleanup

Block Abuse Source

Extend Recovery Window (support use only)

Operations personnel shall not:

Modify Leads

Modify Transcripts

Modify AI Summaries

Modify Analytics

⸻

16. Capacity Monitoring

Monitor:

Concurrent Experience Sessions

Concurrent AI Calls

Concurrent SSE Connections

Concurrent Discovery Bookings

Queue Depth

Worker Utilization

API Response Times

⸻

17. External Dependencies

The platform shall continuously monitor:

LeadBoard

Telephony Provider

AI Provider

Email Provider

SMS Provider

Booking Provider

Dependency failures shall be visible within the Operations Center.

⸻

18. Reporting

Operations reports shall include:

Daily

Weekly

Monthly

Reports shall summarize:

* Success Rate
* Failure Rate
* Recovery Success
* Cleanup Performance
* Discovery Conversion
* Industry Demand
* Abuse Activity

⸻

19. Operational Security

Operations actions shall require authenticated internal users.

Sensitive actions shall require confirmation.

All actions shall be audited.

⸻

20. Disaster Recovery

If the Experience Platform becomes unavailable:

* Existing Experience Sessions shall be recoverable where possible.
* No temporary LeadBoard data shall be orphaned.
* Cleanup jobs shall resume automatically after recovery.
* Duplicate processing shall be prevented.

⸻

21. Success Criteria

Operations is considered complete when:

* Every failure is observable.
* Every incident has a defined workflow.
* Human intervention is required only for exceptional situations.
* Platform health is visible in real time.
* Operational actions are fully auditable.
* Self-healing resolves the majority of recoverable failures.