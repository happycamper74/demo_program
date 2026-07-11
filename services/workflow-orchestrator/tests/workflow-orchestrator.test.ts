import { describe, expect, it, vi } from 'vitest';
import {
  SUPPORTED_EXPERIENCE_SESSION_TRANSITION_EVENTS,
  resolveTransitionEventName,
} from '@experience-platform/event-contracts';
import type { CreateExperienceDefinitionInput, UpsertProspectInput } from '@experience-platform/shared-types';
import {
  ExperienceDefinitionService,
  SqliteExperienceDefinitionRepository,
} from '@experience-platform/experience-engine/experience-definitions';
import { ProspectService, SqliteProspectRepository } from '@experience-platform/experience-engine/experience-prospects';
import {
  ExperienceSessionService,
  InvalidExperienceSessionStateTransitionError,
  SqliteExperienceSessionRepository,
  createDatabase,
} from '@experience-platform/experience-engine/experience-sessions';
import { WorkflowOrchestrator } from '../src/application/workflow-orchestrator.js';
import { InMemoryEventPublisher } from '../src/infrastructure/events/in-memory-event-publisher.js';

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
  orchestrator: WorkflowOrchestrator;
  eventPublisher: InMemoryEventPublisher;
  sessionId: string;
}> {
  const database = createDatabase();
  const logger = { info: vi.fn(), warn: vi.fn() };
  const eventPublisher = new InMemoryEventPublisher();

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
  const orchestrator = new WorkflowOrchestrator(sessionRepository, eventPublisher, logger);

  const definition = await definitionService.create(plumbingDefinition);
  const prospect = await prospectService.upsert(prospectInput);
  const session = await sessionService.create({
    prospectId: prospect.prospectId,
    experienceDefinitionId: definition.experienceDefinitionId,
  });

  return {
    orchestrator,
    eventPublisher,
    sessionId: session.experienceSessionId,
  };
}

describe('WorkflowOrchestrator', () => {
  it('persists a successful transition and emits the mapped event', async () => {
    const { orchestrator, eventPublisher, sessionId } = await createFixture();

    const updated = await orchestrator.transition(sessionId, 'CallActive');

    expect(updated.state).toBe('CallActive');
    expect(eventPublisher.getPublishedEvents()).toHaveLength(1);
    expect(eventPublisher.getPublishedEvents()[0]?.eventName).toBe('experience.call_started');
    expect(eventPublisher.getPublishedEvents()[0]?.experienceSessionId).toBe(sessionId);
  });

  it('rejects invalid transitions without emitting success events', async () => {
    const { orchestrator, eventPublisher, sessionId } = await createFixture();

    await expect(orchestrator.transition(sessionId, 'Completed')).rejects.toBeInstanceOf(
      InvalidExperienceSessionStateTransitionError,
    );
    expect(eventPublisher.getPublishedEvents()).toHaveLength(0);
  });

  it('is idempotent when the session is already in the target state', async () => {
    const { orchestrator, eventPublisher, sessionId } = await createFixture();

    await orchestrator.transition(sessionId, 'CallActive');
    const second = await orchestrator.transition(sessionId, 'CallActive');

    expect(second.state).toBe('CallActive');
    expect(eventPublisher.getPublishedEvents()).toHaveLength(1);
  });

  it('reuses idempotency keys for repeated transition requests', async () => {
    const { orchestrator, eventPublisher, sessionId } = await createFixture();

    const first = await orchestrator.transition(sessionId, 'CallActive', {
      idempotencyKey: 'idem-1',
    });
    const second = await orchestrator.transition(sessionId, 'CallActive', {
      idempotencyKey: 'idem-1',
    });

    expect(second).toEqual(first);
    expect(eventPublisher.getPublishedEvents()).toHaveLength(1);
  });

  it('maps every supported transition to the expected event name', () => {
    for (const [transitionKey, eventName] of Object.entries(
      SUPPORTED_EXPERIENCE_SESSION_TRANSITION_EVENTS,
    )) {
      const [fromState, toState] = transitionKey.split(':');
      expect(resolveTransitionEventName(fromState!, toState!, () => true)).toBe(eventName);
    }
  });

  it('enters recovery from an active state and stores the previous state', async () => {
    const { orchestrator, eventPublisher, sessionId } = await createFixture();
    await orchestrator.transition(sessionId, 'CallActive');

    const recovered = await orchestrator.enterRecovery(sessionId);

    expect(recovered.state).toBe('Recovery');
    expect(recovered.recoveryPreviousState).toBe('CallActive');
    expect(eventPublisher.getPublishedEvents().at(-1)?.eventName).toBe('experience.recovery_started');
    expect(eventPublisher.getPublishedEvents().at(-1)?.payload.recovery_deadline).toBeDefined();
  });

  it('treats Purged as terminal', async () => {
    const { orchestrator, sessionId } = await createFixture();

    await orchestrator.transition(sessionId, 'CallActive');
    await orchestrator.transition(sessionId, 'Processing');
    await orchestrator.transition(sessionId, 'LeadReady');
    await orchestrator.transition(sessionId, 'Completed');
    await orchestrator.transition(sessionId, 'Purged');

    await expect(orchestrator.transition(sessionId, 'Completed')).rejects.toBeInstanceOf(
      InvalidExperienceSessionStateTransitionError,
    );
  });
});
