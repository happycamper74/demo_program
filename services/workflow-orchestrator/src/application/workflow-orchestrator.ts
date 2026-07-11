import {
  buildDomainEventId,
  RECOVERY_COMPLETED_EVENT,
  resolveTransitionEventName,
  type DomainEventEnvelope,
  type EventPublisher,
} from '@experience-platform/event-contracts';
import type { ExperienceSession, ExperienceSessionState } from '@experience-platform/shared-types';
import type { ExperienceSessionRepository } from '@experience-platform/experience-engine/experience-sessions';
import {
  ExperienceSessionNotFoundError,
  InvalidExperienceSessionStateError,
  InvalidExperienceSessionStateTransitionError,
  RECOVERY_TIMEOUT_MS,
  isActiveExperienceSessionState,
  isValidExperienceSessionState,
  restoreExperienceSessionFromRecovery,
  transitionExperienceSessionState,
} from '@experience-platform/experience-engine/experience-sessions';

export interface WorkflowOrchestratorLogger {
  info(event: string, details: Record<string, unknown>): void;
  warn(event: string, details: Record<string, unknown>): void;
}

export interface TransitionOptions {
  readonly failureReason?: string | null;
  readonly idempotencyKey?: string;
  readonly payload?: Record<string, unknown>;
  readonly now?: Date;
}

interface IdempotentTransitionRecord {
  readonly experienceSessionId: string;
  readonly targetState: ExperienceSessionState;
  readonly session: ExperienceSession;
  readonly event: DomainEventEnvelope;
}

export class WorkflowOrchestrator {
  private readonly idempotentTransitions = new Map<string, IdempotentTransitionRecord>();

  constructor(
    private readonly sessionRepository: ExperienceSessionRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly logger: WorkflowOrchestratorLogger,
  ) {}

  async transition(
    experienceSessionId: string,
    nextState: ExperienceSessionState,
    options: TransitionOptions = {},
  ): Promise<ExperienceSession> {
    if (!isValidExperienceSessionState(nextState)) {
      throw new InvalidExperienceSessionStateError(nextState);
    }

    const session = await this.requireSession(experienceSessionId);

    if (session.state === nextState) {
      this.logger.info('experience_session.transition_idempotent_noop', {
        component: 'workflow-orchestrator',
        experienceSessionId,
        state: nextState,
      });
      return session;
    }

    if (options.idempotencyKey) {
      const cached = this.idempotentTransitions.get(options.idempotencyKey);
      if (
        cached &&
        cached.experienceSessionId === experienceSessionId &&
        cached.targetState === nextState
      ) {
        return cached.session;
      }
    }

    const previousState = session.state;

    try {
      const transitioned = transitionExperienceSessionState(session, nextState, {
        now: options.now,
        failureReason: options.failureReason,
      });
      const updated = await this.sessionRepository.update(transitioned);
      const event = await this.publishTransitionEvent(updated, previousState, options);

      if (options.idempotencyKey) {
        this.idempotentTransitions.set(options.idempotencyKey, {
          experienceSessionId,
          targetState: nextState,
          session: updated,
          event,
        });
      }

      this.logger.info('experience_session.transition_succeeded', {
        component: 'workflow-orchestrator',
        experienceSessionId,
        previousState,
        state: updated.state,
        eventName: event.eventName,
      });

      return updated;
    } catch (error) {
      this.logger.warn('experience_session.transition_failed', {
        component: 'workflow-orchestrator',
        experienceSessionId,
        previousState,
        targetState: nextState,
        error: error instanceof Error ? error.name : 'UnknownError',
      });

      throw error;
    }
  }

  async enterRecovery(
    experienceSessionId: string,
    options: TransitionOptions = {},
  ): Promise<ExperienceSession> {
    const session = await this.requireSession(experienceSessionId);

    if (!isActiveExperienceSessionState(session.state) || session.state === 'Recovery') {
      throw new InvalidExperienceSessionStateTransitionError(session.state, 'Recovery');
    }

    const now = options.now ?? new Date();
    const recoveryDeadline = new Date(now.getTime() + RECOVERY_TIMEOUT_MS).toISOString();

    return this.transition(experienceSessionId, 'Recovery', {
      ...options,
      now,
      payload: {
        ...options.payload,
        recovery_deadline: recoveryDeadline,
        previous_state: session.state,
      },
    });
  }

  async completeRecovery(
    experienceSessionId: string,
    options: TransitionOptions = {},
  ): Promise<ExperienceSession> {
    const session = await this.requireSession(experienceSessionId);
    const now = options.now ?? new Date();
    const previousState = session.state;

    try {
      const restored = restoreExperienceSessionFromRecovery(session, now);
      const updated = await this.sessionRepository.update(restored);
      const event: DomainEventEnvelope = {
        eventId: buildDomainEventId(),
        eventName: RECOVERY_COMPLETED_EVENT,
        eventVersion: 1,
        occurredAt: now.toISOString(),
        experienceSessionId: updated.experienceSessionId,
        experienceDefinitionId: updated.experienceDefinitionId,
        prospectId: updated.prospectId,
        payload: {
          previous_state: previousState,
          state: updated.state,
          ...options.payload,
        },
      };

      await this.eventPublisher.publish(event);

      this.logger.info('experience_session.recovery_completed', {
        component: 'workflow-orchestrator',
        experienceSessionId,
        previousState,
        state: updated.state,
      });

      return updated;
    } catch (error) {
      this.logger.warn('experience_session.recovery_failed', {
        component: 'workflow-orchestrator',
        experienceSessionId,
        previousState,
        error: error instanceof Error ? error.name : 'UnknownError',
      });

      throw error;
    }
  }

  private async publishTransitionEvent(
    session: ExperienceSession,
    previousState: ExperienceSessionState,
    options: TransitionOptions,
  ): Promise<DomainEventEnvelope> {
    const eventName = resolveTransitionEventName(
      previousState,
      session.state,
      isActiveExperienceSessionState,
    );
    const event: DomainEventEnvelope = {
      eventId: buildDomainEventId(),
      eventName,
      eventVersion: 1,
      occurredAt: (options.now ?? new Date()).toISOString(),
      experienceSessionId: session.experienceSessionId,
      experienceDefinitionId: session.experienceDefinitionId,
      prospectId: session.prospectId,
      payload: {
        previous_state: previousState,
        state: session.state,
        ...options.payload,
        ...(eventName === 'experience.lead_ready' && session.leadboardLeadId
          ? { leadboard_lead_id: session.leadboardLeadId }
          : {}),
      },
    };

    await this.eventPublisher.publish(event);
    return event;
  }

  private async requireSession(experienceSessionId: string): Promise<ExperienceSession> {
    const session = await this.sessionRepository.findById(experienceSessionId);

    if (!session) {
      throw new ExperienceSessionNotFoundError(experienceSessionId);
    }

    return session;
  }
}
