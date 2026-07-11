import { describe, expect, it } from 'vitest';
import {
  collectPresentationEventsForAdvance,
  compareProcessingStates,
  presentationEventsForProcessingState,
} from '../src/application/processing-state-presentation.js';

describe('processing-state-presentation', () => {
  const sessionId = 'expsess_test_123';
  const timestamp = '2026-07-09T12:00:00.000Z';

  it('maps call_received to call_started', () => {
    const events = presentationEventsForProcessingState('call_received', sessionId, timestamp);
    expect(events.map((event) => event.event)).toEqual(['call_started']);
  });

  it('maps transcript_stored to call_completed, processing_started, and transcript_ready', () => {
    const events = presentationEventsForProcessingState('transcript_stored', sessionId, timestamp);
    expect(events.map((event) => event.event)).toEqual([
      'call_completed',
      'processing_started',
      'transcript_ready',
    ]);
  });

  it('maps lead_ready with restricted lead view url', () => {
    const events = presentationEventsForProcessingState('lead_ready', sessionId, timestamp);
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe('lead_ready');
    expect(events[0]?.data.restricted_lead_view_url).toBe(`/demo/view/${sessionId}`);
  });

  it('emits only new presentation events when advancing processing state', () => {
    const events = collectPresentationEventsForAdvance(
      'waiting_for_call',
      'transcript_stored',
      sessionId,
      timestamp,
    );

    expect(events.map((event) => event.event)).toEqual([
      'call_started',
      'call_completed',
      'processing_started',
      'transcript_ready',
    ]);
    expect(events.some((event) => event.event.startsWith('leadboard.'))).toBe(false);
  });

  it('does not duplicate events when processing state is unchanged', () => {
    const events = collectPresentationEventsForAdvance(
      'summary_ready',
      'summary_ready',
      sessionId,
      timestamp,
    );

    expect(events).toEqual([]);
    expect(compareProcessingStates('summary_ready', 'summary_ready')).toBe(0);
  });
});
