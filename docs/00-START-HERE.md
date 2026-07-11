LeadBoard Experience Platform

Start Here

Welcome to the LeadBoard Experience Platform documentation.

This documentation is the single source of truth for the Interactive Demo Platform and future Experience Platform implementations.

The goal of these documents is to ensure that every developer, AI coding assistant, designer, tester, and architect builds the same product without making assumptions.

⸻

Documentation Structure

The documentation is divided into four layers.

Layer 1 — Architecture

Defines why the platform is built this way.

Documents:

* ADR-001 – Interactive Demo Platform Architecture

Read this first to understand architectural decisions.

⸻

Layer 2 — Product Requirements

Defines what the product must do.

Documents:

* PRD-001 Part 1 – Product Definition
* PRD-001 Part 2 – Functional Requirements
* PRD-001 Part 3 – Quality Requirements
* PRD-001 Part 4 – Delivery Contract

These documents define business behaviour.

If behaviour is not documented here, it should not be implemented.

⸻

Layer 3 — Technical Design

Defines how the product is implemented.

Documents:

* TDS-001 System Architecture
* TDS-002 Data Model
* TDS-003 API Specification
* TDS-004 State Machines
* TDS-005 Database Schema
* TDS-006 Authentication & Authorization
* TDS-007 Event Catalog
* TDS-008 Operations & Monitoring
* TDS-009 Deployment Architecture
* TDS-010 Validation Strategy
* TDS-011 Implementation Roadmap

These documents are the engineering blueprint.

⸻

Layer 4 — Implementation

Implementation documents translate specifications into development work.

Documents:

* IMPLEMENTATION-BACKLOG.md
* CODING-STANDARDS.md

⸻

Reading Order

If you are new to the project, read the documents in this order:

1. This document
2. ADR-001
3. PRD-001 (all parts)
4. TDS-001 through TDS-011
5. IMPLEMENTATION-BACKLOG
6. CODING-STANDARDS

⸻

Platform Overview

The Experience Platform is responsible for creating guided product experiences.

Current experience:

* Interactive Demo

Future experiences:

* Sales Walkthrough
* Customer Training
* Conference Experience
* Product Showcase
* Industry-Specific Demonstrations

LeadBoard remains the product platform.

The Experience Platform orchestrates experiences.

⸻

Core Architectural Principles

The platform follows these principles.

* Single Responsibility
* Separation of Concerns
* Event-Driven Architecture
* Resume Instead of Restart
* Temporary Experience Data
* Permanent Prospect Data
* Configuration Over Hardcoding
* API-First Design
* Stateless Services
* Observable Systems

⸻

Repository Overview

Recommended structure:

experience-platform/
apps/
services/
packages/
docs/
scripts/
infrastructure/

⸻

Development Workflow

Every feature follows this lifecycle.

Business Requirement

↓

Technical Design

↓

Implementation Story

↓

Development

↓

Validation

↓

Review

↓

Production

⸻

AI Development Rules

Cursor should never invent functionality.

Cursor should always:

* Read the relevant PRD requirements.
* Read the relevant TDS sections.
* Implement only documented behaviour.
* Preserve architectural boundaries.
* Update documentation when behaviour changes.

⸻

Definition of Success

The Experience Platform succeeds when:

* Product behaviour matches the PRD.
* Architecture matches the ADR.
* Implementation matches the TDS.
* Every feature is observable.
* Every workflow is testable.
* Future experiences reuse the existing platform.