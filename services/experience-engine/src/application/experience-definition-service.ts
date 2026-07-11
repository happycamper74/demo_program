import type {
  CreateExperienceDefinitionInput,
  ExperienceDefinition,
} from '@experience-platform/shared-types';
import {
  activateExperienceDefinition,
  createExperienceDefinitionEntity,
  createCorrelationId,
  deactivateExperienceDefinition,
} from '../domain/experience-definition.js';
import {
  ExperienceDefinitionAlreadyExistsError,
  ExperienceDefinitionNotFoundError,
} from '../domain/experience-definition-errors.js';
import type { ExperienceDefinitionRepository } from '../repositories/experience-definition-repository.js';

export interface ExperienceDefinitionServiceLogger {
  info(event: string, details: Record<string, unknown>): void;
}

export class ExperienceDefinitionService {
  constructor(
    private readonly repository: ExperienceDefinitionRepository,
    private readonly logger: ExperienceDefinitionServiceLogger,
  ) {}

  async create(input: CreateExperienceDefinitionInput): Promise<ExperienceDefinition> {
    const existing = await this.repository.findBySlugAndVersion(input.slug, input.version);

    if (existing) {
      throw new ExperienceDefinitionAlreadyExistsError(input.slug, input.version);
    }

    const definition = createExperienceDefinitionEntity(input);
    const created = await this.repository.create(definition);

    this.logger.info('experience_definition.created', {
      correlationId: createCorrelationId(),
      component: 'experience-engine',
      experienceDefinitionId: created.experienceDefinitionId,
      industry: created.industry,
      version: created.version,
    });

    return created;
  }

  async getById(experienceDefinitionId: string): Promise<ExperienceDefinition | null> {
    return this.repository.findById(experienceDefinitionId);
  }

  async listByIndustry(industry: string): Promise<ExperienceDefinition[]> {
    return this.repository.findByIndustry(industry);
  }

  async activate(experienceDefinitionId: string): Promise<ExperienceDefinition> {
    const definition = await this.requireDefinition(experienceDefinitionId);
    const activated = activateExperienceDefinition(definition);
    const updated = await this.repository.update(activated);

    this.logger.info('experience_definition.activated', {
      correlationId: createCorrelationId(),
      component: 'experience-engine',
      experienceDefinitionId: updated.experienceDefinitionId,
    });

    return updated;
  }

  async deactivate(experienceDefinitionId: string): Promise<ExperienceDefinition> {
    const definition = await this.requireDefinition(experienceDefinitionId);
    const deactivated = deactivateExperienceDefinition(definition);
    const updated = await this.repository.update(deactivated);

    this.logger.info('experience_definition.deactivated', {
      correlationId: createCorrelationId(),
      component: 'experience-engine',
      experienceDefinitionId: updated.experienceDefinitionId,
    });

    return updated;
  }

  private async requireDefinition(experienceDefinitionId: string): Promise<ExperienceDefinition> {
    const definition = await this.repository.findById(experienceDefinitionId);

    if (!definition) {
      throw new ExperienceDefinitionNotFoundError(experienceDefinitionId);
    }

    return definition;
  }
}
