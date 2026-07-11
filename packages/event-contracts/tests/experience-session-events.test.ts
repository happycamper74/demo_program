import { describe, expect, it } from 'vitest';
import {
  RECOVERY_TRANSITION_EVENT,
  SUPPORTED_EXPERIENCE_SESSION_TRANSITION_EVENTS,
  resolveTransitionEventName,
} from '../src/experience-session-events.js';

describe('experience session event contracts', () => {
  it('maps supported transitions to TDS-007 event names', () => {
    expect(SUPPORTED_EXPERIENCE_SESSION_TRANSITION_EVENTS['WaitingForCall:CallActive']).toBe(
      'experience.call_started',
    );
    expect(SUPPORTED_EXPERIENCE_SESSION_TRANSITION_EVENTS['Completed:Purged']).toBe(
      'experience.purged',
    );
  });

  it('maps recovery transitions to experience.recovery_started', () => {
    expect(
      resolveTransitionEventName('Processing', 'Recovery', (state) => state === 'Processing'),
    ).toBe(RECOVERY_TRANSITION_EVENT);
  });

  it('rejects unmapped transitions', () => {
    expect(() =>
      resolveTransitionEventName('Purged', 'Completed', () => false),
    ).toThrowError(/No event mapping/);
  });
});
