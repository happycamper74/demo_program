export { ExperienceSessionService } from './application/experience-session-service.js';
export { createDatabase } from './infrastructure/database/connection.js';
export { SqliteExperienceSessionRepository } from './infrastructure/repositories/sqlite-experience-session-repository.js';
export type { ExperienceSessionRepository, SessionOperationsFilters } from './repositories/experience-session-repository.js';
export {
  ExperienceSessionNotFoundError,
  ActiveExperienceSessionAlreadyExistsError,
  InvalidExperienceSessionStateError,
  InvalidExperienceSessionStateTransitionError,
  SessionRecoveryExpiredError,
  SessionRecoveryPreviousStateMissingError,
} from './domain/experience-session-errors.js';
export {
  canTransitionExperienceSessionState,
  countsAsCompletedDemo,
  isActiveExperienceSessionState,
  isTerminalExperienceSessionState,
  isValidExperienceSessionState,
  RECOVERY_TIMEOUT_MS,
  restoreExperienceSessionFromRecovery,
  transitionExperienceSessionState,
} from './domain/experience-session.js';
