export type ExperienceDefinitionStatus = 'draft' | 'active' | 'inactive';

export interface ExperienceScenario {
  readonly examples: readonly string[];
}

export interface ExperienceDefinition {
  readonly experienceDefinitionId: string;
  readonly name: string;
  readonly slug: string;
  readonly version: string;
  readonly industry: string;
  readonly status: ExperienceDefinitionStatus;
  readonly estimatedDurationSeconds: number;
  readonly maximumCallDurationSeconds: number;
  readonly scenario: ExperienceScenario;
  readonly aiAgentIdentifier: string;
  readonly bookingConfiguration: Record<string, unknown>;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateExperienceDefinitionInput {
  readonly name: string;
  readonly slug: string;
  readonly version: string;
  readonly industry: string;
  readonly estimatedDurationSeconds: number;
  readonly maximumCallDurationSeconds: number;
  readonly scenario: ExperienceScenario;
  readonly aiAgentIdentifier: string;
  readonly bookingConfiguration?: Record<string, unknown>;
}
