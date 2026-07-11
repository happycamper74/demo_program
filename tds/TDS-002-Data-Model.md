Technical Design Specification (TDS-002)

Interactive Demo Platform

Data Model

Status: Approved

Version: 1.0

Related Documents

* ADR-001 Interactive Demo Platform Architecture
* PRD-001 Interactive Demo Platform
* TDS-001 System Architecture

⸻

1. Purpose

This document defines the business entities that make up the Interactive Demo Platform.

It intentionally models the business domain rather than physical database tables.

Database implementation details may vary provided the relationships defined in this document are preserved.

⸻

2. Design Principles

The data model follows these principles.

1. Every entity has one owner.
2. Every entity has one lifecycle.
3. Temporary entities remain temporary.
4. Permanent entities remain permanent.
5. Business relationships are explicit.
6. Future industries require configuration rather than redesign.

⸻

3. Domain Overview

The Interactive Demo Platform contains six primary domains.

Prospect
        │
        ▼
Experience
        │
        ▼
LeadBoard
        │
        ▼
Discovery
        │
        ▼
Analytics
        │
        ▼
Operations

⸻

4. Prospect

Purpose

Represents a real business interested in LeadBoard.

Owner

Interactive Demo Platform

Lifecycle

Permanent

⸻

Attributes

Unique Identifier

Full Name

Business Name

Email Address

Phone Number

Business Location

Company Size

Website

Industry

Biggest Challenge

Implementation Timeframe

Current Status

Created Date

Last Activity

⸻

Relationships

One Prospect

↓

Many Experience Sessions

One Prospect

↓

Many Discovery Sessions

One Prospect

↓

Many Analytics Events

⸻

5. Experience

Purpose

Represents one demonstration attempt.

Owner

Experience Engine

Lifecycle

Temporary

⸻

Attributes

Experience Identifier

Experience Version

Industry Edition

Current State

Created Date

Expiration Date

Recovery Deadline

Completion Status

Failure Reason

Cleanup Status

⸻

Relationships

One Experience

↓

One Temporary Authorization

One Experience

↓

One Temporary Lead

One Experience

↓

Many Experience Events

⸻

6. Temporary Lead

Purpose

Represents the temporary LeadBoard lead created from the demonstration.

Owner

LeadBoard

Lifecycle

Temporary

⸻

Attributes

Lead Identifier

LeadBoard Identifier

Current Status

Transcript Status

Summary Status

Timeline Status

Cleanup Status

Created Date

Deleted Date

⸻

Relationships

One Temporary Lead

↓

Many Call Records

One Temporary Lead

↓

Many Timeline Entries

One Temporary Lead

↓

One AI Summary

One Temporary Lead

↓

One Transcript

⸻

7. Discovery Session

Purpose

Represents the next step after the demonstration.

Owner

Interactive Demo Platform

Lifecycle

Permanent

⸻

Attributes

Discovery Identifier

Booking Status

Scheduled Date

Sales Representative

Completion Status

Created Date

⸻

Relationships

One Prospect

↓

Many Discovery Sessions

⸻

8. Analytics Event

Purpose

Records measurable business behaviour.

Owner

Interactive Demo Platform

Lifecycle

Permanent

⸻

Attributes

Event Identifier

Prospect

Experience

Event Type

Timestamp

Metadata

⸻

Examples

Landing Viewed

Industry Selected

Qualification Completed

Demo Started

Call Started

Call Completed

Lead Ready

Lead Viewed

Discovery Clicked

Discovery Booked

⸻

9. Operations Event

Purpose

Supports operational monitoring.

Owner

Operations Center

Lifecycle

Permanent

⸻

Examples

Processing Failed

Cleanup Failed

Recovery Started

Recovery Completed

Retry Started

Retry Completed

Abuse Detected

Session Expired

⸻

10. Experience State Machine

Draft
↓
Qualified
↓
Waiting For Call
↓
Call Active
↓
Processing
↓
Lead Ready
↓
Discovery
↓
Completed
↓
Purged

Failure states

Expired

Technical Failure

Abandoned

Recovery

⸻

11. Data Ownership

Prospect Data

Owner

Interactive Demo Platform

Retention

Permanent

⸻

Experience Data

Owner

Experience Engine

Retention

Temporary

⸻

Lead Data

Owner

LeadBoard

Retention

Temporary

⸻

Analytics

Owner

Interactive Demo Platform

Retention

Permanent

⸻

Operations

Owner

Interactive Demo Platform

Retention

Permanent

⸻

12. Entity Relationships

Prospect
│
├─────────────┐
▼             ▼
Experience     Discovery
│
▼
Temporary Lead
│
├─────────────┐
▼             ▼
Transcript     Timeline
│
▼
Summary

⸻

13. Identity Rules

Every entity shall possess a globally unique identifier.

Prospects remain identifiable across multiple Experience Versions.

Experience Sessions remain unique per demonstration.

Temporary Leads remain unique per Experience Session.

Analytics Events remain immutable.

⸻

14. Lifecycle Rules

Prospect

Permanent

Experience

Temporary

Lead

Temporary

Transcript

Temporary

Timeline

Temporary

Summary

Temporary

Analytics

Permanent

Discovery

Permanent

⸻

15. Future Expansion

The model supports future:

Experience Versions

Industry Editions

Conference Experiences

Training Experiences

Sales Experiences

without modification to the Prospect entity.

New experience types extend the Experience entity rather than replacing it.

⸻

16. Design Constraints

The model shall avoid duplication of ownership.

LeadBoard shall never own Prospect qualification.

The Interactive Demo Platform shall never own production Leads.

Temporary entities shall never become permanent by accident.

Analytics shall remain independent of temporary resource cleanup.

⸻

17. Success Criteria

The data model is successful when:

* Every business entity has one owner.
* Every lifecycle is clearly defined.
* Future experiences reuse existing entities.
* Cleanup affects only temporary entities.
* Permanent business intelligence survives temporary cleanup.
* Future industries require configuration instead of schema redesign.