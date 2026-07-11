Experience Platform Implementation Backlog

Status: Approved for implementation
Purpose: Cursor-ready build backlog for the LeadBoard Experience Platform and Interactive Demo.

⸻

Repository Map

Repository	Purpose
demo_program (Experience Platform)	Demo website, Experience Engine, BFF, Operations, Analytics, Mock LeadBoard adapter
twilio_transcribe_new (LeadBoard)	Existing LeadBoard backend/frontend integrations (deferred until EP-11)

Integration Strategy

Phase A (EP-2 through EP-10): demo_program uses MockLeadBoardClient for all LeadBoard integration. No twilio_transcribe_new changes required.

Phase B (EP-11): Replace mock with real LeadBoard integration in twilio_transcribe_new.

⸻

Epic EP-1 — Experience Platform Foundation

EP-1.1 — Create Experience Definition model

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: experience-engine
Goal: Define reusable experience configurations such as Plumbing Demo v1.

Build:

* ExperienceDefinition
* version
* industry
* status
* scenario
* estimated duration
* max call duration
* AI agent reference

References: TDS-002, TDS-005
Acceptance Criteria:

* Experience Definitions can be created, read, activated, and deactivated.
* Multiple versions can exist.
* Multiple industries can be represented.
* No demo behavior is hardcoded outside the definition.

⸻

EP-1.2 — Create Prospect model

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: experience-engine
Goal: Store permanent prospect data.

Build:

* full name
* business name
* email
* phone number
* industry
* location
* company size
* website
* biggest challenge
* implementation timeframe

References: PRD Part 2, TDS-002, TDS-005
Acceptance Criteria:

* Prospect can be created or updated.
* Email and phone can be used for lookup.
* Prospect data is not deleted when demo data is purged.

⸻

EP-1.3 — Create Experience Session model

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: experience-engine
Goal: Track one temporary experience attempt.

Build:

* session ID
* prospect reference
* experience definition reference
* state
* expiration
* recovery deadline
* LeadBoard references
* cleanup status

References: TDS-002, TDS-004, TDS-005
Acceptance Criteria:

* Session can move through documented states only.
* One active session per prospect and experience definition.
* Expired sessions do not count as completed demos.

⸻

EP-1.4 — Build Workflow Orchestrator

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: workflow-orchestrator
Goal: Own all state transitions.

References: TDS-004
Acceptance Criteria:

* Invalid transitions are rejected.
* Valid transitions are logged.
* Every transition emits a domain event.
* Transitions are idempotent.

⸻

EP-1.5 — Implement Experience Tokens

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: auth package / demo-api-bff
Goal: Temporary session-based auth without accounts.

References: TDS-006
Acceptance Criteria:

* Token scoped to one experience session.
* Token expires automatically.
* Token does not represent a LeadBoard user.
* Expired token blocks access.

⸻

Epic EP-2 — LeadBoard Adapter

Repository: demo_program (Experience Platform)
Goal: Provide a LeadBoard-shaped integration boundary so the Experience Platform can be built and tested end-to-end before any twilio_transcribe_new changes.

Note: demo_program uses MockLeadBoardClient until EP-11 is complete.

⸻

EP-2.1 — Create LeadBoardClient interface

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Package: leadboard-client (or equivalent shared package)
Goal: Define the integration port for LeadBoard demo APIs.

Build:

* LeadBoardClient interface
* Request/response types aligned with TDS-003 demo integration endpoints
* Adapter selection configuration (mock vs real; real disabled until EP-11)

References: TDS-003, TDS-006, ADR-001
Acceptance Criteria:

* Interface covers session mirror, call binding, restricted lead view, and purge operations.
* No twilio_transcribe_new dependency.
* Real implementation can be added later without changing consumers.

⸻

EP-2.2 — Implement MockLeadBoardClient

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Package: leadboard-client (or equivalent shared package)
Goal: Provide the default in-process/local LeadBoard adapter for development and testing.

Build:

* MockLeadBoardClient implementing LeadBoardClient
* Configurable shared demo org/phone settings
* Deterministic test fixtures for local development

References: ADR-001, TDS-003
Acceptance Criteria:

* MockLeadBoardClient is the default adapter in local/dev environments.
* Shared demo resource configuration does not expose production org data.
* Consumers depend on LeadBoardClient, not the mock implementation directly.

⸻

EP-2.3 — Mock demo session mirror

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: demo-api-bff / leadboard-client
Goal: Allow the Experience Platform to track temporary experience-linked product data without twilio_transcribe_new.

Build:

