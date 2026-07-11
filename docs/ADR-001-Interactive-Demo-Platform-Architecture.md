ADR-001 — Interactive Demo Platform Architecture

Status: Accepted
Date: 2026-07-08
System: LeadBoard Interactive Demo Platform
Related Systems: LeadBoard Application, Experience Engine, Environment Provisioning Engine

⸻

1. Context

LeadBoard needs an interactive website demo that allows prospects to experience the real LeadBoard workflow before becoming customers.

The demo must show:

* A real phone call.
* AI receptionist conversation.
* Transcript processing.
* Lead creation.
* Lead detail page.
* Live updates.
* Discovery Session booking.

The demo must not become:

* A customer onboarding flow.
* A production environment.
* A free trial.
* Part of the Environment Provisioning Engine.
* A fake version of LeadBoard.

⸻

2. Decision

LeadBoard will implement a separate Interactive Demo Platform powered by an internal Experience Engine.

The Interactive Demo Platform owns:

* Lead capture.
* Prospect qualification.
* Industry selection.
* Experience Session creation.
* Demo instructions.
* Session lifecycle.
* Abuse protection.
* Analytics.
* Discovery Session booking.
* Operations Center.

The LeadBoard Application owns:

* AI call handling.
* Transcript processing.
* Lead creation.
* Lead detail data.
* Timeline.
* Summary.
* Restricted product view.
* Temporary demo data purge.

The Interactive Demo Platform acts as an orchestrator client of LeadBoard.

⸻

3. Architecture Boundary

Interactive Demo Platform
        ↓
Experience Engine
        ↓
LeadBoard API
        ↓
LeadBoard Application

LeadBoard must remain unaware of the marketing journey.

LeadBoard should only know:

* A valid temporary experience session exists.
* A call belongs to that session.
* A temporary lead belongs to that session.
* A restricted viewer may access that lead.
* Temporary data must be purged when the session expires.

⸻

4. Experience Engine

The internal engine should use generic naming where possible.

User-facing product name:

Interactive Demo

Internal architecture:

Experience Engine
Experience Session
Experience Version
Restricted Lead View

This allows future reuse for:

* Sales demos.
* Conference demos.
* Training experiences.
* Feature showcases.
* Future industry demos.

⸻

5. Prospect and Eligibility

A prospect may complete one successful demo per:

prospect + experience_version + industry_edition

A completed demo means:

* Call completed.
* Lead created.
* Lead page displayed.
* Demo marked completed.

Failed or expired sessions do not count as completed demos.

If a prospect has already completed the current demo version, the next step is to book a Discovery Session.

⸻

6. Industry Routing

The demo form first asks which industry best describes the business.

Supported now:

Plumbing

Unsupported industries may still continue to the demo, but see a notice:

LeadBoard is currently optimized for plumbing businesses.
You are welcome to try the interactive demo to see how the platform works.
The demo uses a plumbing scenario, but it demonstrates the same AI call handling,
transcript, lead creation, and automation workflow that could power future
industry editions.

Industry selection is stored for roadmap analytics.

⸻

7. LeadBoard Integration

LeadBoard will expose a demo-safe integration layer.

Required capabilities:

* Shared demo organization or resource owner.
* Temporary experience session mirror.
* Demo-scoped JWT.
* Restricted Lead View.
* SSE event stream.
* Temporary lead ownership.
* Cleanup/purge endpoint.
* Strict read-only access control.

The demo must not expose the full LeadBoard application shell.

⸻

8. Restricted Lead View

Prospects should see a restricted product view, not the full operator workspace.

Included:

* Lead header.
* Extracted customer details.
* Transcript.
* AI summary.
* Timeline.
* Live processing status.

Excluded:

* Navigation.
* Settings.
* Scheduling.
* User management.
* Outbound communication actions.
* Lead deletion.
* Internal admin actions.
* Other leads.

⸻

9. Temporary Data Lifecycle

Demo data is temporary.

Temporary data includes:

* Lead.
* Transcript.
* Summary.
* Timeline.
* Call artifacts.
* Experience Session runtime state.

When the session expires or is purged, temporary LeadBoard data is hard-deleted.

LeadBoard may retain high-level audit or analytics records without transcript text or detailed PII, according to retention policy.

⸻

10. Live Updates

The demo shall use Server-Sent Events.

LeadBoard emits business-level events such as:

call_received
call_completed
transcript_ready
lead_details_extracted
summary_ready
lead_ready

The demo page updates live while the prospect watches the restricted lead view populate.

The demo should visualize business milestones, not backend implementation events.

⸻

11. Security Philosophy

The demo should optimize for conversion while using adaptive abuse protection.

Genuine prospects should not experience additional friction.

Security layers include:

* Qualification form.
* Honeypot fields.
* Rate limiting.
* Phone number matching.
* One completed demo per prospect/version.
* Maximum call duration.
* Adaptive challenge for suspicious traffic.
* Temporary session expiry.
* Automatic cleanup.

⸻

12. Booking Boundary

After a successful demo, the prospect is guided toward a Discovery Session.

The Interactive Demo Platform owns booking.

LeadBoard does not own:

* Booking UI.
* Sales funnel.
* Discovery Session copy.
* Calendar selection.
* Conversion messaging.

⸻

13. Operations Boundary

The Interactive Demo Platform owns the Operations Center.

Operations Center includes:

* Action Center.
* Live Operations.
* Session History.
* Health overview.

LeadBoard exposes technical status and events but does not own marketing operations.

⸻

14. Consequences

Benefits

* LeadBoard remains focused on production product logic.
* Demo platform can evolve independently.
* Real product functionality is reused.
* Demo data remains temporary.
* Future industries can be validated before being built.
* Analytics support roadmap and sales decisions.
* Marketing logic does not pollute LeadBoard.

Trade-offs

* Requires a demo-safe LeadBoard integration layer.
* Requires restricted token and route handling.
* Requires temporary data cleanup.
* Requires event streaming for the live experience.
* Requires careful access control around shared demo infrastructure.

⸻

15. Non-Decisions

This ADR does not define:

* Exact database schema.
* API payloads.
* UI wireframes.
* Calendar provider.
* Retention durations.
* Full abuse scoring algorithm.

Those belong in the Technical Design Specification.

⸻

16. Final Decision

LeadBoard will build the Interactive Demo as a separate platform powered by an internal Experience Engine.

The Interactive Demo Platform owns the prospect journey and conversion experience.

LeadBoard acts as the real product engine and exposes only restricted, temporary, demo-safe capabilities.
