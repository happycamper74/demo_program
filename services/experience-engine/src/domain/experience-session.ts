import { randomUUID } from 'node:crypto';
import type {
  CreateExperienceSessionInput,
  ExperienceSession,
  ExperienceSessionCleanupState,
  ExperienceSessionRecoveryState,
  ExperienceSessionState,
} from '@experience-platform/shared-types';
import {
  InvalidExperienceSessionStateTransitionError,
  SessionRecoveryExpiredError,
  SessionRecoveryPreviousStateMissingError,
} from './experience-session-errors.js';

export const WAITING_FOR_CALL_TIMEOUT_MS = 15 * 60 * 1000;
export const RECOVERY_TIMEOUT_MS = 5 * 60 * 1000;

export const ACTIVE_EXPERIENCE_SESSION_STATES = [
  'Draft',
  'Qualified',
  'WaitingForCall',
  'CallActive',
  'Processing',
  'LeadReady',
  'Discovery',
  'Recovery',
] as const satisfies readonly ExperienceSessionState[];

const BASE_EXPERIENCE_SESSION_TRANSITIONS: Readonly<
  Record<ExperienceSessionState, readonly ExperienceSessionState[]>
> = {
  Draft: ['Qualified'],
  Qualified: ['WaitingForCall'],
  WaitingForCall: ['CallActive', 'Expired'],
  CallActive: ['Processing', 'CallFailed'],
  Processing: ['LeadReady', 'TechnicalFailure', 'Recovery'],
  LeadReady: ['Discovery', 'Completed'],
  Discovery: ['Completed'],
  Completed: ['Purged'],
  Purged: [],
  Expired: [],
  CallFailed: [],
  TechnicalFailure: [],
  Recovery: [],
};

function buildAllowedExperienceSessionTransitions(): Readonly<
  Record<ExperienceSessionState, readonly ExperienceSessionState[]>
> {
  const transitions: Record<ExperienceSessionState, ExperienceSessionState[]> = {
    Draft: [...BASE_EXPERIENCE_SESSION_TRANSITIONS.Draft],
    Qualified: [...BASE_EXPERIENCE_SESSION_TRANSITIONS.Qualified],
    WaitingForCall: [...BASE_EXPERIENCE_SESSION_TRANSITIONS.WaitingForCall],
    CallActive: [...BASE_EXPERIENCE_SESSION_TRANSITIONS.CallActive],
    Processing: [...BASE_EXPERIENCE_SESSION_TRANSITIONS.Processing],
    LeadReady: [...BASE_EXPERIENCE_SESSION_TRANSITIONS.LeadReady],
    Discovery: [...BASE_EXPERIENCE_SESSION_TRANSITIONS.Discovery],
    Completed: [...BASE_EXPERIENCE_SESSION_TRANSITIONS.Completed],
    Purged: [...BASE_EXPERIENCE_SESSION_TRANSITIONS.Purged],
    Expired: [...BASE_EXPERIENCE_SESSION_TRANSITIONS.Expired],
    CallFailed: [...BASE_EXPERIENCE_SESSION_TRANSITIONS.CallFailed],
    TechnicalFailure: [...BASE_EXPERIENCE_SESSION_TRANSITIONS.TechnicalFailure],
    Recovery: [...BASE_EXPERIENCE_SESSION_TRANSITIONS.Recovery],
  };

  for (const state of ACTIVE_EXPERIENCE_SESSION_STATES) {
    if (state === 'Recovery') {
      continue;
    }

    if (!transitions[state].includes('Recovery')) {
      transitions[state].push('Recovery');
    }
  }

  return transitions;
}

export const ALLOWED_EXPERIENCE_SESSION_TRANSITIONS = buildAllowedExperienceSessionTransitions();

export function buildExperienceSessionId(): string {
  return `expsess_${randomUUID()}`;
}

export function isActiveExperienceSessionState(state: ExperienceSessionState): boolean {
  return (ACTIVE_EXPERIENCE_SESSION_STATES as readonly string[]).includes(state);
}

export function isValidExperienceSessionState(value: string): value is ExperienceSessionState {
  return value in ALLOWED_EXPERIENCE_SESSION_TRANSITIONS;
}

