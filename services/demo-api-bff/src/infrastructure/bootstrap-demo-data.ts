import {
  activateExperienceDefinition,
  ExperienceDefinitionService,
} from '@experience-platform/experience-engine/experience-definitions';
import type { CreateExperienceDefinitionInput } from '@experience-platform/shared-types';

export const PLUMBING_DEMO_DEFINITION: CreateExperienceDefinitionInput = {
  name: 'Plumbing Demo',
  slug: 'plumbing_demo',
  version: 'v1',
  industry: 'plumbing',
  estimatedDurationSeconds: 180,
  maximumCallDurationSeconds: 900,
  scenario: {
    examples: ['Blocked kitchen sink', 'No hot water', 'Leaking pipe', 'Bathroom renovation quote'],
  },
  aiAgentIdentifier: 'retell_plumbing_v1',
};

export const PLUMBING_DEMO_DEFINITION_ID = 'expdef_plumbing_demo_v1';

export async function ensurePlumbingDemoDefinition(
  experienceDefinitionService: ExperienceDefinitionService,
): Promise<void> {
  const existing = await experienceDefinitionService.getById(PLUMBING_DEMO_DEFINITION_ID);

  if (!existing) {
    const created = await experienceDefinitionService.create(PLUMBING_DEMO_DEFINITION);
    const activated = activateExperienceDefinition(created);
    await experienceDefinitionService.activate(activated.experienceDefinitionId);
    return;
  }

  if (!existing.active) {
    await experienceDefinitionService.activate(existing.experienceDefinitionId);
  }
}
