import type { ExperienceSession, ExperienceSessionState } from '@experience-platform/shared-types';
import type { DemoProcessingState } from '@experience-platform/leadboard-client';
import type { PresentationEvent, PresentationEventName } from '../types/api.js';

const STATE_TO_API_STATE: Record<ExperienceSessionState, string> = {
  Draft: 'draft',
  Qualified: 'qualified',
  WaitingForCall: 'waiting_for_call',
  CallActive: 'call_active',
  Processing: 'processing',
  LeadReady: 'lead_ready',
  Discovery: 'discovery',
  Completed: 'completed',
  Purged: 'purged',
  Expired: 'expired',
  CallFailed: 'call_failed',
  TechnicalFailure: 'technical_failure',
  Recovery: 'recovery',
};

const PROCESSING_STATE_TO_STEP: Record<DemoProcessingState, string> = {
  waiting_for_call: 'waiting_for_call',
  call_received: 'call_received',
  transcript_stored: 'transcript_ready',
  lead_created: 'customer_details_ready',
  summary_ready: 'summary_ready',
  lead_ready: 'lead_ready',
  purged: 'purged',
};

export function mapSessionStateToApiState(state: ExperienceSessionState): string {
  return STATE_TO_API_STATE[state];
}

export function buildRestrictedLeadViewUrl(experienceSessionId: string): string {
  return `/demo/view/${experienceSessionId}`;
}

export function isLeadViewAvailable(session: ExperienceSession): boolean {
  return session.state === 'LeadReady' || session.state === 'Discovery' || session.state === 'Completed';
}

export function isRecoveryAvailable(session: ExperienceSession, now: Date = new Date()): boolean {
  return session.state === 'Recovery' && new Date(session.expiresAt).getTime() > now.getTime();
}

export function resolveCurrentStep(
  session: ExperienceSession,
  processingState?: DemoProcessingState | null,
): string {
  if (processingState) {
    return PROCESSING_STATE_TO_STEP[processingState] ?? processingState;
  }

  switch (session.state) {
    case 'WaitingForCall':
      return 'waiting_for_call';
    case 'CallActive':
      return 'call_active';
    case 'Processing':
      return 'processing_started';
    case 'LeadReady':
      return 'lead_ready';
    case 'Discovery':
      return 'discovery_available';
    case 'Completed':
      return 'completed';
    case 'Recovery':
      return 'recovery';
    case 'Expired':
      return 'session_expired';
    default:
      return mapSessionStateToApiState(session.state);
  }
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

export function buildStatusReconciliationEvents(
  session: ExperienceSession,
  processingState?: DemoProcessingState | null,
): PresentationEvent[] {
  const timestamp = new Date().toISOString();
  const events: PresentationEvent[] = [
    buildPresentationEvent('session_started', session.experienceSessionId, 'Demo session started', timestamp),
  ];

  if (session.state === 'WaitingForCall') {
    events.push(
      buildPresentationEvent(
        'waiting_for_call',
        session.experienceSessionId,
        'Waiting for your call',
        timestamp,
      ),
    );
    return events;
  }

  events.push(
    buildPresentationEvent(
      'waiting_for_call',
      session.experienceSessionId,
      'Waiting for your call',
      timestamp,
    ),
  );

  if (['CallActive', 'Processing', 'LeadReady', 'Discovery', 'Completed', 'Recovery'].includes(session.state)) {
    events.push(
      buildPresentationEvent('call_started', session.experienceSessionId, 'Call received', timestamp),
    );
  }

  if (['Processing', 'LeadReady', 'Discovery', 'Completed', 'Recovery'].includes(session.state)) {
    events.push(
      buildPresentationEvent(
        'processing_started',
        session.experienceSessionId,
        'Processing your call',
        timestamp,
      ),
    );
  }

  const step = resolveCurrentStep(session, processingState);
  if (['transcript_ready', 'customer_details_ready', 'summary_ready'].includes(step)) {
    const eventName = step as PresentationEventName;
    events.push(buildPresentationEvent(eventName, session.experienceSessionId, step.replace(/_/g, ' '), timestamp));
  }

  if (isLeadViewAvailable(session)) {
    events.push(
      buildPresentationEvent(
        'lead_ready',
        session.experienceSessionId,
        'Lead ready',
        timestamp,
        buildRestrictedLeadViewUrl(session.experienceSessionId),
      ),
    );
  }

  if (session.state === 'Completed') {
    events.push(
      buildPresentationEvent('completed', session.experienceSessionId, 'Demo completed', timestamp),
    );
  }

  if (session.state === 'Expired') {
    events.push(
      buildPresentationEvent('session_expired', session.experienceSessionId, 'Session expired', timestamp),
    );
  }

  return events;
}
