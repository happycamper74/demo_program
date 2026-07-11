import type { DomainEventEnvelope } from './experience-session-events.js';

export type PresentationEventName =
  | 'session_started'
  | 'waiting_for_call'
  | 'call_started'
  | 'call_completed'
  | 'processing_started'
  | 'transcript_ready'
  | 'customer_details_ready'
  | 'timeline_ready'
  | 'summary_ready'
  | 'lead_ready'
  | 'discovery_available'
  | 'discovery_booked'
  | 'session_recovered'
  | 'session_expired'
  | 'cleanup_started'
  | 'completed';

export interface PresentationEvent {
  readonly event: PresentationEventName;
  readonly data: {
    readonly experience_session_id: string;
    readonly label: string;
    readonly timestamp: string;
    readonly restricted_lead_view_url?: string;
  };
}

const DOMAIN_EVENT_TO_PRESENTATION: Record<
  string,
  { event: PresentationEventName; label: string } | readonly { event: PresentationEventName; label: string }[]
> = {
  'experience.call_started': { event: 'call_started', label: 'Call received' },
  'experience.processing_started': { event: 'processing_started', label: 'Processing your call' },
  'experience.lead_ready': { event: 'lead_ready', label: 'Lead ready' },
  'experience.discovery_started': { event: 'discovery_available', label: 'Discovery available' },
  'experience.completed': { event: 'completed', label: 'Demo completed' },
  'experience.expired': { event: 'session_expired', label: 'Session expired' },
  'experience.recovery_started': { event: 'session_recovered', label: 'Recovery started' },
  'experience.recovery_completed': { event: 'session_recovered', label: 'Session recovered' },
  'experience.purged': { event: 'cleanup_started', label: 'Cleanup started' },
  'leadboard.call_received': { event: 'call_started', label: 'Call received' },
  'leadboard.transcript_ready': [
    { event: 'call_completed', label: 'Call completed' },
    { event: 'transcript_ready', label: 'Conversation understood' },
  ],
  'leadboard.lead_created': { event: 'customer_details_ready', label: 'Customer details extracted' },
  'leadboard.summary_ready': { event: 'summary_ready', label: 'Summary ready' },
  'leadboard.processing_completed': { event: 'lead_ready', label: 'Lead ready' },
  'discovery.booked': { event: 'discovery_booked', label: 'Discovery session booked' },
};

export const PRESENTATION_SAFE_EVENT_NAMES = new Set<string>([
  'session_started',
  'waiting_for_call',
  'call_started',
  'call_completed',
  'processing_started',
  'transcript_ready',
  'customer_details_ready',
  'timeline_ready',
  'summary_ready',
  'lead_ready',
  'discovery_available',
  'discovery_booked',
  'session_recovered',
  'session_expired',
  'cleanup_started',
  'completed',
]);

export const INTERNAL_EVENT_PREFIXES = ['leadboard.', 'experience.', 'operations.'] as const;

export function buildRestrictedLeadViewUrl(experienceSessionId: string): string {
  return `/demo/view/${experienceSessionId}`;
}

export function buildPresentationEvent(
  event: PresentationEventName,
  experienceSessionId: string,
  label: string,
  timestamp: string,
  restrictedLeadViewUrl?: string,
): PresentationEvent {
  return {
    event,
    data: {
      experience_session_id: experienceSessionId,
      label,
      timestamp,
      ...(restrictedLeadViewUrl ? { restricted_lead_view_url: restrictedLeadViewUrl } : {}),
    },
  };
}

export function isPresentationSafeEventName(eventName: string): boolean {
  return PRESENTATION_SAFE_EVENT_NAMES.has(eventName);
}

export function isInternalEventName(eventName: string): boolean {
  return INTERNAL_EVENT_PREFIXES.some((prefix) => eventName.startsWith(prefix));
}

export function mapDomainEventToPresentationEvents(event: DomainEventEnvelope): PresentationEvent[] {
  const mapping = DOMAIN_EVENT_TO_PRESENTATION[event.eventName];
  if (!mapping) {
    return [];
  }

  const mappings = Array.isArray(mapping) ? mapping : [mapping];

  return mappings.map((entry) => {
    const restrictedLeadViewUrl =
      entry.event === 'lead_ready' ? buildRestrictedLeadViewUrl(event.experienceSessionId) : undefined;

    return buildPresentationEvent(
      entry.event,
      event.experienceSessionId,
      entry.label,
      event.occurredAt,
      restrictedLeadViewUrl,
    );
  });
}
