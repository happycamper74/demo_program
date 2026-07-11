export const PACKAGE_NAME = '@experience-platform/shared-types' as const;

export type {
  CreateExperienceDefinitionInput,
  ExperienceDefinition,
  ExperienceDefinitionStatus,
  ExperienceScenario,
} from './experience-definition.js';

export type { Prospect, ProspectStatus, UpsertProspectInput } from './prospect.js';

export type {
  CreateExperienceSessionInput,
  ExperienceSession,
  ExperienceSessionCleanupState,
  ExperienceSessionLeadboardReferences,
  ExperienceSessionRecoveryState,
  ExperienceSessionState,
  UpdateExperienceSessionLeadboardReferencesInput,
} from './experience-session.js';
