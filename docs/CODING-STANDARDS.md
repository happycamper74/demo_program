Experience Platform

Coding Standards

Status: Approved

Purpose

This document defines the coding standards for the Experience Platform and all related repositories.

These standards ensure that code written by humans and AI assistants is consistent, maintainable, and aligned with the architecture.

⸻

1. General Principles

All code shall be:

* Readable
* Testable
* Modular
* Observable
* Secure
* Documented

Optimize for clarity over cleverness.

⸻

2. Architectural Rules

Always respect service boundaries.

The Experience Platform orchestrates experiences.

LeadBoard owns CRM functionality.

Never duplicate LeadBoard business logic inside the Experience Platform.

All communication between systems occurs through APIs or domain events.

Never perform direct database access across system boundaries.

⸻

3. Repository Structure

apps/
    demo-web/
    operations-center/
services/
    demo-api-bff/
    workflow-orchestrator/
    experience-engine/
    analytics/
    cleanup-worker/
    notification-worker/
packages/
    auth/
    event-contracts/
    sdk/
    shared-types/
    ui/
docs/
scripts/
infrastructure/

Each application or service shall own its own source code, tests, and configuration.

⸻

4. Folder Structure

Each service should follow the same structure.

src/
    api/
    domain/
    application/
    infrastructure/
    events/
    middleware/
    repositories/
    services/
    workers/
    utils/
tests/

Avoid feature code spread across unrelated folders.

⸻

5. Naming Conventions

Use descriptive names.

Good

ExperienceSession
WorkflowOrchestrator
LeadBoardIntegrationService

Avoid

Manager
Helper
Utils
Misc
Common

Every class should express one responsibility.

⸻

6. File Naming

Use kebab-case for files.

Examples

workflow-orchestrator.ts
experience-session.ts
leadboard-client.ts
booking-service.ts

React components may use PascalCase.

LeadView.tsx
ProgressTimeline.tsx
QualificationForm.tsx

⸻

7. TypeScript

Rules

* Enable strict mode.
* Avoid any.
* Prefer explicit types.
* Prefer interfaces for contracts.
* Use enums only where they model a closed set of values.
* Use readonly properties where appropriate.

All exported APIs shall have explicit return types.

⸻

8. React

Components shall be:

* Small
* Focused
* Composable

Separate:

* Presentation
* State management
* Data fetching

Avoid components longer than approximately 300 lines.

Extract reusable UI elements early.

⸻

9. API Design

Every endpoint shall:

* Validate input.
* Return consistent error responses.
* Use DTOs.
* Never expose internal models directly.
* Be versioned where appropriate.

HTTP methods

* GET for reads
* POST for creation
* PATCH for partial updates
* DELETE only where permanent deletion is intended

⸻

10. State Management

Business state belongs in the backend.

Frontend state should be limited to:

* UI state
* Temporary form state
* Session progress
* Display preferences

Do not duplicate server-side business logic in the client.

⸻

11. Error Handling

Errors shall be:

* Actionable
* Logged
* Correlated
* Safe for users

Never expose:

* Stack traces
* Secrets
* SQL queries
* Internal identifiers

Use structured error objects.

⸻

12. Logging

All logs shall include:

* Timestamp
* Correlation ID
* Experience Session ID (where applicable)
* Severity
* Component
* Event

Never log:

* Access tokens
* Secrets
* Full transcripts
* Sensitive personal information

⸻

13. Event Design

Events represent completed business actions.

Use naming:

experience.created
experience.call_started
leadboard.summary_ready
discovery.booked

Never publish infrastructure events to business consumers.

Events must be immutable.

⸻

14. Database

Repositories are the only layer allowed to access the database.

Business logic must not execute SQL directly.

All database changes shall be performed through migrations.

Never modify production data manually outside approved operational procedures.

⸻

15. Authentication

Use Experience Tokens for prospects.

Use LeadBoard authentication for product users.

Never mix authentication models.

Always validate permissions at the API boundary.

⸻

16. Security

Validate all external input.

Escape output where required.

Rate limit public endpoints.

Use least-privilege access for services.

Rotate secrets regularly.

Never commit credentials to source control.

⸻

17. Testing

Every feature shall include:

* Unit tests
* Integration tests (where applicable)
* End-to-end tests for critical user journeys

Bug fixes should include regression tests.

Tests should validate observable behavior, not implementation details.

⸻

18. Documentation

Public APIs require documentation.

Complex workflows require diagrams or sequence descriptions.

When behavior changes:

* Update the PRD if product behavior changes.
* Update the TDS if technical design changes.
* Update inline code documentation where necessary.

Documentation is part of the implementation.

⸻

19. Pull Requests

Each pull request should:

* Solve one logical problem.
* Reference related backlog stories.
* Include tests.
* Pass CI.
* Update documentation if required.

Avoid mixing unrelated changes.

⸻

20. AI-Assisted Development

When using Cursor or another AI coding assistant:

* Implement one backlog story at a time.
* Do not invent requirements.
* Do not change architecture without updating the ADR.
* Do not introduce new APIs without updating the TDS.
* Prefer modifying existing components over creating duplicates.
* Ask for clarification rather than making assumptions when documentation is ambiguous.

⸻

21. Definition of Done

Code is considered complete only when:

* Requirements are implemented.
* Tests pass.
* Linting passes.
* Type checking passes.
* Documentation is updated.
* Logging is included where appropriate.
* Monitoring hooks are present.
* Security considerations have been reviewed.
* Acceptance criteria are satisfied.

⸻

22. Guiding Principle

The architecture is the source of truth.

The PRD defines behavior.

The TDS defines implementation.

The backlog defines execution.

Code must remain aligned with all three.