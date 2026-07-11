import { describe, expect, it, vi } from 'vitest';
import type { CreateExperienceDefinitionInput } from '@experience-platform/shared-types';
import { ExperienceDefinitionService } from '../src/application/experience-definition-service.js';
import {
  ExperienceDefinitionAlreadyExistsError,
  ExperienceDefinitionNotFoundError,
} from '../src/domain/experience-definition-errors.js';
import { createDatabase } from '../src/infrastructure/database/connection.js';
import { SqliteExperienceDefinitionRepository } from '../src/infrastructure/repositories/sqlite-experience-definition-repository.js';

const plumbingDemoV1: CreateExperienceDefinitionInput = {
  name: 'Plumbing Demo',
  slug: 'plumbing_demo',
  version: 'v1',
  industry: 'plumbing',
  estimatedDurationSeconds: 180,
  maximumCallDurationSeconds: 900,
  scenario: {
    examples: ['Blocked kitchen sink', 'No hot water'],
  },
  aiAgentIdentifier: 'retell_plumbing_v1',
};

const electricalDemoV1: CreateExperienceDefinitionInput = {
  name: 'Electrical Demo',
  slug: 'electrical_demo',
  version: 'v1',
  industry: 'electrical',
  estimatedDurationSeconds: 180,
  maximumCallDurationSeconds: 900,
  scenario: {
    examples: ['Power outage', 'Faulty wiring'],
  },
  aiAgentIdentifier: 'retell_electrical_v1',
};

function createService(): ExperienceDefinitionService {
  const database = createDatabase();
  const repository = new SqliteExperienceDefinitionRepository(database);
  const logger = { info: vi.fn() };

  return new ExperienceDefinitionService(repository, logger);
}

describe('ExperienceDefinitionService', () => {
  it('creates and reads an experience definition', async () => {
    const service = createService();
    const created = await service.create(plumbingDemoV1);

    expect(created.experienceDefinitionId).toBe('expdef_plumbing_demo_v1');
    expect(created.status).toBe('draft');
    expect(created.active).toBe(false);

    const found = await service.getById(created.experienceDefinitionId);
    expect(found).toEqual(created);
  });

  it('supports multiple versions for the same experience line', async () => {
    const service = createService();

    const v1 = await service.create(plumbingDemoV1);
    const v2 = await service.create({
      ...plumbingDemoV1,
      version: 'v2',
      aiAgentIdentifier: 'retell_plumbing_v2',
    });

    expect(v1.experienceDefinitionId).toBe('expdef_plumbing_demo_v1');
    expect(v2.experienceDefinitionId).toBe('expdef_plumbing_demo_v2');
  });

  it('supports multiple industries', async () => {
    const service = createService();

    await service.create(plumbingDemoV1);
    await service.create(electricalDemoV1);

    const plumbingDefinitions = await service.listByIndustry('plumbing');
    const electricalDefinitions = await service.listByIndustry('electrical');

    expect(plumbingDefinitions).toHaveLength(1);
    expect(electricalDefinitions).toHaveLength(1);
    expect(plumbingDefinitions[0]?.industry).toBe('plumbing');
    expect(electricalDefinitions[0]?.industry).toBe('electrical');
  });

  it('activates and deactivates an experience definition', async () => {
    const service = createService();
    const created = await service.create(plumbingDemoV1);

    const activated = await service.activate(created.experienceDefinitionId);
    expect(activated.status).toBe('active');
    expect(activated.active).toBe(true);

    const deactivated = await service.deactivate(created.experienceDefinitionId);
    expect(deactivated.status).toBe('inactive');
    expect(deactivated.active).toBe(false);
  });

  it('rejects duplicate slug and version combinations', async () => {
    const service = createService();
    await service.create(plumbingDemoV1);

    await expect(service.create(plumbingDemoV1)).rejects.toBeInstanceOf(
      ExperienceDefinitionAlreadyExistsError,
    );
  });

  it('throws when activating a missing definition', async () => {
    const service = createService();

    await expect(service.activate('expdef_missing_v1')).rejects.toBeInstanceOf(
      ExperienceDefinitionNotFoundError,
    );
  });
});