export function canTransitionExperienceSessionState(
  currentState: ExperienceSessionState,
  nextState: ExperienceSessionState,
): boolean {
  return ALLOWED_EXPERIENCE_SESSION_TRANSITIONS[currentState].includes(nextState);
}

export function isTerminalExperienceSessionState(state: ExperienceSessionState): boolean {
  return state === 'Purged';
}

export function countsAsCompletedDemo(session: ExperienceSession): boolean {
  return session.state === 'Completed' && session.completedAt !== null;
}

export function createExperienceSessionEntity(
  input: CreateExperienceSessionInput,
  now: Date = new Date(),
): ExperienceSession {
  const startedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + WAITING_FOR_CALL_TIMEOUT_MS).toISOString();

  return {
    experienceSessionId: buildExperienceSessionId(),
    prospectId: input.prospectId,
    experienceDefinitionId: input.experienceDefinitionId,
    state: 'WaitingForCall',
    recoveryState: 'Connected',
    failureReason: null,
    cleanupState: 'Pending',
    startedAt,
    expiresAt,
    completedAt: null,
    purgedAt: null,
    recoveryPreviousState: null,
    leadboardDemoSessionId: input.leadboardDemoSessionId ?? null,
    leadboardLeadId: input.leadboardLeadId ?? null,
  };
}

export function transitionExperienceSessionState(
  session: ExperienceSession,
  nextState: ExperienceSessionState,
  options: {
    readonly now?: Date;
    readonly failureReason?: string | null;
    readonly recoveryState?: ExperienceSessionRecoveryState;
    readonly cleanupState?: ExperienceSessionCleanupState;
  } = {},
): ExperienceSession {
  if (!canTransitionExperienceSessionState(session.state, nextState)) {
    throw new InvalidExperienceSessionStateTransitionError(session.state, nextState);
  }

  const now = options.now ?? new Date();
  const timestamp = now.toISOString();
  const enteringRecovery = nextState === 'Recovery' && session.state !== 'Recovery';

  return {
    ...session,
    state: nextState,
    recoveryState: options.recoveryState ?? (enteringRecovery ? 'Recovery' : session.recoveryState),
    cleanupState: options.cleanupState ?? session.cleanupState,
    failureReason:
      nextState === 'Expired' || nextState === 'CallFailed' || nextState === 'TechnicalFailure'
        ? (options.failureReason ?? session.failureReason)
        : session.failureReason,
    completedAt: nextState === 'Completed' ? timestamp : session.completedAt,
    purgedAt: nextState === 'Purged' ? timestamp : session.purgedAt,
    expiresAt: enteringRecovery
      ? new Date(now.getTime() + RECOVERY_TIMEOUT_MS).toISOString()
      : nextState === 'Expired'
        ? timestamp
        : session.expiresAt,
    recoveryPreviousState: enteringRecovery ? session.state : session.recoveryPreviousState,
  };
}

export function restoreExperienceSessionFromRecovery(
  session: ExperienceSession,
  now: Date = new Date(),
): ExperienceSession {
  if (session.state !== 'Recovery') {
    throw new InvalidExperienceSessionStateTransitionError(session.state, 'restore_from_recovery');
  }

  if (!session.recoveryPreviousState) {
    throw new SessionRecoveryPreviousStateMissingError(session.experienceSessionId);
  }

  if (new Date(session.expiresAt).getTime() <= now.getTime()) {
    throw new SessionRecoveryExpiredError(session.experienceSessionId);
  }

  return {
    ...session,
    state: session.recoveryPreviousState,
    recoveryState: 'Connected',
    recoveryPreviousState: null,
  };
}

export function updateExperienceSessionLeadboardReferences(
  session: ExperienceSession,
  input: {
    readonly leadboardDemoSessionId?: string | null;
    readonly leadboardLeadId?: string | null;
  },
): ExperienceSession {
  return {
    ...session,
    leadboardDemoSessionId:
      input.leadboardDemoSessionId !== undefined
        ? input.leadboardDemoSessionId
        : session.leadboardDemoSessionId,
    leadboardLeadId:
      input.leadboardLeadId !== undefined ? input.leadboardLeadId : session.leadboardLeadId,
  };
}
