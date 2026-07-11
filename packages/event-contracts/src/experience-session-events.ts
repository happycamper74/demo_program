import { randomUUID } from 'node:crypto';
import type { ExperienceSessionState } from '@experience-platform/shared-types';

export interface DomainEventEnvelope {
  readonly eventId: string;
  readonly eventName: string;
  readonly eventVersion: number;
  readonly occurredAt: string;
  readonly experienceSessionId: string;
  readonly experienceDefinitionId: string;
  readonly prospectId: string;
  readonly payload: Record<string, unknown>;
}

export const SUPPORTED_EXPERIENCE_SESSION_TRANSITION_EVENTS = {
  'WaitingForCall:CallActive': 'experience.call_started',
  'WaitingForCall:Expired': 'experience.expired',
  'CallActive:Processing': 'experience.processing_started',
  'CallActive:CallFailed': 'operations.processing_failed',
  'Processing:LeadReady': 'experience.lead_ready',
  'Processing:TechnicalFailure': 'operations.processing_failed',
  'LeadReady:Discovery': 'experience.discovery_started',
  'LeadReady:Completed': 'experience.completed',
  'Discovery:Completed': 'experience.completed',
  'Completed:Purged': 'experience.purged',
} as const satisfies Record<string, string>;

export const RECOVERY_TRANSITION_EVENT = 'experience.recovery_started';
export const RECOVERY_COMPLETED_EVENT = 'experience.recovery_completed';

export function buildTransitionKey(
  fromState: ExperienceSessionState,
  toState: ExperienceSessionState,
): string {
  return `${fromState}:${toState}`;
}

export function resolveTransitionEventName(
  fromState: ExperienceSessionState,
  toState: ExperienceSessionState,
  isActiveState: (state: ExperienceSessionState) => boolean,
): string {
  if (toState === 'Recovery' && isActiveState(fromState) && fromState !== 'Recovery') {
    return RECOVERY_TRANSITION_EVENT;
  }

  const transitionKey = buildTransitionKey(fromState, toState);
  const eventName =
    SUPPORTED_EXPERIENCE_SESSION_TRANSITION_EVENTS[
      transitionKey as keyof typeof SUPPORTED_EXPERIENCE_SESSION_TRANSITION_EVENTS
    ];

  if (!eventName) {
    throw new Error(`No event mapping for transition ${transitionKey}`);
  }

  return eventName;
}

export function buildDomainEventId(): string {
  return `evt_${randomUUID()}`;
}
