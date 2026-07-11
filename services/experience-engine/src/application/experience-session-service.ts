import type {
  CreateExperienceSessionInput,
  ExperienceSession,
  ExperienceSessionState,
  UpdateExperienceSessionLeadboardReferencesInput,
} from '@experience-platform/shared-types';
import { createCorrelationId } from '../domain/experience-definition.js';
import {
  countsAsCompletedDemo,
  createExperienceSessionEntity,
  isValidExperienceSessionState,
  transitionExperienceSessionState,
  updateExperienceSessionLeadboardReferences,
} from '../domain/experience-session.js';
import {
  ActiveExperienceSessionAlreadyExistsError,
  ExperienceDefinitionNotFoundForSessionError,
  ExperienceSessionNotFoundError,
  InvalidExperienceSessionStateError,
  InvalidExperienceSessionStateTransitionError,
  ProspectNotFoundError,
} from '../domain/experience-session-errors.js';
import type { ExperienceDefinitionRepository } from '../repositories/experience-definition-repository.js';
import type { ExperienceSessionRepository } from '../repositories/experience-session-repository.js';
import type { ProspectRepository } from '../repositories/prospect-repository.js';

export interface ExperienceSessionServiceLogger {
  info(event: string, details: Record<string, unknown>): void;
}

export class ExperienceSessionService {
  constructor(
    private readonly sessionRepository: ExperienceSessionRepository,
    private readonly prospectRepository: ProspectRepository,
    private readonly experienceDefinitionRepository: ExperienceDefinitionRepository,
    private readonly logger: ExperienceSessionServiceLogger,
  ) {}

  async create(input: CreateExperienceSessionInput): Promise<ExperienceSession> {
    await this.requireProspect(input.prospectId);
    await this.requireExperienceDefinition(input.experienceDefinitionId);

    const activeSession = await this.sessionRepository.findActiveByProspectAndDefinition(
      input.prospectId,
      input.experienceDefinitionId,
    );

    if (activeSession) {
      throw new ActiveExperienceSessionAlreadyExistsError(
        input.prospectId,
        input.experienceDefinitionId,
      );
    }

    const session = createExperienceSessionEntity(input);
    const created = await this.sessionRepository.create(session);

    this.logger.info('experience_session.created', {
      correlationId: createCorrelationId(),
      component: 'experience-engine',
      experienceSessionId: created.experienceSessionId,
      prospectId: created.prospectId,
      experienceDefinitionId: created.experienceDefinitionId,
      state: created.state,
    });

    return created;
  }

  async getById(experienceSessionId: string): Promise<ExperienceSession | null> {
    return this.sessionRepository.findById(experienceSessionId);
  }

  async transitionTo(
    experienceSessionId: string,
    nextState: ExperienceSessionState,
    options: {
      readonly failureReason?: string | null;
    } = {},
  ): Promise<ExperienceSession> {
    if (!isValidExperienceSessionState(nextState)) {
      throw new InvalidExperienceSessionStateError(nextState);
    }

    const session = await this.requireSession(experienceSessionId);

    const transitioned = transitionExperienceSessionState(session, nextState, options);
    const updated = await this.sessionRepository.update(transitioned);

    this.logger.info('experience_session.state_changed', {
      correlationId: createCorrelationId(),
      component: 'experience-engine',
      experienceSessionId: updated.experienceSessionId,
      previousState: session.state,
      state: updated.state,
    });

    return updated;
  }

  async markExpired(
    experienceSessionId: string,
    failureReason: string = 'waiting_for_call_timeout',
  ): Promise<ExperienceSession> {
    return this.transitionTo(experienceSessionId, 'Expired', { failureReason });
  }

  async markCompleted(experienceSessionId: string): Promise<ExperienceSession> {
    const session = await this.requireSession(experienceSessionId);

    if (session.state !== 'LeadReady' && session.state !== 'Discovery') {
      throw new InvalidExperienceSessionStateTransitionError(session.state, 'Completed');
    }

    return this.transitionTo(experienceSessionId, 'Completed');
  }

  async updateLeadboardReferences(
    experienceSessionId: string,
    input: UpdateExperienceSessionLeadboardReferencesInput,
  ): Promise<ExperienceSession> {
    const session = await this.requireSession(experienceSessionId);
    const updatedSession = updateExperienceSessionLeadboardReferences(session, input);
    return this.sessionRepository.update(updatedSession);
  }

  isCompletedDemo(session: ExperienceSession): boolean {
    return countsAsCompletedDemo(session);
  }

  private async requireSession(experienceSessionId: string): Promise<ExperienceSession> {
    const session = await this.sessionRepository.findById(experienceSessionId);

    if (!session) {
      throw new ExperienceSessionNotFoundError(experienceSessionId);
    }

    return session;
  }

  private async requireProspect(prospectId: string): Promise<void> {
    const prospect = await this.prospectRepository.findById(prospectId);

    if (!prospect) {
      throw new ProspectNotFoundError(prospectId);
    }
  }

  private async requireExperienceDefinition(experienceDefinitionId: string): Promise<void> {
    const definition = await this.experienceDefinitionRepository.findById(experienceDefinitionId);

    if (!definition) {
      throw new ExperienceDefinitionNotFoundForSessionError(experienceDefinitionId);
    }
  }
}
