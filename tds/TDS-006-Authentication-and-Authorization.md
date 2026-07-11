Technical Design Specification (TDS-006)

Experience Platform

Authentication & Authorization

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

⸻

1. Purpose

This specification defines how authentication and authorization are implemented across the Experience Platform.

The primary design goal is:

Prospects must experience the product without creating an account while maintaining complete isolation between Experience Sessions.

⸻

2. Design Principles

The authentication model follows these principles.

Principle 1

Prospects are not users.

They are participants in an Experience Session.

⸻

Principle 2

Authentication is temporary.

Authorization expires automatically.

⸻

Principle 3

Permissions are granted to an Experience Session.

Not to a browser.

Not to an email address.

Not to a LeadBoard account.

⸻

Principle 4

LeadBoard continues to use its existing authentication model.

Experience authentication is an additional authentication type.

It does not replace production authentication.

⸻

3. Authentication Types

The platform supports four authentication categories.

⸻

Type 1

Production User

Purpose

LeadBoard employees and customers.

Authentication

Existing LeadBoard JWT.

Access

Production functionality.

⸻

Type 2

Operations User

Purpose

Internal administrators.

Authentication

Internal authentication.

Access

Operations Center.

Experience Platform.

⸻

Type 3

Experience Session

Purpose

Prospects.

Authentication

Temporary Experience Token.

Access

Restricted Lead View.

Experience APIs.

⸻

Type 4

Service Authentication

Purpose

Internal service communication.

Authentication

Machine credentials.

Access

Internal APIs only.

⸻

4. Authentication Flow

Prospect
↓
Qualification
↓
Experience Session Created
↓
Temporary Token Issued
↓
Call Completed
↓
Restricted Lead View
↓
Token Expires
↓
Session Purged

⸻

5. Experience Token

Experience Tokens replace traditional user authentication.

Purpose

Authorize a temporary demonstration.

The token represents:

* One Prospect
* One Experience Session
* One Experience Definition

The token never represents a LeadBoard user.

⸻

6. Token Claims

Required claims

token_type
experience_session_id
experience_definition_id
prospect_id
leadboard_demo_session_id
leadboard_lead_id
issued_at
expires_at
permissions

Optional claims

industry
experience_version
demo_language
risk_level

⸻

7. Permission Model

Permissions are capability-based.

Examples

experience:view
experience:recover
lead:view
lead:timeline:view
lead:summary:view
lead:transcript:view
discovery:book

The following permissions shall never be granted to Experience Tokens.

lead:update
lead:delete
lead:list
settings:*
users:*
admin:*

⸻

8. Authorization Rules

Experience Tokens may only access:

* Their own Experience Session.
* Their own temporary Lead.
* Their own Discovery flow.

All requests shall validate ownership before processing.

Cross-session access is prohibited.

⸻

9. LeadBoard Authorization

LeadBoard shall recognize two JWT categories.

Production JWT

Current behaviour.

Experience JWT

Restricted behaviour.

Experience JWTs shall automatically activate restricted middleware.

⸻

10. Restricted Middleware

When an Experience JWT is detected the middleware shall:

Validate:

* Token signature.
* Expiration.
* Session state.
* Session ownership.
* Lead ownership.

Reject:

* Production routes.
* List endpoints.
* Administrative endpoints.
* Mutations.

⸻

11. Session Validation

Each request shall verify:

Experience Session exists.

Session active.

Session not expired.

Session not purged.

Lead belongs to session.

Failure shall immediately terminate authorization.

⸻

12. Internal Authentication

Internal APIs shall never accept Experience Tokens.

Internal services shall authenticate using machine credentials.

Examples

Experience Engine
↓
LeadBoard
Experience Engine
↓
Analytics
Experience Engine
↓
Operations

⸻

13. Browser Authentication

The browser shall never receive:

LeadBoard service credentials.

Machine credentials.

Internal API credentials.

The browser communicates only with the Demo API (BFF).

⸻

14. Token Lifetime

Experience Tokens shall be short-lived.

Expiration shall align with:

Experience Session lifecycle.

Recovery window.

Cleanup lifecycle.

Expired tokens shall never be renewed.

A new Experience Session creates a new token.

⸻

15. Session Recovery

Recovery does not extend authorization indefinitely.

If recovery succeeds:

Issue a new temporary Experience Token.

Invalidate the previous token.

⸻

16. Discovery Session

Booking a Discovery Session does not grant additional permissions.

Discovery booking is a business action.

Not an authorization event.

⸻

17. Service-to-Service Authentication

Internal communication shall use:

Mutual trust.

Short-lived service credentials.

Credential rotation.

No browser involvement.

⸻

18. Security Events

The following events shall be recorded.

Authentication succeeded.

Authentication failed.

Authorization denied.

Session expired.

Token expired.

Recovery completed.

Abuse challenge required.

Blocked request.

⸻

19. Audit

Every protected request shall record:

request_id
experience_session_id
prospect_id
ip_address
timestamp
endpoint
authorization_result

⸻

20. Success Criteria

Authentication is considered complete when:

* Prospects never require accounts.
* Experience Sessions remain isolated.
* LeadBoard production security remains unchanged.
* Internal APIs remain inaccessible from browsers.
* Tokens expire automatically.
* Authorization follows the principle of least privilege.