import { randomUUID } from 'node:crypto';
import type {
  CreateExperienceDefinitionInput,
  ExperienceDefinition,
} from '@experience-platform/shared-types';

export function buildExperienceDefinitionId(slug: string, version: string): string {
  return `expdef_${slug}_${version}`;
}

export function createExperienceDefinitionEntity(
  input: CreateExperienceDefinitionInput,
  now: string = new Date().toISOString(),
): ExperienceDefinition {
  return {
    experienceDefinitionId: buildExperienceDefinitionId(input.slug, input.version),
    name: input.name,
    slug: input.slug,
    version: input.version,
    industry: input.industry,
    status: 'draft',
    estimatedDurationSeconds: input.estimatedDurationSeconds,
    maximumCallDurationSeconds: input.maximumCallDurationSeconds,
    scenario: input.scenario,
    aiAgentIdentifier: input.aiAgentIdentifier,
    bookingConfiguration: input.bookingConfiguration ?? {},
    active: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function activateExperienceDefinition(
  definition: ExperienceDefinition,
  now: string = new Date().toISOString(),
): ExperienceDefinition {
  return {
    ...definition,
    status: 'active',
    active: true,
    updatedAt: now,
  };
}

export function deactivateExperienceDefinition(
  definition: ExperienceDefinition,
  now: string = new Date().toISOString(),
): ExperienceDefinition {
  return {
    ...definition,
    status: 'inactive',
    active: false,
    updatedAt: now,
  };
}

export function createCorrelationId(): string {
  return randomUUID();
}
