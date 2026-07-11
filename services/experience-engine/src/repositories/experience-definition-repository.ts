import type {
  CreateExperienceDefinitionInput,
  ExperienceDefinition,
} from '@experience-platform/shared-types';

export interface ExperienceDefinitionRepository {
  create(definition: ExperienceDefinition): Promise<ExperienceDefinition>;
  findById(experienceDefinitionId: string): Promise<ExperienceDefinition | null>;
  findBySlugAndVersion(slug: string, version: string): Promise<ExperienceDefinition | null>;
  findByIndustry(industry: string): Promise<ExperienceDefinition[]>;
  update(definition: ExperienceDefinition): Promise<ExperienceDefinition>;
}

export type { CreateExperienceDefinitionInput };