* Mock session mirror store
* Mirror links to external experience session ID
* Status, lead ID, call ID, and expiry fields

References: TDS-003, TDS-005
Acceptance Criteria:

* Mock can store minimal session mirror.
* Mirror links to external experience session ID.
* Mirror supports status, lead ID, call ID, and expiry.

⸻

EP-2.4 — Mock call processing and phone binding

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: demo-api-bff / leadboard-client
Goal: Simulate inbound call binding and processing milestones for demo sessions.

References: PRD Part 2, TDS-003, TDS-007
Acceptance Criteria:

* Caller phone number matches registered phone.
* Unmatched calls are not bound.
* Bound calls attach CallSid to the session mirror.
* One active call per session.
* Mock emits LeadBoard-shaped processing events (transcript, summary, lead ready).

⸻

EP-2.5 — Mock restricted lead view data

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: demo-api-bff / leadboard-client
Goal: Serve restricted lead view data for the demo without the LeadBoard application shell.

References: ADR-001, TDS-003, TDS-006
Acceptance Criteria:

* Mock returns lead header, transcript, summary, and timeline.
* No navigation, settings, lead list, mutations, or admin actions.
* Token can access only its allowed lead.
* Cross-session access is blocked.

⸻

EP-2.6 — Mock temporary data purge

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: cleanup-worker / leadboard-client
Goal: Simulate deletion of temporary demo lead graph.

References: TDS-003, TDS-005
Acceptance Criteria:

* Purge deletes temporary lead, transcript, summary, timeline, and call artifacts in mock storage.
* Purge does not delete shared demo infrastructure.
* Purge is idempotent.
* Failed purge creates operational incident.

⸻

Epic EP-3 — Demo API / BFF

Repository: demo_program (Experience Platform)
Note: Integrates with MockLeadBoardClient (EP-2) until EP-11 is complete.

EP-3.1 — Create Demo API service

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: demo-api-bff
Goal: Browser talks to one backend API.

References: TDS-003
Acceptance Criteria:

* Service exposes /api/demo/v1.
* Browser does not call LeadBoard directly.
* Requests include correlation/request IDs.

⸻

EP-3.2 — Implement Start Demo endpoint

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: demo-api-bff
Goal: Create or update Prospect and start session.

References: PRD Part 2, TDS-003
Acceptance Criteria:

* Valid form creates Prospect.
* Creates Experience Session.
* Returns shared demo phone number.
* Unsupported industry notice is returned when applicable.
* Already-completed demo returns Discovery CTA response.

⸻

EP-3.3 — Implement session status endpoint

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: demo-api-bff
Goal: Frontend can read current state.

References: TDS-003, TDS-004
Acceptance Criteria:

* Returns state, current step, expiration, recovery availability.
* Does not expose internal LeadBoard secrets.

⸻

EP-3.4 — Implement session recovery endpoint

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: demo-api-bff
Goal: Restore inactive sessions within recovery window.

References: PRD Part 3, TDS-004
Acceptance Criteria:

* Recovery succeeds within 5 minutes.
* Recovery fails after expiry.
* New temporary token issued after recovery.

⸻

EP-3.5 — Implement SSE endpoint

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: demo-api-bff
Goal: Stream live business events to browser.

References: TDS-007
Acceptance Criteria:

* Uses Server-Sent Events.
* Sends presentation-safe events only.
* Reconnect works through status reconciliation.

⸻

Epic EP-4 — Interactive Demo Website

Repository: demo_program (Experience Platform)
Note: Integrates with MockLeadBoardClient (EP-2) until EP-11 is complete.

EP-4.1 — Build landing page

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App: demo-web
Goal: Explain demo and start journey.

References: PRD Part 1
Acceptance Criteria:

* Explains real LeadBoard workflow.
* Communicates expected 2–3 minute call.
* CTA starts qualification.

⸻

EP-4.2 — Build industry selector

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App: demo-web
Goal: Capture industry before qualification.

References: PRD Part 2
Acceptance Criteria:

* Plumbing continues normally.
* Other industries show notice.
* User can still continue.
* Industry is recorded.

⸻

EP-4.3 — Build qualification form

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App: demo-web
Goal: Collect prospect and business qualification.

References: PRD Part 2
Acceptance Criteria:

* Required fields validated.
* Website supports “No website.”
* Form includes honeypot field.
* Successful submit starts session.

⸻

EP-4.4 — Build demo instruction page

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App: demo-web
Goal: Guide prospect to call shared number.

Acceptance Criteria:

* Shows shared phone number.
* Explains to call from registered phone.
* Shows scenario suggestions.
* Does not provide full script.

