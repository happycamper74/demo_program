import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ExperienceDefinitionService,
  SqliteExperienceDefinitionRepository,
  activateExperienceDefinition,
} from '@experience-platform/experience-engine/experience-definitions';
import { ProspectService, SqliteProspectRepository } from '@experience-platform/experience-engine/experience-prospects';
import {
  ExperienceSessionService,
  SqliteExperienceSessionRepository,
  createDatabase,
} from '@experience-platform/experience-engine/experience-sessions';
import { MockLeadBoardClient } from '@experience-platform/leadboard-client';
import type { CreateExperienceDefinitionInput } from '@experience-platform/shared-types';
import { createHandleRequest } from '../src/http.js';
import { createDemoApiDependencies } from '../src/infrastructure/dependencies.js';
import { createPermissiveDemoStartGuard } from './test-security-helpers.js';
import type { StartDemoRequest } from '../src/types/api.js';

const plumbingDefinition: CreateExperienceDefinitionInput = {
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

const validStartRequest: StartDemoRequest = {
  full_name: 'John Smith',
  business_name: "Joe's Plumbing",
  email: 'john@example.com',
  business_market: 'NL',
  phone_number: '+31612345678',
  industry: 'plumbing',
  business_location: 'Amsterdam, Netherlands',
  company_size: '2-5',
  website: 'https://joesplumbing.nl',
  biggest_challenge: 'never_miss_calls',
  implementation_timeframe: 'within_3_months',
  experience_definition_id: 'expdef_plumbing_demo_v1',
};

function createMockResponse(): ServerResponse & {
  statusCode?: number;
  headers?: Record<string, string | string[] | undefined>;
  chunks: string[];
} {
  const response = {
    statusCode: undefined as number | undefined,
    headers: {} as Record<string, string | string[] | undefined>,
    chunks: [] as string[],
    writeHead(statusCode: number, headers?: Record<string, string | string[] | undefined>) {
      response.statusCode = statusCode;
      if (headers) {
        response.headers = headers;
      }
    },
    write(chunk: string) {
      response.chunks.push(chunk);
      return true;
    },
    end(body?: string) {
      if (body) {
        response.chunks.push(body);
      }
    },
    on() {
      return response;
    },
  };

  return response as ServerResponse & {
    statusCode?: number;
    headers?: Record<string, string | string[] | undefined>;
    chunks: string[];
  };
}

function createJsonRequest(
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
): IncomingMessage {
  const payload = body === undefined ? '' : JSON.stringify(body);
  return {
    method,
    url,
    headers: {
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(payload)),
      ...headers,
    },
    socket: { remoteAddress: '127.0.0.1' },
    async *[Symbol.asyncIterator]() {
      if (payload.length > 0) {
        yield payload;
      }
    },
  } as IncomingMessage;
}

async function seedActiveDefinition(databasePath: string): Promise<string> {
  const database = createDatabase({ filePath: databasePath });
  const logger = { info: () => undefined };
  const repository = new SqliteExperienceDefinitionRepository(database);
  const service = new ExperienceDefinitionService(repository, logger);
  const created = await service.create(plumbingDefinition);
  const activated = activateExperienceDefinition(created);
  await repository.update(activated);
  return activated.experienceDefinitionId;
}

