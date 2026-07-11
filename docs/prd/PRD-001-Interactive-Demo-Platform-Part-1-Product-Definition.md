Product Requirements Document (PRD-001)

Interactive Demo Platform

Document Status: Approved for Architecture

Version: 1.0

Related Documents

* ADR-001 – Interactive Demo Platform Architecture
* TDS-001 – Interactive Demo Platform Technical Design Specification (Pending)

⸻

1. Product Overview

1.1 Purpose

The Interactive Demo Platform allows prospective customers to experience LeadBoard through a realistic, temporary demonstration using the actual LeadBoard processing pipeline.

The platform exists to demonstrate LeadBoard’s value, qualify prospects, and convert them into Discovery Sessions.

The Interactive Demo Platform is not a production workspace, customer onboarding process, or free trial.

⸻

2. Product Vision

The Interactive Demo Platform shall provide prospects with a guided experience that demonstrates how LeadBoard answers calls, captures customer information, creates leads, and automates administrative work.

The experience shall culminate in a restricted, live Lead View showing the results of the prospect’s own phone conversation.

⸻

3. Product Goals

The platform shall:

* Demonstrate the real LeadBoard workflow.
* Personalize the experience for each prospect.
* Capture qualified prospect information.
* Validate demand for future industries.
* Convert qualified prospects into Discovery Sessions.
* Protect LeadBoard resources from abuse.
* Keep all demonstration data temporary.

⸻

4. Non-Goals

The Interactive Demo Platform shall not:

* Replace customer onboarding.
* Replace LeadBoard.
* Provide production accounts.
* Provision customer environments.
* Persist demonstration leads permanently.
* Act as a CRM.
* Manage customers after purchase.

⸻

5. System Context

The Interactive Demo Platform is a separate system.

It communicates with LeadBoard through dedicated APIs.

LeadBoard remains the authoritative owner of:

* AI processing
* Lead creation
* Transcript generation
* Timeline generation
* Summary generation

The Interactive Demo Platform owns:

* Marketing
* Qualification
* Demo sessions
* Booking
* Analytics
* Operations

⸻

6. Target Users

Primary user:

Prospective LeadBoard customers.

Current supported industry:

* Plumbing

Future supported industries:

* Electrical
* HVAC
* Roofing
* Locksmith
* Additional industries as determined by business demand.

⸻

7. User Journey

The standard journey shall be:

Landing Page
↓
Industry Selection
↓
Qualification Form
↓
Interactive Demo Session Created
↓
Phone Number Presented
↓
Prospect Calls
↓
LeadBoard Processes Call
↓
Restricted Lead View Appears
↓
Prospect Watches Live Processing
↓
Discovery Session Invitation
↓
Session Ends
↓
Temporary Data Purged

⸻

8. Actors

Prospect

May:

* View landing page.
* Complete qualification.
* Run one interactive demo per experience version.
* View restricted Lead View.
* Book a Discovery Session.

May not:

* Access LeadBoard.
* View other leads.
* Modify demo data.
* Re-run completed demo versions.

⸻

Sales

May:

* View qualified prospects.
* View demo completion.
* View transcript.
* View AI summary.
* View qualification information.
* Conduct Discovery Sessions.

⸻

Operations

May:

* View active sessions.
* Retry failed processing.
* Force cleanup.
* Review abuse.
* View operational health.

Operations may not modify historical demo content.

⸻

9. Industry Selection

The first interaction shall request the prospect’s industry.

If the selected industry is supported:

Continue normally.

If unsupported:

Display an informational notice explaining that the current demonstration uses a plumbing scenario while collecting industry interest for future editions.

The prospect shall still be allowed to continue.

⸻

10. Prospect Qualification

Prior to creating a demo session the system shall collect:

Required:

* Full Name
* Business Name
* Email Address
* Phone Number

Interactive Demo qualification:

* Business Location
* Company Size
* Website (or “No Website”)
* Biggest Business Challenge
* Planned Implementation Timeframe

Qualification data shall be stored independently of temporary demo data.

⸻

11. Experience Session

Each Interactive Demo shall create one temporary Experience Session.

The Experience Session shall own:

* Session lifecycle
* Temporary authorization
* Temporary Lead ownership
* Recovery state
* Cleanup state
* Analytics state

An Experience Session shall exist independently from LeadBoard’s internal processing pipeline.

⸻

12. Demo Lifecycle

States:

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

Discovery Invitation

↓

Completed

↓

Purged

Failed states:

* Expired
* Technical Failure
* Abandoned

⸻

13. Session Recovery

If the active demo connection is lost:

The session shall enter Recovery Mode.

Recovery duration:

Five minutes.

If the prospect reconnects during the recovery period:

The session shall resume.

If recovery expires:

Temporary demo resources shall be purged.

⸻

14. Completion

A demo is considered completed only when:

* The phone conversation completed successfully.
* LeadBoard created the temporary lead.
* The restricted Lead View was successfully presented.

Only completed demos count toward demo eligibility.

Expired or failed sessions do not.

⸻

15. Product Success Criteria

The Interactive Demo Platform succeeds when it:

* Demonstrates LeadBoard using the real processing pipeline.
* Produces a memorable product experience.
* Converts qualified prospects into Discovery Sessions.
* Generates roadmap intelligence through industry selection.
* Protects operational costs through adaptive security.
* Cleans temporary resources automatically.