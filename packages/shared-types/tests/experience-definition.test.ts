import { describe, expect, it } from 'vitest';
import type { ExperienceDefinition } from '../src/experience-definition.js';

describe('experience definition types', () => {
  it('allows configuration-driven definitions without hardcoded demo behavior', () => {
    const definition: ExperienceDefinition = {
      experienceDefinitionId: 'expdef_plumbing_demo_v1',
      name: 'Plumbing Demo',
      slug: 'plumbing_demo',
      version: 'v1',
      industry: 'plumbing',
      status: 'draft',
      estimatedDurationSeconds: 180,
      maximumCallDurationSeconds: 900,
      scenario: {
        examples: ['Blocked kitchen sink'],
      },
      aiAgentIdentifier: 'retell_plumbing_v1',
      bookingConfiguration: {},
      active: false,
      createdAt: '2026-07-08T12:00:00.000Z',
      updatedAt: '2026-07-08T12:00:00.000Z',
    };

    expect(definition.scenario.examples).toEqual(['Blocked kitchen sink']);
    expect(definition.aiAgentIdentifier).toBe('retell_plumbing_v1');
  });
});
