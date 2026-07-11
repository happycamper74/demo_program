Technical Design Specification (TDS-009)

Experience Platform

Deployment Architecture

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
* TDS-008 – Operations & Monitoring

⸻

1. Purpose

This document defines how the Experience Platform is deployed, hosted, secured, and operated across environments.

The deployment architecture shall support:

* High availability
* Independent service deployment
* Horizontal scalability
* Fault isolation
* Zero-downtime releases
* Secure communication

⸻

2. Deployment Principles

The platform shall follow these principles:

* Stateless application services
* Stateful data services
* Independent deployments
* Infrastructure as Code
* Immutable releases
* Automated rollback
* Environment parity

⸻

3. Environment Strategy

The platform shall maintain separate environments.

Local Development

Purpose

Developer workstations.

Characteristics

* Local services
* Mock providers where appropriate
* Seeded demonstration data

⸻

Development

Purpose

Feature development.

Characteristics

* Shared development environment
* Non-production integrations
* Developer testing

⸻

Staging

Purpose

Production validation.

Characteristics

* Mirrors production architecture
* Uses staging credentials
* End-to-end integration testing

⸻

Production

Purpose

Customer-facing platform.

Characteristics

* High availability
* Monitoring enabled
* Backups enabled
* Disaster recovery enabled

⸻

4. High-Level Deployment

                   Internet
                        │
                        ▼
                Load Balancer
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
   Demo Web Frontend           Demo API (BFF)
                                       │
                                       ▼
                              Workflow Orchestrator
                                       │
             ┌───────────────┬───────────────┬───────────────┐
             ▼               ▼               ▼
     Experience Engine   Analytics     Operations API
             │
             ▼
        LeadBoard API
             │
             ▼
      LeadBoard Backend

⸻

5. Deployable Services

Each service shall be independently deployable.

Services include:

* Demo Website
* Demo API (BFF)
* Workflow Orchestrator
* Experience Engine
* Analytics Service
* Operations Service
* Cleanup Worker
* Notification Worker

LeadBoard remains an independent deployment.

⸻

6. External Dependencies

The platform integrates with:

* Twilio
* Retell AI or Vapi
* LeadBoard
* Calendar Provider
* Email Provider
* SMS Provider

Each dependency shall be isolated behind an adapter layer.

⸻

7. Networking

Browser traffic:

HTTPS only.

Internal service communication:

Encrypted.

Services shall never communicate over public endpoints when private networking is available.

⸻

8. Secrets Management

Secrets shall never be stored in:

* Source code
* Configuration files
* Git repositories
* Container images

Secrets include:

* API keys
* JWT signing keys
* Database credentials
* AI provider credentials
* Twilio credentials
* Calendar credentials

Secrets shall be managed using a secure secret manager.

⸻

9. Database Deployment

The Experience Platform database shall be independent from LeadBoard.

Responsibilities:

Experience Platform Database

* Prospects
* Experience Sessions
* Analytics
* Operations
* Discovery

LeadBoard Database

* Leads
* Calls
* Transcripts
* Summaries
* Timelines

No direct cross-database writes are permitted.

Communication occurs through APIs and events.

⸻

10. Scaling Strategy

Services shall scale independently.

Expected scaling priorities:

Highest

* Demo API (BFF)
* Workflow Orchestrator
* Experience Engine

Medium

* Operations API
* Analytics

Background

* Cleanup Worker
* Notification Worker

⸻

11. Background Workers

Background workers shall process:

* Cleanup
* Analytics aggregation
* Notifications
* Retry processing
* Session expiration
* Health checks

Workers shall be idempotent.

⸻

12. Release Strategy

Production deployments shall support:

* Rolling deployments
* Blue/green deployments (preferred)
* Automatic rollback on failed health checks

Deployments shall not interrupt active Experience Sessions.

⸻

13. Configuration Management

Configuration shall be environment-specific.

Examples:

* API endpoints
* AI provider
* Shared demo phone number
* Feature flags
* Booking provider
* Rate limits

Configuration shall not require recompilation.

⸻

14. Observability

Every service shall expose:

* Health endpoint
* Metrics endpoint
* Structured logs
* Distributed tracing

All services shall include correlation IDs in logs and requests.

⸻

15. Disaster Recovery

The platform shall support:

* Automated backups
* Point-in-time database recovery
* Worker restart
* Service restart
* Replay of pending events where applicable

Temporary Experience Sessions may expire during extended outages, but permanent Prospect data shall not be lost.

⸻

16. Infrastructure Security

Infrastructure shall enforce:

* HTTPS everywhere
* TLS between services
* Network segmentation
* Least-privilege service accounts
* Secret rotation
* Firewall rules
* Audit logging

⸻

17. Capacity Planning

The platform shall be designed to support:

* Multiple concurrent Experience Sessions
* Multiple simultaneous AI calls
* Multiple concurrent SSE connections
* Independent scaling of workers
* Future support for multiple industries and experience types

Capacity limits shall be configurable without code changes.

⸻

18. Deployment Validation

Each deployment shall validate:

* Health endpoints
* Database migrations
* API connectivity
* Event flow
* Authentication
* LeadBoard integration
* External provider connectivity

Failed validation shall automatically trigger rollback.

⸻

19. Production Readiness Checklist

The platform is production-ready when:

* All services are deployable independently.
* Health checks pass.
* Monitoring is operational.
* Secrets are securely managed.
* Backups are verified.
* Rollback has been tested.
* External integrations are validated.
* Documentation is current.

⸻

20. Success Criteria

The deployment architecture is successful when:

* Services can be deployed without downtime.
* Infrastructure failures are isolated.
* Scaling is independent.
* Production remains observable.
* Recovery procedures are tested.
* The platform can evolve without infrastructure redesign.