describe('demo-api-bff demo routes', () => {
  let databasePath: string;
  let handleRequest: ReturnType<typeof createHandleRequest>;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'demo-api-bff-'));
    databasePath = join(tempDir, `${randomUUID()}.sqlite`);
    await seedActiveDefinition(databasePath);
    handleRequest = createHandleRequest(
      createDemoApiDependencies({
        databasePath,
        signingSecret: 'demo-api-bff-test-secret',
        demoStartGuard: createPermissiveDemoStartGuard(),
      }),
    );
  });

  afterEach(() => {
    // temp directory cleaned up by OS
  });

  it('starts a demo on the happy path', async () => {
    const request = createJsonRequest('POST', '/api/demo/v1/start', {
      ...validStartRequest,
      experience_definition_id: 'expdef_plumbing_demo_v1',
    });
    const response = createMockResponse();

    await handleRequest(request, response);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.chunks.join(''));
    expect(body.status).toBe('started');
    expect(body.industry_supported).toBe(true);
    expect(body.shared_demo_phone_number).toBe('+31201234567');
    expect(body.experience_token).toBeTypeOf('string');
    expect(body.instructions?.scenario_examples).toHaveLength(4);
    expect(body).not.toHaveProperty('leadboard_demo_session_id');
  });

  it('returns unsupported industry notice but still starts the demo', async () => {
    const request = createJsonRequest('POST', '/api/demo/v1/start', {
      ...validStartRequest,
      industry: 'electrical',
      experience_definition_id: 'expdef_plumbing_demo_v1',
    });
    const response = createMockResponse();

    await handleRequest(request, response);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.chunks.join(''));
    expect(body.industry_supported).toBe(false);
    expect(body.industry_notice?.title).toContain('plumbing');
    expect(body.status).toBe('started');
  });

  it('rejects unknown business market values', async () => {
    const request = createJsonRequest('POST', '/api/demo/v1/start', {
      ...validStartRequest,
      business_market: 'UK',
      experience_definition_id: 'expdef_plumbing_demo_v1',
    });
    const response = createMockResponse();

    await handleRequest(request, response);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.chunks.join(''));
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects supported markets without phone numbers', async () => {
    const request = createJsonRequest('POST', '/api/demo/v1/start', {
      ...validStartRequest,
      phone_number: '',
      experience_definition_id: 'expdef_plumbing_demo_v1',
    });
    const response = createMockResponse();

    await handleRequest(request, response);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.chunks.join('')).error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects OTHER market without country_name', async () => {
    const request = createJsonRequest('POST', '/api/demo/v1/start', {
      ...validStartRequest,
      business_market: 'OTHER',
      phone_number: undefined,
      experience_definition_id: 'expdef_plumbing_demo_v1',
    });
    const response = createMockResponse();

    await handleRequest(request, response);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.chunks.join('')).error.code).toBe('VALIDATION_FAILED');
  });

  it('ignores stale phone_number when validating OTHER market shape', async () => {
    const request = createJsonRequest('POST', '/api/demo/v1/start', {
      ...validStartRequest,
      business_market: 'OTHER',
      country_name: 'Canada',
      phone_number: '+31646275553',
      experience_definition_id: 'expdef_plumbing_demo_v1',
    });
    const response = createMockResponse();

    await handleRequest(request, response);

    expect(response.statusCode).not.toBe(400);
    const body = JSON.parse(response.chunks.join(''));
    expect(body.error?.code).not.toBe('VALIDATION_FAILED');
  });

  it('stores normalized E.164 phone and business_market for NL submissions', async () => {
    const email = `e164-${randomUUID()}@example.com`;
    const request = createJsonRequest('POST', '/api/demo/v1/start', {
      ...validStartRequest,
      email,
      phone_number: '0646275553',
      experience_definition_id: 'expdef_plumbing_demo_v1',
    });
    const response = createMockResponse();

    await handleRequest(request, response);

    expect(response.statusCode).toBe(200);

    const database = createDatabase({ filePath: databasePath });
    const prospectRepository = new SqliteProspectRepository(database);
    const prospect = await prospectRepository.findByEmail(email);

    expect(prospect?.phoneNumber).toBe('+31646275553');
    expect(prospect?.businessMarket).toBe('NL');
  });

  it('updates matched prospects with the newest E.164 phone and business market', async () => {
    const email = `match-${randomUUID()}@example.com`;
    const database = createDatabase({ filePath: databasePath });
    const prospectRepository = new SqliteProspectRepository(database);
    const prospectService = new ProspectService(prospectRepository, { info: () => undefined });

    await prospectService.upsert({
      fullName: validStartRequest.full_name,
      businessName: validStartRequest.business_name,
      email,
      phoneNumber: '+31600000000',
      industry: validStartRequest.industry,
      businessLocation: validStartRequest.business_location,
      companySize: validStartRequest.company_size,
      website: validStartRequest.website ?? null,
      biggestChallenge: validStartRequest.biggest_challenge,
      implementationTimeframe: validStartRequest.implementation_timeframe,
      businessMarket: 'NL',
    });

    const request = createJsonRequest('POST', '/api/demo/v1/start', {
      ...validStartRequest,
      email,
      business_market: 'US',
      phone_number: '(415) 555-2671',
      experience_definition_id: 'expdef_plumbing_demo_v1',
    });
    const response = createMockResponse();

    await handleRequest(request, response);

    expect(response.statusCode).toBe(200);

    const updated = await prospectRepository.findByEmail(email);
    expect(updated?.phoneNumber).toBe('+14155552671');
    expect(updated?.businessMarket).toBe('US');
  });

  it('rejects invalid start demo requests', async () => {
    const request = createJsonRequest('POST', '/api/demo/v1/start', {
      ...validStartRequest,
      email: '',
      experience_definition_id: 'expdef_plumbing_demo_v1',
    });
    const response = createMockResponse();

    await handleRequest(request, response);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.chunks.join(''));
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.request_id).toBeTypeOf('string');
  });

  it('returns session status without internal LeadBoard details', async () => {
    const startRequest = createJsonRequest('POST', '/api/demo/v1/start', {
      ...validStartRequest,
      experience_definition_id: 'expdef_plumbing_demo_v1',
    });
    const startResponse = createMockResponse();
    await handleRequest(startRequest, startResponse);
    const started = JSON.parse(startResponse.chunks.join(''));

    const statusRequest = createJsonRequest(
      'GET',
      `/api/demo/v1/sessions/${started.experience_session_id}/status`,
      undefined,
      { authorization: `Bearer ${started.experience_token}` },
    );
    const statusResponse = createMockResponse();
    await handleRequest(statusRequest, statusResponse);

    expect(statusResponse.statusCode).toBe(200);
    const body = JSON.parse(statusResponse.chunks.join(''));
    expect(body.state).toBe('waiting_for_call');
    expect(body.current_step).toBe('waiting_for_call');
    expect(body.recovery_available).toBe(false);
    expect(body).not.toHaveProperty('leadboard_demo_session_id');
    expect(body).not.toHaveProperty('leadboard_lead_id');
  });

  it('recovers a session within the recovery window', async () => {
    const database = createDatabase({ filePath: databasePath });
    const logger = { info: () => undefined, warn: () => undefined };
    const definitionRepository = new SqliteExperienceDefinitionRepository(database);
    const prospectRepository = new SqliteProspectRepository(database);
    const sessionRepository = new SqliteExperienceSessionRepository(database);
    const sessionService = new ExperienceSessionService(
      sessionRepository,
      prospectRepository,
      definitionRepository,
      logger,
    );
    const prospectService = new ProspectService(prospectRepository, logger);
    const prospect = await prospectService.upsert({
      fullName: validStartRequest.full_name,
      businessName: validStartRequest.business_name,
      email: `recover-${randomUUID()}@example.com`,
      phoneNumber: validStartRequest.phone_number,
      industry: validStartRequest.industry,
      businessLocation: validStartRequest.business_location,
      companySize: validStartRequest.company_size,
      website: validStartRequest.website ?? null,
      biggestChallenge: validStartRequest.biggest_challenge,
      implementationTimeframe: validStartRequest.implementation_timeframe,
    });
    const session = await sessionService.create({
      prospectId: prospect.prospectId,
      experienceDefinitionId: 'expdef_plumbing_demo_v1',
    });
    await sessionService.transitionTo(session.experienceSessionId, 'CallActive');
    await sessionService.transitionTo(session.experienceSessionId, 'Processing');
    await sessionService.transitionTo(session.experienceSessionId, 'LeadReady');

    const deps = createDemoApiDependencies({
      databasePath,
      signingSecret: 'demo-api-bff-test-secret',
      demoStartGuard: createPermissiveDemoStartGuard(),
    });
    const recoverableHandleRequest = createHandleRequest(deps);
    await deps.workflowOrchestrator.enterRecovery(session.experienceSessionId);

    const token = await deps.experienceTokenService.createToken({
      experienceSessionId: session.experienceSessionId,
      experienceDefinitionId: session.experienceDefinitionId,
      prospectId: session.prospectId,
      permissions: ['experience:view', 'experience:recover'],
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const recoverRequest = createJsonRequest(
      'POST',
      `/api/demo/v1/sessions/${session.experienceSessionId}/recover`,
      { recovery_token: token },
    );
    const recoverResponse = createMockResponse();
    await recoverableHandleRequest(recoverRequest, recoverResponse);

    expect(recoverResponse.statusCode).toBe(200);
    const body = JSON.parse(recoverResponse.chunks.join(''));
    expect(body.status).toBe('recovered');
    expect(body.state).toBe('lead_ready');
    expect(body.experience_token).toBeTypeOf('string');
  });

  it('rejects recovery after the recovery window expires', async () => {
    const database = createDatabase({ filePath: databasePath });
    const logger = { info: () => undefined, warn: () => undefined };
    const definitionRepository = new SqliteExperienceDefinitionRepository(database);
    const prospectRepository = new SqliteProspectRepository(database);
    const sessionRepository = new SqliteExperienceSessionRepository(database);
    const sessionService = new ExperienceSessionService(
      sessionRepository,
      prospectRepository,
      definitionRepository,
      logger,
    );
    const prospectService = new ProspectService(prospectRepository, logger);
    const prospect = await prospectService.upsert({
      fullName: validStartRequest.full_name,
      businessName: validStartRequest.business_name,
      email: `expired-${randomUUID()}@example.com`,
      phoneNumber: '+31699999999',
      industry: validStartRequest.industry,
      businessLocation: validStartRequest.business_location,
      companySize: validStartRequest.company_size,
      website: validStartRequest.website ?? null,
      biggestChallenge: validStartRequest.biggest_challenge,
      implementationTimeframe: validStartRequest.implementation_timeframe,
    });
    const session = await sessionService.create({
      prospectId: prospect.prospectId,
      experienceDefinitionId: 'expdef_plumbing_demo_v1',
    });
    await sessionService.transitionTo(session.experienceSessionId, 'CallActive');
    const deps = createDemoApiDependencies({
      databasePath,
      signingSecret: 'demo-api-bff-test-secret',
      demoStartGuard: createPermissiveDemoStartGuard(),
    });
    const recoverableHandleRequest = createHandleRequest(deps);
    const expiredRecoveryTime = new Date(Date.now() - 10 * 60 * 1000);
    await deps.workflowOrchestrator.enterRecovery(session.experienceSessionId, {
      now: expiredRecoveryTime,
    });

    const token = await deps.experienceTokenService.createToken({
      experienceSessionId: session.experienceSessionId,
      experienceDefinitionId: session.experienceDefinitionId,
      prospectId: session.prospectId,
      permissions: ['experience:view', 'experience:recover'],
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const recoverRequest = createJsonRequest(
      'POST',
      `/api/demo/v1/sessions/${session.experienceSessionId}/recover`,
      { recovery_token: token },
    );
    const recoverResponse = createMockResponse();
    await recoverableHandleRequest(recoverRequest, recoverResponse);

    expect(recoverResponse.statusCode).toBe(409);
    const body = JSON.parse(recoverResponse.chunks.join(''));
    expect(body.error.code).toBe('SESSION_NOT_RECOVERABLE');
  });

  it('returns demo already completed for prospects who finished the demo', async () => {
    const completedEmail = `completed-${randomUUID()}@example.com`;
    const startRequest = createJsonRequest('POST', '/api/demo/v1/start', {
      ...validStartRequest,
      email: completedEmail,
      experience_definition_id: 'expdef_plumbing_demo_v1',
    });
    const startResponse = createMockResponse();
    await handleRequest(startRequest, startResponse);
    const started = JSON.parse(startResponse.chunks.join(''));

    const database = createDatabase({ filePath: databasePath });
    const logger = { info: () => undefined };
    const sessionRepository = new SqliteExperienceSessionRepository(database);
    const sessionService = new ExperienceSessionService(
      sessionRepository,
      new SqliteProspectRepository(database),
      new SqliteExperienceDefinitionRepository(database),
      logger,
    );
    await sessionService.transitionTo(started.experience_session_id, 'CallActive');
    await sessionService.transitionTo(started.experience_session_id, 'Processing');
    await sessionService.transitionTo(started.experience_session_id, 'LeadReady');
    await sessionService.markCompleted(started.experience_session_id);

    const retryRequest = createJsonRequest('POST', '/api/demo/v1/start', {
      ...validStartRequest,
      email: completedEmail,
      experience_definition_id: 'expdef_plumbing_demo_v1',
    });
    const retryResponse = createMockResponse();
    await handleRequest(retryRequest, retryResponse);

    expect(retryResponse.statusCode).toBe(409);
    const body = JSON.parse(retryResponse.chunks.join(''));
    expect(body.error.code).toBe('DEMO_ALREADY_COMPLETED');
    expect(body.error.action).toBe('book_discovery');
  });

  it('streams presentation-safe SSE events only', async () => {
    const startRequest = createJsonRequest('POST', '/api/demo/v1/start', {
      ...validStartRequest,
      email: `sse-${randomUUID()}@example.com`,
      experience_definition_id: 'expdef_plumbing_demo_v1',
    });
    const startResponse = createMockResponse();
    await handleRequest(startRequest, startResponse);
    const started = JSON.parse(startResponse.chunks.join(''));

    const eventsRequest = createJsonRequest(
      'GET',
      `/api/demo/v1/sessions/${started.experience_session_id}/events`,
      undefined,
      { authorization: `Bearer ${started.experience_token}` },
    );
    const eventsResponse = createMockResponse();
    await handleRequest(eventsRequest, eventsResponse);

    expect(eventsResponse.statusCode).toBe(200);
    expect(eventsResponse.headers?.['Content-Type']).toBe('text/event-stream');
    const stream = eventsResponse.chunks.join('');
    expect(stream).toContain('event: session_started');
    expect(stream).toContain('event: waiting_for_call');
    expect(stream).not.toContain('leadboard.');
    expect(stream).not.toContain('experience.');
    expect(stream).not.toContain('operations.');
  });

  it('uses MockLeadBoardClient through the BFF dependency wiring', () => {
    const deps = createDemoApiDependencies({
      databasePath,
      signingSecret: 'demo-api-bff-test-secret',
      demoStartGuard: createPermissiveDemoStartGuard(),
    });
    expect(deps.demoService.getLeadBoardClient()).toBeInstanceOf(MockLeadBoardClient);
  });

  it('returns suggested discovery slots and supports show more times', async () => {
    const slotsRequest = createJsonRequest('GET', '/api/demo/v1/discovery-slots');
    const slotsResponse = createMockResponse();
    await handleRequest(slotsRequest, slotsResponse);

    expect(slotsResponse.statusCode).toBe(200);
    const firstPage = JSON.parse(slotsResponse.chunks.join(''));
    expect(firstPage.slots.length).toBeGreaterThan(0);
    expect(firstPage.next_cursor).toBeTruthy();

    const moreRequest = createJsonRequest(
      'GET',
      `/api/demo/v1/discovery-slots?cursor=${firstPage.next_cursor}`,
    );
    const moreResponse = createMockResponse();
    await handleRequest(moreRequest, moreResponse);
    const secondPage = JSON.parse(moreResponse.chunks.join(''));
    expect(secondPage.slots[0]?.slot_id).not.toBe(firstPage.slots[0]?.slot_id);
  });

  it('simulates an incoming call and books a discovery session', async () => {
    const startRequest = createJsonRequest('POST', '/api/demo/v1/start', {
      ...validStartRequest,
      email: `booking-${randomUUID()}@example.com`,
      experience_definition_id: 'expdef_plumbing_demo_v1',
    });
    const startResponse = createMockResponse();
    await handleRequest(startRequest, startResponse);
    const started = JSON.parse(startResponse.chunks.join(''));

    const simulateRequest = createJsonRequest(
      'POST',
      `/api/demo/v1/sessions/${started.experience_session_id}/simulate-call`,
      undefined,
      { authorization: `Bearer ${started.experience_token}` },
    );
    const simulateResponse = createMockResponse();
    await handleRequest(simulateRequest, simulateResponse);
    expect(simulateResponse.statusCode).toBe(200);
    const simulated = JSON.parse(simulateResponse.chunks.join(''));
    expect(simulated.state).toBe('lead_ready');

    const slotsRequest = createJsonRequest('GET', '/api/demo/v1/discovery-slots');
    const slotsResponse = createMockResponse();
    await handleRequest(slotsRequest, slotsResponse);
    const slots = JSON.parse(slotsResponse.chunks.join(''));

    const bookRequest = createJsonRequest(
      'POST',
      `/api/demo/v1/sessions/${started.experience_session_id}/book-discovery`,
      {
        selected_slot_id: slots.slots[0].slot_id,
        timezone: 'Europe/Amsterdam',
      },
      { authorization: `Bearer ${started.experience_token}` },
    );
    const bookResponse = createMockResponse();
    await handleRequest(bookRequest, bookResponse);

    expect(bookResponse.statusCode).toBe(200);
    const booked = JSON.parse(bookResponse.chunks.join(''));
    expect(booked.status).toBe('booked');
    expect(booked.confirmation.email_sent).toBe(true);
    expect(booked.confirmation.sms_sent).toBe(true);
  });
});
