export const EXPERIENCE_TOKEN_TYPE = 'experience_session' as const;

export type ExperienceTokenType = typeof EXPERIENCE_TOKEN_TYPE;

export const EXPERIENCE_TOKEN_PERMISSIONS = [
  'experience:view',
  'experience:recover',
  'lead:view',
  'lead:timeline:view',
  'lead:summary:view',
  'lead:transcript:view',
  'discovery:book',
] as const;

export type ExperienceTokenPermission = (typeof EXPERIENCE_TOKEN_PERMISSIONS)[number];

export interface ExperienceTokenClaims {
  readonly token_type: ExperienceTokenType;
  readonly experience_session_id: string;
  readonly experience_definition_id: string;
  readonly prospect_id: string;
  readonly issued_at: number;
  readonly expires_at: number;
  readonly permissions: readonly ExperienceTokenPermission[];
  readonly industry?: string;
  readonly experience_version?: string;
  readonly risk_level?: string;
  readonly leadboard_demo_session_id?: string | null;
  readonly leadboard_lead_id?: string | null;
}

export interface CreateExperienceTokenInput {
  readonly experienceSessionId: string;
  readonly experienceDefinitionId: string;
  readonly prospectId: string;
  readonly permissions: readonly ExperienceTokenPermission[];
  readonly expiresAt: Date;
  readonly issuedAt?: Date;
  readonly industry?: string;
  readonly experienceVersion?: string;
  readonly riskLevel?: string;
  readonly leadboardDemoSessionId?: string | null;
  readonly leadboardLeadId?: string | null;
}

export interface VerifiedExperienceToken {
  readonly claims: ExperienceTokenClaims;
}

export interface SessionOwnershipContext {
  readonly experienceSessionId: string;
  readonly prospectId?: string;
  readonly experienceDefinitionId?: string;
}
