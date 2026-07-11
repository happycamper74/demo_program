import { describe, expect, it } from 'vitest';
import {
  isInternalEventName,
  isPresentationSafeEventName,
  mapDomainEventToPresentationEvents,
} from '../src/presentation-events.js';

describe('presentation event mapping', () => {
  it('maps leadboard domain events to business-friendly presentation events', () => {
    const events = mapDomainEventToPresentationEvents({
      eventId: 'evt_1',
      eventName: 'leadboard.transcript_ready',
      eventVersion: 1,
      occurredAt: '2026-07-09T10:00:00Z',
      experienceSessionId: 'expsess_1',
      experienceDefinitionId: 'expdef_1',
      prospectId: 'prospect_1',
      payload: {},
    });

    expect(events.map((event) => event.event)).toEqual(['call_completed', 'transcript_ready']);
  });

  it('maps processing milestones through to lead ready', () => {
    const leadReady = mapDomainEventToPresentationEvents({
      eventId: 'evt_2',
      eventName: 'leadboard.processing_completed',
      eventVersion: 1,
      occurredAt: '2026-07-09T10:05:00Z',
      experienceSessionId: 'expsess_1',
      experienceDefinitionId: 'expdef_1',
      prospectId: 'prospect_1',
      payload: {},
    });

    expect(leadReady[0]?.event).toBe('lead_ready');
    expect(leadReady[0]?.data.restricted_lead_view_url).toBe('/demo/view/expsess_1');
  });

  it('does not expose internal event names as presentation-safe events', () => {
    expect(isInternalEventName('leadboard.call_received')).toBe(true);
    expect(isInternalEventName('experience.call_started')).toBe(true);
    expect(isPresentationSafeEventName('call_started')).toBe(true);
    expect(isPresentationSafeEventName('leadboard.call_received')).toBe(false);
  });
});