⸻

EP-4.5 — Build live lead experience shell

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App: demo-web
Goal: Host the demo journey around restricted Lead View.

Acceptance Criteria:

* Shows progress milestones.
* Displays restricted Lead View when ready.
* Maintains CTA to Discovery Session.
* Does not embed marketing into LeadBoard itself.

⸻

EP-4.6 — Phone instructions

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App: demo-web
Goal: Present shared demo phone number and registered-phone guidance.

⸻

EP-4.7 — Recovery screen

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App: demo-web
Goal: Allow session recovery within the recovery window.

⸻

EP-4.8 — Restricted Lead View integration shell

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App: demo-web
Goal: Display mock restricted lead data from the BFF when available.

⸻

Epic EP-5 — Live Processing

Repository: demo_program (Experience Platform)
Note: Integrates with MockLeadBoardClient (EP-2) until EP-11 is complete.

EP-5.1 — Map domain events to presentation events

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: workflow-orchestrator / event-contracts / demo-api-bff
References: TDS-007
Acceptance Criteria:

* Internal events are not sent directly to browser.
* Browser receives business-friendly events only.

⸻

EP-5.2 — Implement live progress UI

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App: demo-web
Acceptance Criteria:

* Shows call received.
* Shows transcript ready.
* Shows customer details extracted.
* Shows summary ready.
* Shows lead ready.

⸻

Epic EP-6 — Discovery Booking

EP-6.1 — Implement suggested slot API

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: demo-api-bff / discovery-booking
Acceptance Criteria:

* Returns best available slots.
* Does not show full calendar first.
* Supports “show more times.”

⸻

EP-6.2 — Implement booking flow

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App + Service: demo-web, discovery-booking / demo-api-bff
Acceptance Criteria:

* User selects slot.
* Confirmation screen shown.
* Email confirmation sent.
* SMS confirmation sent.
* Demo remains viewable until session ends.

⸻

EP-6.3 — Booking workflow

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App: demo-web

⸻

EP-6.4 — Confirmation page

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App: demo-web

⸻

EP-6.5 — Email confirmation mock

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Package: discovery-booking

⸻

EP-6.6 — SMS confirmation mock

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Package: discovery-booking

⸻

Epic EP-7 — Analytics

EP-7.1 — Implement analytics event pipeline

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: analytics
References: PRD Part 3, TDS-007
Acceptance Criteria:

* Records funnel events.
* Events are immutable.
* Events survive temporary demo cleanup.

⸻

EP-7.2 — Implement conversion funnel reporting

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service/App: analytics, operations-center
Acceptance Criteria:

* Landing viewed to Discovery booked funnel visible.
* Drop-off rates visible.
* Time between stages visible.

⸻

EP-7.3 — Implement industry demand reporting

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service/App: analytics, operations-center
Acceptance Criteria:

* Shows industry selected.
* Shows demo started/completed by industry.
* Shows Discovery booked by industry.

⸻

Epic EP-8 — Operations Center

Repository: demo_program (Experience Platform)
Note: LeadBoard health reflects MockLeadBoardClient status until EP-11 is complete.

EP-8.1 — Build Action Center

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App: operations-center
References: TDS-008
Acceptance Criteria:

* Shows only actionable items.
* Prioritizes critical issues.
* Supports retry and cleanup actions.

⸻

EP-8.2 — Build Live Operations view

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App: operations-center
Acceptance Criteria:

* Shows active sessions.
* Updates live.
* Shows current state and elapsed time.

⸻

EP-8.3 — Build Session History

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App: operations-center
Acceptance Criteria:

* Search by prospect, business, email, phone, industry, date.
* Shows complete session timeline.

⸻

EP-8.4 — Build Platform Health view

Implementation Status: Complete

Repository: demo_program (Experience Platform)
App: operations-center
Acceptance Criteria:

* Shows health for Experience Engine, BFF, MockLeadBoardClient, Twilio, AI, booking, cleanup.
* Critical failures generate Action Center items.

⸻

Epic EP-9 — Security & Abuse Protection

EP-9.1 — Implement honeypot protection

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service/App: demo-web, demo-api-bff
Acceptance Criteria:

* Hidden field exists.
* Filled honeypot rejects submission.
* Rejection does not reveal detection reason.

⸻

EP-9.2 — Implement rate limiting

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: demo-api-bff
Acceptance Criteria:

* Limits by IP.
* Limits by phone.
* Limits by email.
* Limits are configurable.

⸻

EP-9.3 — Implement adaptive risk response

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Service: demo-api-bff
Acceptance Criteria:

* Low risk starts demo.
* Medium risk may trigger Turnstile.
* High risk redirects to Discovery/contact.
* Critical risk blocks.

⸻

Epic EP-10 — Hardening & Launch

EP-10.1 — End-to-end validation

Implementation Status: Complete

Repository: demo_program (Experience Platform)
References: TDS-010
Acceptance Criteria:

* Supported industry demo passes using MockLeadBoardClient.
* Unsupported industry demo passes.
* Recovery passes.
* Purge passes.
* Discovery booking passes.

Note: Real twilio_transcribe_new end-to-end validation is required after EP-11.

⸻

EP-10.2 — Load testing

Implementation Status: Complete

Repository: demo_program (Experience Platform)
Acceptance Criteria:

* Concurrent sessions tested.
* Concurrent calls tested.
* SSE concurrency tested.
* Bottlenecks documented.

⸻

EP-10.3 — Production readiness

Implementation Status: Complete

Repository: demo_program (Experience Platform) and twilio_transcribe_new (LeadBoard, after EP-11)
References: TDS-009, TDS-010
Acceptance Criteria:

* Monitoring enabled.
* Alerts enabled.
* Secrets configured.
* Rollback tested.
* Runbook written.

Note: Production launch requires EP-11 (Real LeadBoard Integration) to be complete.

⸻

Epic EP-11 — Real LeadBoard Integration

Repository: twilio_transcribe_new (LeadBoard)
Goal: Replace MockLeadBoardClient with real LeadBoard integration. Deferred until demo_program mock end-to-end flow is complete.

Note: demo_program switches from MockLeadBoardClient to real LeadBoard adapter when this epic is complete.

⸻

EP-11.1 — Create LeadBoard demo/session mirror in twilio_transcribe_new

Repository: twilio_transcribe_new (LeadBoard)
Service: backend
Goal: Allow LeadBoard to track temporary experience-linked product data.

References: TDS-003, TDS-005
Acceptance Criteria:

* LeadBoard can store minimal session mirror.
* Mirror links to external experience session ID.
* Mirror supports status, lead ID, call ID, and expiry.

⸻

EP-11.2 — Support shared demo resource owner in twilio_transcribe_new

Repository: twilio_transcribe_new (LeadBoard)
Service: backend
Goal: Use shared demo infrastructure while preserving isolation.

References: ADR-001, TDS-003
Acceptance Criteria:

* Shared demo owner/org exists.
* Demo calls can create temporary leads.
* Production org data is never exposed.

⸻

EP-11.3 — Implement real phone-number call binding in twilio_transcribe_new

Repository: twilio_transcribe_new (LeadBoard)
Service: backend
Goal: Match inbound Twilio calls to active experience sessions.

References: PRD Part 2, TDS-003
Acceptance Criteria:

* Caller phone number matches registered phone.
* Unmatched calls are not bound.
* Bound calls attach CallSid to the session mirror.
* One active call per session.

⸻

EP-11.4 — Create real restricted Lead View in twilio_transcribe_new

Repository: twilio_transcribe_new (LeadBoard)
Service: frontend + backend
Goal: Show real LeadBoard lead data without full app access.

References: ADR-001, TDS-003, TDS-006
Acceptance Criteria:

* View displays lead header, transcript, summary, timeline.
* No navigation, settings, lead list, mutations, or admin actions.
* Token can access only its allowed lead.
* Cross-session access is blocked.

⸻

EP-11.5 — Implement real temporary data purge in twilio_transcribe_new

Repository: twilio_transcribe_new (LeadBoard)
Service: backend
Goal: Delete temporary demo lead graph.

References: TDS-003, TDS-005
Acceptance Criteria:

* Purge deletes temporary lead, transcript, summary, timeline, call artifacts.
* Purge does not delete shared demo infrastructure.
* Purge is idempotent.
* Failed purge creates operational incident.

⸻

Cursor Usage Rule

Implement one story at a time.

Use this prompt format:

Implement Story EP-X.Y from IMPLEMENTATION-BACKLOG.md.
Before coding:
1. Read 00-START-HERE.md.
2. Read ADR-001.
3. Read the referenced PRD sections.
4. Read the referenced TDS sections.
5. Produce a short implementation plan.
Then implement only this story.
Do not add undocumented functionality.
Update tests and documentation if needed.

⸻

Definition of Done

A story is done only when:

* Code is implemented.
* Tests pass.
* Types/lint pass.
* Required events are emitted.
* Required logs are present.
* Security rules are respected.
* Documentation is updated if behavior changes.
* Acceptance criteria are satisfied.