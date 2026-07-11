import type { ExperienceSession } from '@experience-platform/shared-types';

export interface SessionOperationsFilters {
  readonly prospectName?: string;
  readonly businessName?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly industry?: string;
  readonly experienceSessionId?: string;
  readonly startedAfter?: string;
  readonly startedBefore?: string;
}

export interface ExperienceSessionRepository {
  create(session: ExperienceSession): Promise<ExperienceSession>;
  update(session: ExperienceSession): Promise<ExperienceSession>;
  findById(experienceSessionId: string): Promise<ExperienceSession | null>;
  findActiveByProspectAndDefinition(
    prospectId: string,
    experienceDefinitionId: string,
  ): Promise<ExperienceSession | null>;
  findCompletedByProspectAndDefinition(
    prospectId: string,
    experienceDefinitionId: string,
  ): Promise<ExperienceSession | null>;
  listActiveForOperations(): Promise<ExperienceSession[]>;
  searchForOperations(filters: SessionOperationsFilters): Promise<ExperienceSession[]>;
}
