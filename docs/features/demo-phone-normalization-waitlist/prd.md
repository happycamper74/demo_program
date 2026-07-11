Product Requirements Document

Feature: Country-Aware Demo Qualification & Phone Normalization

Repository: demo_program

Branch: feature/demo-phone-normalization-waitlist

⸻

1. Summary

Improve the demo qualification flow by introducing explicit business market selection, deterministic phone normalization for supported markets, and a waitlist flow for unsupported markets.

The goal is to ensure that LeadBoard only ever receives valid E.164 phone numbers while allowing prospects from unsupported countries to register their interest without attempting to start an interactive demo.

No changes are made to LeadBoard, Twilio, or Retell.

⸻

2. Problem Statement

Today the Demo Program forwards the raw phone number entered by the user directly to LeadBoard.

Example:

0646275553

is sent as

0646275553

LeadBoard expects

+31646275553

This causes:

* incorrect phone normalization
* failed Twilio caller binding
* demo sessions remaining in waiting_for_call
* unnecessary normalization logic inside LeadBoard

The Demo Program should become responsible for producing valid E.164 numbers before LeadBoard receives them.

⸻

3. Goals

* Support deterministic phone normalization for NL and US.
* Ensure LeadBoard receives only E.164.
* Keep LeadBoard unchanged.
* Introduce unsupported-market waitlist.
* Collect market demand.
* Keep implementation isolated to demo_program.

⸻

4. Non-goals

This feature does not include:

* Google Places
* automatic country detection
* IP geolocation
* global phone normalization
* LeadBoard changes
* Twilio changes
* Retell changes
* CRM integration

⸻

5. Supported Markets

Supported

* Netherlands
* United States

These markets receive the complete interactive demo.

⸻

Unsupported

All other countries.

These users complete qualification but are added to the waitlist instead of starting a demo.

⸻

6. Qualification Flow

The qualification form begins with:

Business Market
○ Netherlands
○ United States
──────────────
○ Another Country

⸻

If Netherlands selected

Display

Phone Number *

Required.

⸻

If United States selected

Display

Phone Number *

Required.

⸻

If Another Country selected

Display

Country *
_____________

Phone number is not shown.

⸻

7. Phone Normalization

Applies only to:

* Netherlands
* United States

⸻

Netherlands

Examples

Input

0646275553

Normalized

+31646275553

Displayed

+31 6 4627 5553

⸻

United States

Input

(415) 555-2671

Normalized

+14155552671

Displayed

+1 (415) 555-2671

⸻

Invalid numbers

Submission is blocked.

Inline validation message displayed.

⸻

8. Normalization Rules

Normalization occurs twice.

Frontend

On phone field blur.

Purpose:

* immediate feedback
* formatting
* validation

⸻

Backend

Before calling LeadBoard.

Backend is authoritative.

Frontend validation cannot be trusted.

⸻

9. Shared Normalization Package

Create a new shared package:

packages/phone-normalization

Expose:

normalizeDemoPhone(
    rawPhone,
    market
)

Returns:

{
    valid: boolean,
    e164: string,
    display: string,
    error?: string
}

Use:

libphonenumber-js

Both

* demo-web
* demo-api-bff

must use the same implementation.

⸻

10. Demo Start

Supported markets continue unchanged except for normalized phone.

Flow:

Qualification
↓
Normalize Phone
↓
Validate
↓
Create Prospect
↓
Create Experience Session
↓
Call LeadBoard
↓
Instructions Page
↓
Live Demo

⸻

11. Waitlist Flow

Unsupported markets complete the same qualification.

Instead of

Start Interactive Demo

the final CTA becomes

Join Waitlist

⸻

Waitlist Submission

Creates

waitlist_entry

No demo session.

No LeadBoard request.

No Twilio routing.

No polling.

No Retell.

⸻

12. Waitlist Confirmation

Show:

Thank you.

LeadBoard’s interactive demo is currently available only in the Netherlands and the United States.

We’ve added your business to our priority waitlist and we’ll notify you as soon as your market becomes available.

⸻

13. Waitlist Schema

id
created_at
full_name
business_name
email
country_name
industry
company_size
website
biggest_challenge
implementation_timeframe
status

Phone number omitted.

Status default:

waiting

⸻

14. Duplicate Waitlist Handling

Uniqueness:

email

Comparison:

* lowercase
* trimmed

Duplicate submission:

No new record.

Show:

You’re already on our waitlist.

We’ll notify you as soon as the interactive demo becomes available in your market.

⸻

15. API Changes

Current

status = started

Becomes

started

or

waitlisted

⸻

Started

Current response remains unchanged.

⸻

Waitlisted

{
    status: "waitlisted",
    country: "...",
    message: "..."
}

No

* experience token
* session id
* Twilio number

⸻

16. Backend Changes

Modify

DemoService.startDemo()

After

validateStartDemoRequest()

After

DemoStartGuard.evaluate()

Branch

Supported Market?
        YES
         ↓
 Normalize Phone
         ↓
 Existing Flow
        NO
         ↓
 Create Waitlist
         ↓
 Return waitlisted

⸻

17. UI Changes

Add:

Business Market selector.

Conditional Country field.

Conditional Phone field.

Phone normalization on blur.

Waitlist confirmation page.

⸻

18. Database Changes

Migration:

create_waitlist_entries.sql

New table:

waitlist_entries

No changes to existing LeadBoard schema.

⸻

19. Acceptance Criteria

AC-1

Business Market selector exists.

⸻

AC-2

Phone shown only for NL and US.

⸻

AC-3

Country required for Another Country.

⸻

AC-4

Phone normalized on blur.

⸻

AC-5

Input replaced with canonical formatted value.

⸻

AC-6

Backend re-validates phone.

⸻

AC-7

Only E.164 sent to LeadBoard.

⸻

AC-8

Invalid phones rejected.

⸻

AC-9

Another Country creates waitlist.

⸻

AC-10

Another Country never calls LeadBoard.

⸻

AC-11

Another Country never creates demo session.

⸻

AC-12

Another Country never allocates Twilio number.

⸻

AC-13

Another Country displays waitlist confirmation.

⸻

AC-14

Duplicate email creates no new waitlist record.

⸻

AC-15

Existing duplicate displays:

You’re already on our waitlist.

⸻

AC-16

Existing NL/US demo flow continues unchanged except phone normalization.

⸻

20. Test Matrix

Scenario	Expected
NL local number	E.164 +31
US local number	E.164 +1
Invalid NL	validation error
Invalid US	validation error
NL valid	demo starts
US valid	demo starts
Another Country	waitlist created
Another Country	no LeadBoard call
Another Country	no demo session
Another Country	no Twilio
Duplicate email	no new row
Existing demo flow	unchanged
Existing LeadBoard integration	unchanged
Existing polling	unchanged

⸻

21. Definition of Done

The feature is complete when:

* Business Market selector is implemented.
* NL and US phone numbers are normalized to E.164.
* Normalization occurs in a shared package used by both frontend and backend.
* LeadBoard receives only E.164 numbers.
* Unsupported markets complete qualification without providing a phone number.
* Unsupported markets create local waitlist records.
* Duplicate waitlist emails are handled gracefully.
* Waitlist confirmation page is implemented.
* No changes are required in LeadBoard, Twilio, or Retell.
* All automated tests pass.
* Typecheck, lint, and existing regression suites pass without failures.

This PRD keeps the implementation intentionally focused on demo_program, solves the phone normalization issue at the correct boundary, and introduces a simple waitlist mechanism for unsupported markets without impacting the existing LeadBoard or telephony infrastructure.