export type ExperienceSessionState =
  | 'Draft'
  | 'Qualified'
  | 'WaitingForCall'
  | 'CallActive'
  | 'Processing'
  | 'LeadReady'
  | 'Discovery'
  | 'Completed'
  | 'Purged'
  | 'Expired'
  | 'CallFailed'
  | 'TechnicalFailure'
  | 'Recovery';

export type ExperienceSessionRecoveryState = 'Connected' | 'Disconnected' | 'Recovery';

export type ExperienceSessionCleanupState =
  | 'Pending'
  | 'Queued'
  | 'Running'
  | 'Completed'
  | 'Failed';

export interface ExperienceSessionLeadboardReferences {
  readonly leadboardDemoSessionId: string | null;
  readonly leadboardLeadId: string | null;
}

export interface ExperienceSession extends ExperienceSessionLeadboardReferences {
  readonly experienceSessionId: string;
  readonly prospectId: string;
  readonly experienceDefinitionId: string;
  readonly state: ExperienceSessionState;
  readonly recoveryState: ExperienceSessionRecoveryState;
  readonly failureReason: string | null;
  readonly cleanupState: ExperienceSessionCleanupState;
  readonly startedAt: string;
  readonly expiresAt: string;
  readonly completedAt: string | null;
  readonly purgedAt: string | null;
  readonly recoveryPreviousState: ExperienceSessionState | null;
}

export interface CreateExperienceSessionInput {
  readonly prospectId: string;
  readonly experienceDefinitionId: string;
  readonly leadboardDemoSessionId?: string | null;
  readonly leadboardLeadId?: string | null;
}

export interface UpdateExperienceSessionLeadboardReferencesInput {
  readonly leadboardDemoSessionId?: string | null;
  readonly leadboardLeadId?: string | null;
}
