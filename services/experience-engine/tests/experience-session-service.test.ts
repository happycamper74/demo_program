import { describe, expect, it, vi } from 'vitest';
import type { CreateExperienceDefinitionInput, UpsertProspectInput } from '@experience-platform/shared-types';
import { ExperienceDefinitionService } from '../src/application/experience-definition-service.js';
import { ExperienceSessionService } from '../src/application/experience-session-service.js';
import { ProspectService } from '../src/application/prospect-service.js';
import {
  ActiveExperienceSessionAlreadyExistsError,
  InvalidExperienceSessionStateTransitionError,
} from '../src/domain/experience-session-errors.js';
import { createDatabase } from '../src/infrastructure/database/connection.js';
import { SqliteExperienceDefinitionRepository } from '../src/infrastructure/repositories/sqlite-experience-definition-repository.js';
import { SqliteExperienceSessionRepository } from '../src/infrastructure/repositories/sqlite-experience-session-repository.js';
import { SqliteProspectRepository } from '../src/infrastructure/repositories/sqlite-prospect-repository.js';

const plumbingDefinition: CreateExperienceDefinitionInput = {
  name: 'Plumbing Demo',
  slug: 'plumbing_demo',
  version: 'v1',
  industry: 'plumbing',
  estimatedDurationSeconds: 180,
  maximumCallDurationSeconds: 900,
  scenario: { examples: ['Blocked kitchen sink'] },
  aiAgentIdentifier: 'retell_plumbing_v1',
};

const prospectInput: UpsertProspectInput = {
  fullName: 'John Smith',
  businessName: "Joe's Plumbing",
  email: 'john@example.com',
  phoneNumber: '+31612345678',
  industry: 'plumbing',
  businessLocation: 'Amsterdam, Netherlands',
  companySize: '2-5',
  website: 'https://joesplumbing.nl',
  biggestChallenge: 'never_miss_calls',
  implementationTimeframe: 'within_3_months',
};

async function createFixture(): Promise<{
  sessionService: ExperienceSessionService;
  prospectId: string;
  experienceDefinitionId: string;
}> {
  const database = createDatabase();
  const logger = { info: vi.fn() };

  const definitionRepository = new SqliteExperienceDefinitionRepository(database);
  const prospectRepository = new SqliteProspectRepository(database);
  const sessionRepository = new SqliteExperienceSessionRepository(database);

  const definitionService = new ExperienceDefinitionService(definitionRepository, logger);
  const prospectService = new ProspectService(prospectRepository, logger);
  const sessionService = new ExperienceSessionService(
    sessionRepository,
    prospectRepository,
    definitionRepository,
    logger,
  );

  const definition = await definitionService.create(plumbingDefinition);
  const prospect = await prospectService.upsert(prospectInput);

  return {
    sessionService,
    prospectId: prospect.prospectId,
    experienceDefinitionId: definition.experienceDefinitionId,
  };
}

async function moveSessionToLeadReady(
  sessionService: ExperienceSessionService,
  experienceSessionId: string,
): Promise<void> {
  await sessionService.transitionTo(experienceSessionId, 'CallActive');
  await sessionService.transitionTo(experienceSessionId, 'Processing');
  await sessionService.transitionTo(experienceSessionId, 'LeadReady');
}

describe('ExperienceSessionService', () => {
  it('creates an experience session for a qualified prospect', async () => {
    const { sessionService, prospectId, experienceDefinitionId } = await createFixture();

    const session = await sessionService.create({
      prospectId,
      experienceDefinitionId,
      leadboardDemoSessionId: 'lbds_123',
      leadboardLeadId: 'lead_123',
    });

    expect(session.experienceSessionId).toMatch(/^expsess_/);
    expect(session.state).toBe('WaitingForCall');
    expect(session.leadboardDemoSessionId).toBe('lbds_123');
    expect(session.leadboardLeadId).toBe('lead_123');
  });

  it('enforces one active session per prospect and experience definition', async () => {
    const { sessionService, prospectId, experienceDefinitionId } = await createFixture();

    await sessionService.create({ prospectId, experienceDefinitionId });

    await expect(
      sessionService.create({ prospectId, experienceDefinitionId }),
    ).rejects.toBeInstanceOf(ActiveExperienceSessionAlreadyExistsError);
  });

  it('allows a new session after the previous session expired', async () => {
    const { sessionService, prospectId, experienceDefinitionId } = await createFixture();

    const first = await sessionService.create({ prospectId, experienceDefinitionId });
    await sessionService.markExpired(first.experienceSessionId);

    const second = await sessionService.create({ prospectId, experienceDefinitionId });

    expect(second.experienceSessionId).not.toBe(first.experienceSessionId);
    expect(second.state).toBe('WaitingForCall');
  });

  it('rejects invalid state transitions', async () => {
    const { sessionService, prospectId, experienceDefinitionId } = await createFixture();
    const session = await sessionService.create({ prospectId, experienceDefinitionId });

    await expect(sessionService.transitionTo(session.experienceSessionId, 'Completed')).rejects.toBeInstanceOf(
      InvalidExperienceSessionStateTransitionError,
    );
  });

  it('marks a session completed from LeadReady', async () => {
    const { sessionService, prospectId, experienceDefinitionId } = await createFixture();
    const session = await sessionService.create({ prospectId, experienceDefinitionId });

    await moveSessionToLeadReady(sessionService, session.experienceSessionId);
    const completed = await sessionService.markCompleted(session.experienceSessionId);

    expect(completed.state).toBe('Completed');
    expect(completed.completedAt).not.toBeNull();
    expect(sessionService.isCompletedDemo(completed)).toBe(true);
  });

  it('does not treat an expired session as a completed demo', async () => {
    const { sessionService, prospectId, experienceDefinitionId } = await createFixture();
    const session = await sessionService.create({ prospectId, experienceDefinitionId });
    const expired = await sessionService.markExpired(session.experienceSessionId);

    expect(expired.state).toBe('Expired');
    expect(expired.completedAt).toBeNull();
    expect(sessionService.isCompletedDemo(expired)).toBe(false);
  });

  it('stores LeadBoard references when provided later', async () => {
    const { sessionService, prospectId, experienceDefinitionId } = await createFixture();
    const session = await sessionService.create({ prospectId, experienceDefinitionId });

    const updated = await sessionService.updateLeadboardReferences(session.experienceSessionId, {
      leadboardDemoSessionId: 'lbds_456',
      leadboardLeadId: 'lead_456',
    });

    expect(updated.leadboardDemoSessionId).toBe('lbds_456');
    expect(updated.leadboardLeadId).toBe('lead_456');
  });
});
