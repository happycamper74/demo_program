import { describe, expect, it } from 'vitest';
import {
  activateExperienceDefinition,
  buildExperienceDefinitionId,
  createExperienceDefinitionEntity,
  deactivateExperienceDefinition,
} from '../src/domain/experience-definition.js';

describe('experience definition domain', () => {
  it('builds stable experience definition identifiers', () => {
    expect(buildExperienceDefinitionId('plumbing_demo', 'v1')).toBe('expdef_plumbing_demo_v1');
  });

  it('creates draft inactive definitions from configuration input', () => {
    const definition = createExperienceDefinitionEntity(
      {
        name: 'Plumbing Demo',
        slug: 'plumbing_demo',
        version: 'v1',
        industry: 'plumbing',
        estimatedDurationSeconds: 180,
        maximumCallDurationSeconds: 900,
        scenario: { examples: ['Blocked kitchen sink'] },
        aiAgentIdentifier: 'retell_plumbing_v1',
      },
      '2026-07-08T12:00:00.000Z',
    );

    expect(definition.status).toBe('draft');
    expect(definition.active).toBe(false);
    expect(definition.scenario.examples).toEqual(['Blocked kitchen sink']);
  });

  it('activates and deactivates without hardcoded demo behavior', () => {
    const base = createExperienceDefinitionEntity({
      name: 'Electrical Demo',
      slug: 'electrical_demo',
      version: 'v1',
      industry: 'electrical',
      estimatedDurationSeconds: 120,
      maximumCallDurationSeconds: 600,
      scenario: { examples: ['Power outage'] },
      aiAgentIdentifier: 'retell_electrical_v1',
    });

    const activated = activateExperienceDefinition(base, '2026-07-08T12:01:00.000Z');
    const deactivated = deactivateExperienceDefinition(activated, '2026-07-08T12:02:00.000Z');

    expect(activated.active).toBe(true);
    expect(deactivated.active).toBe(false);
    expect(activated.aiAgentIdentifier).toBe('retell_electrical_v1');
  });
});
