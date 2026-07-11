export const PACKAGE_NAME = '@experience-platform/event-contracts' as const;

import type { DomainEventEnvelope } from './experience-session-events.js';

export interface EventPublisher {
  publish(event: DomainEventEnvelope): Promise<void>;
}

export {
  buildPresentationEvent,
  buildRestrictedLeadViewUrl,
  isInternalEventName,
  isPresentationSafeEventName,
  mapDomainEventToPresentationEvents,
  PRESENTATION_SAFE_EVENT_NAMES,
} from './presentation-events.js';
export type { PresentationEvent, PresentationEventName } from './presentation-events.js';
export type { DomainEventEnvelope } from './experience-session-events.js';
export {
  buildDomainEventId,
  buildTransitionKey,
  RECOVERY_COMPLETED_EVENT,
  RECOVERY_TRANSITION_EVENT,
  resolveTransitionEventName,
  SUPPORTED_EXPERIENCE_SESSION_TRANSITION_EVENTS,
} from './experience-session-events.js';
