Technical Design Specification (TDS-001)

Interactive Demo Platform

System Architecture

Status: Approved

Version: 1.0

Related Documents

* ADR-001 Interactive Demo Platform Architecture
* PRD-001 Interactive Demo Platform

⸻

1. Purpose

This Technical Design Specification defines the high-level architecture of the Interactive Demo Platform.

It specifies system boundaries, responsibilities, component interactions, and integration points.

It intentionally does not define implementation details such as database schema or API payloads.

Those are covered by dedicated TDS documents.

⸻

2. Architectural Principles

The platform shall follow the following principles.

Principle 1

Business responsibilities shall remain separated.

Marketing responsibilities shall never be implemented inside LeadBoard.

LeadBoard responsibilities shall never be implemented inside the Interactive Demo Platform.

⸻

Principle 2

LeadBoard remains the system of record.

The Interactive Demo Platform orchestrates the experience.

LeadBoard executes product functionality.

⸻

Principle 3

Temporary resources shall remain temporary.

Experience Sessions.

Temporary Leads.

Transcripts.

Summaries.

Processing artifacts.

These resources shall automatically expire.

⸻

Principle 4

The architecture shall be forward-compatible.

Future demonstrations shall reuse the Experience Engine.

Future industries shall reuse the existing orchestration model.

⸻

3. High-Level Architecture

                    Visitor
                       │
                       ▼
       Interactive Demo Website
                       │
                       ▼
            Experience Engine
                       │
                       ▼
              LeadBoard API
                       │
                       ▼
             LeadBoard Platform
                       │
      ┌────────────┬─────────────┐
      ▼            ▼             ▼
 AI Conversation   Lead Engine   Event Stream

⸻

4. System Responsibilities

Interactive Demo Website

Responsibilities

* Landing Pages
* Industry Selection
* Qualification
* Prospect Management
* Session Initiation
* Discovery Booking
* Marketing Analytics
* Operations Center

Must not

* Create Leads
* Process Calls
* Execute AI
* Store Temporary Product Data

⸻

Experience Engine

Responsibilities

* Experience Session lifecycle
* Session orchestration
* Temporary authorization
* Recovery
* Cleanup orchestration
* Event routing

Must not

* Execute AI
* Own marketing
* Own LeadBoard business logic

⸻

LeadBoard

Responsibilities

* AI conversation processing
* Transcript generation
* Lead creation
* Timeline generation
* AI summaries
* Restricted Lead View
* Temporary lead ownership

Must not

* Manage marketing
* Own Discovery Session booking
* Own landing pages

⸻

5. Primary Components

The architecture consists of the following components.

Interactive Demo Website

Experience Engine

LeadBoard API

LeadBoard

Telephony Provider

AI Conversation Provider

Operations Center

Analytics Engine

⸻

6. Integration Flow

Normal demonstration flow.

Prospect
↓
Qualification
↓
Experience Session
↓
Phone Call
↓
LeadBoard
↓
Temporary Lead
↓
Restricted Lead View
↓
Discovery Session
↓
Cleanup

⸻

7. Data Ownership

Prospect Data

Owner

Interactive Demo Platform

Examples

* Name
* Email
* Phone
* Qualification
* Industry
* Discovery Status

⸻

Experience Data

Owner

Experience Engine

Examples

* Experience Session
* Session State
* Recovery State
* Authorization

⸻

Product Data

Owner

LeadBoard

Examples

* Lead
* Transcript
* Summary
* Timeline
* Call Information

⸻

Analytics

Owner

Interactive Demo Platform

LeadBoard provides events.

The Demo Platform owns reporting.

⸻

8. Security Boundary

LeadBoard shall never expose production resources.

Experience Sessions shall receive restricted authorization.

Temporary authorization shall expire automatically.

Cross-session access is prohibited.

⸻

9. Failure Strategy

Failures shall be recoverable.

The architecture shall prefer:

Resume

instead of

Restart.

Completed work shall never be unnecessarily repeated.

⸻

10. Live Communication

The Interactive Demo Platform shall receive business events from LeadBoard.

The preferred transport mechanism is:

Server-Sent Events.

Business events include:

* Call Started
* Transcript Ready
* Lead Ready
* Summary Ready
* Processing Complete

⸻

11. Cleanup

Temporary resources shall be automatically removed.

Cleanup shall be:

* Automatic
* Idempotent
* Recoverable

Cleanup shall never remove permanent Prospect information.

⸻

12. Extensibility

The architecture shall support:

Future industries.

Future experience versions.

Conference demonstrations.

Sales demonstrations.

Training experiences.

without requiring architectural redesign.

⸻

13. Architectural Constraints

The following constraints are mandatory.

LeadBoard remains the product platform.

The Interactive Demo Platform remains the experience platform.

Responsibilities shall not cross architectural boundaries.

Temporary data shall never become permanent product data.

Marketing functionality shall never migrate into LeadBoard.

⸻

14. Success Criteria

The architecture is considered successful when:

Each component has a single responsibility.

Responsibilities remain separated.

Future demonstrations reuse the Experience Engine.

LeadBoard remains unaware of marketing concerns.

Temporary resources remain temporary.

Future extensions require configuration rather than redesign.
