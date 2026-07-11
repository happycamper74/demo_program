import type { ExperienceSessionState } from '@experience-platform/shared-types';

export class ExperienceSessionNotFoundError extends Error {
  constructor(public readonly experienceSessionId: string) {
    super(`Experience session not found: ${experienceSessionId}`);
    this.name = 'ExperienceSessionNotFoundError';
  }
}

export class ProspectNotFoundError extends Error {
  constructor(public readonly prospectId: string) {
    super(`Prospect not found: ${prospectId}`);
    this.name = 'ProspectNotFoundError';
  }
}

export class ExperienceDefinitionNotFoundForSessionError extends Error {
  constructor(public readonly experienceDefinitionId: string) {
    super(`Experience definition not found: ${experienceDefinitionId}`);
    this.name = 'ExperienceDefinitionNotFoundForSessionError';
  }
}

export class ActiveExperienceSessionAlreadyExistsError extends Error {
  constructor(
    public readonly prospectId: string,
    public readonly experienceDefinitionId: string,
  ) {
    super(
      `Active experience session already exists for prospect ${prospectId} and definition ${experienceDefinitionId}`,
    );
    this.name = 'ActiveExperienceSessionAlreadyExistsError';
  }
}

export class InvalidExperienceSessionStateError extends Error {
  constructor(public readonly state: string) {
    super(`Invalid experience session state: ${state}`);
    this.name = 'InvalidExperienceSessionStateError';
  }
}

export class InvalidExperienceSessionStateTransitionError extends Error {
  constructor(
    public readonly currentState: ExperienceSessionState,
    public readonly nextState: ExperienceSessionState | string,
  ) {
    super(`Invalid experience session transition from ${currentState} to ${nextState}`);
    this.name = 'InvalidExperienceSessionStateTransitionError';
  }
}

export class SessionRecoveryPreviousStateMissingError extends Error {
  constructor(public readonly experienceSessionId: string) {
    super(`Recovery previous state is missing for session: ${experienceSessionId}`);
    this.name = 'SessionRecoveryPreviousStateMissingError';
  }
}

export class SessionRecoveryExpiredError extends Error {
  constructor(public readonly experienceSessionId: string) {
    super(`Recovery window expired for session: ${experienceSessionId}`);
    this.name = 'SessionRecoveryExpiredError';
  }
}
