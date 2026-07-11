import type { DemoProcessingState } from '@experience-platform/leadboard-client';
import {
  buildPresentationEvent,
  buildRestrictedLeadViewUrl,
} from '../domain/session-presentation.js';
import type { PresentationEvent } from '../types/api.js';

export const PROCESSING_STATE_ORDER: readonly DemoProcessingState[] = [
  'waiting_for_call',
  'call_received',
  'transcript_stored',
  'lead_created',
  'summary_ready',
  'lead_ready',
  'purged',
];

export function compareProcessingStates(
  left: DemoProcessingState,
  right: DemoProcessingState,
): number {
  return PROCESSING_STATE_ORDER.indexOf(left) - PROCESSING_STATE_ORDER.indexOf(right);
}

export function isTerminalProcessingState(state: DemoProcessingState): boolean {
  return state === 'purged';
}

export function presentationEventsForProcessingState(
  state: DemoProcessingState,
  experienceSessionId: string,
  timestamp: string,
): PresentationEvent[] {
  switch (state) {
    case 'waiting_for_call':
      return [
        buildPresentationEvent(
          'waiting_for_call',
          experienceSessionId,
          'Waiting for your call',
          timestamp,
        ),
      ];
    case 'call_received':
      return [
        buildPresentationEvent('call_started', experienceSessionId, 'Call received', timestamp),
      ];
    case 'transcript_stored':
      return [
        buildPresentationEvent('call_completed', experienceSessionId, 'Call completed', timestamp),
        buildPresentationEvent(
          'processing_started',
          experienceSessionId,
          'Processing your call',
          timestamp,
        ),
        buildPresentationEvent(
          'transcript_ready',
          experienceSessionId,
          'Conversation understood',
          timestamp,
        ),
      ];
    case 'lead_created':
      return [
        buildPresentationEvent(
          'customer_details_ready',
          experienceSessionId,
          'Customer details extracted',
          timestamp,
        ),
      ];
    case 'summary_ready':
      return [
        buildPresentationEvent('summary_ready', experienceSessionId, 'Summary ready', timestamp),
      ];
    case 'lead_ready':
      return [
        buildPresentationEvent(
          'lead_ready',
          experienceSessionId,
          'Lead ready',
          timestamp,
          buildRestrictedLeadViewUrl(experienceSessionId),
        ),
      ];
    case 'purged':
      return [
        buildPresentationEvent('cleanup_started', experienceSessionId, 'Cleanup started', timestamp),
      ];
    default:
      return [];
  }
}

export function collectPresentationEventsForAdvance(
  fromState: DemoProcessingState,
  toState: DemoProcessingState,
  experienceSessionId: string,
  timestamp: string,
): PresentationEvent[] {
  if (compareProcessingStates(toState, fromState) <= 0) {
    return [];
  }

  const fromIndex = PROCESSING_STATE_ORDER.indexOf(fromState);
  const toIndex = PROCESSING_STATE_ORDER.indexOf(toState);
  const events: PresentationEvent[] = [];

  for (let index = fromIndex + 1; index <= toIndex; index += 1) {
    const state = PROCESSING_STATE_ORDER[index];
    if (!state) {
      continue;
    }

    events.push(...presentationEventsForProcessingState(state, experienceSessionId, timestamp));
  }

  return events;
}
