Product Requirements Document (PRD-001)

Part 2 – Functional Requirements & Business Rules

⸻

16. Functional Requirements

FR-1 Landing Page

FR-1.1

The system shall present an Interactive Demo landing page explaining the purpose and expected outcome of the demonstration.

FR-1.2

The landing page shall communicate that the demo uses the real LeadBoard processing pipeline.

FR-1.3

The landing page shall explain that the demonstration normally takes approximately two to three minutes.

⸻

FR-2 Industry Selection

FR-2.1

The system shall require every prospect to select their business industry before continuing.

FR-2.2

The selected industry shall be stored as Prospect data.

FR-2.3

If the selected industry is currently unsupported, the system shall:

* Inform the prospect that the demonstration currently uses a plumbing scenario.
* Explain that the underlying LeadBoard workflow is representative of future industry editions.
* Allow the prospect to continue.

⸻

FR-3 Prospect Qualification

FR-3.1

The system shall require:

* Full Name
* Business Name
* Email Address
* Phone Number

before creating an Experience Session.

FR-3.2

Interactive Demo qualification shall additionally collect:

* Business Location
* Company Size
* Website or “No Website”
* Biggest Business Challenge
* Planned Implementation Timeframe

FR-3.3

Qualification information shall be permanently stored as Prospect data.

FR-3.4

Qualification information shall not be deleted when temporary demo data is purged.

⸻

FR-4 Experience Session

FR-4.1

Submitting the qualification form shall create a temporary Experience Session.

FR-4.2

Each Experience Session shall have a unique identifier.

FR-4.3

The Experience Session shall enter the state:

Waiting For Call.

FR-4.4

The prospect shall receive the shared demo phone number.

FR-4.5

The Experience Session shall expire if no call is received within fifteen minutes.

⸻

FR-5 Phone Matching

FR-5.1

Incoming calls shall be matched using the phone number entered during qualification.

FR-5.2

If the caller phone number does not match the qualified phone number:

* No demo shall start.
* No temporary lead shall be shown.

FR-5.3

The prospect shall receive a message instructing them to return to the demo page and call using the registered phone number.

⸻

FR-6 AI Demonstration

FR-6.1

The AI Assistant shall conduct a realistic plumbing business conversation.

FR-6.2

The AI conversation shall collect sufficient information to demonstrate LeadBoard capabilities.

FR-6.3

The AI conversation shall naturally conclude after the required information has been collected.

FR-6.4

Maximum call duration shall be limited by business rules.

⸻

FR-7 Lead Creation

FR-7.1

LeadBoard shall create a temporary Lead using the standard production processing pipeline.

FR-7.2

The temporary Lead shall contain all information normally produced by LeadBoard.

FR-7.3

The temporary Lead shall remain isolated from production customer data.

⸻

FR-8 Restricted Lead View

FR-8.1

The prospect shall automatically be presented with the restricted Lead View after processing completes.

FR-8.2

The restricted Lead View shall display:

* Lead Header
* Customer Details
* AI Summary
* Transcript
* Timeline
* Call Information
* Processing Progress

FR-8.3

The restricted Lead View shall not expose:

* Navigation
* Settings
* User Management
* Lead Lists
* Other Customer Data
* Administrative Functions

⸻

FR-9 Live Processing

FR-9.1

The restricted Lead View shall update while LeadBoard completes processing.

FR-9.2

Updates shall occur using Server-Sent Events.

FR-9.3

Progress shall represent business milestones rather than technical implementation details.

Examples include:

* Call Received
* Transcript Ready
* Lead Details Extracted
* Summary Ready
* Lead Ready

⸻

FR-10 Discovery Session

FR-10.1

Following successful completion the system shall invite the prospect to book a Discovery Session.

FR-10.2

Discovery Session booking shall occur within the Interactive Demo Platform.

FR-10.3

LeadBoard shall not own Discovery Session booking workflows.

⸻

17. Business Rules

⸻

BR-1 Demo Eligibility

Each prospect may complete one Interactive Demo per:

* Experience Version
* Industry Edition

⸻

BR-2 Failed Demonstrations

The first failed demonstration shall allow one automatic retry.

A second failed demonstration shall direct the prospect toward a Discovery Session.

⸻

BR-3 Completed Demonstrations

A demonstration is completed only when:

* Call completed.
* Lead successfully created.
* Restricted Lead View displayed.

⸻

BR-4 Session Expiry

Waiting For Call sessions shall expire after fifteen minutes.

⸻

BR-5 Recovery

Loss of the active demo connection shall trigger Recovery Mode.

Recovery duration:

Five minutes.

⸻

BR-6 Temporary Data

Temporary demo data shall be hard deleted after session completion and expiry according to the defined cleanup lifecycle.

⸻

BR-7 Prospect Data

Prospect qualification information shall remain permanently available for Sales and Marketing.

⸻

BR-8 Discovery Session

Booking or completing a Discovery Session ends eligibility for repeating the same Interactive Demo experience version.

⸻

BR-9 Future Demo Versions

Completion of one demo version shall not prevent participation in future demo versions.

⸻

BR-10 Future Industries

Completion of the plumbing demonstration shall not prevent participation in future industry demonstrations.

⸻

BR-11 Shared Infrastructure

Interactive demonstrations shall operate using shared infrastructure while maintaining complete logical isolation between Experience Sessions.

⸻

BR-12 Adaptive Security

The platform shall prioritize conversion over intrusive verification.

Security responses shall scale according to observed risk.

⸻

18. Functional Completion

The Functional Requirements are considered complete when:

* Every prospect journey is fully defined.
* Every business rule is testable.
* No engineer is required to invent product behaviour.
* Every temporary resource has a defined lifecycle.
* Every permanent resource has a defined owner.