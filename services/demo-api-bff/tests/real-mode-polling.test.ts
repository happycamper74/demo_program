import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  activateExperienceDefinition,
  ExperienceDefinitionService,
  SqliteExperienceDefinitionRepository,
} from '@experience-platform/experience-engine/experience-definitions';
import { createDatabase } from '@experience-platform/experience-engine/experience-sessions';
import {
  BindIncomingCallUnsupportedError,
  MockLeadBoardClient,
  RestrictedLeadNotReadyError,
  type BindIncomingCallResponse,
  type CreateDemoSessionMirrorRequest,
  type CreateDemoSessionMirrorResponse,
  type DemoSessionStatusResponse,
  type GetRestrictedLeadViewRequest,
  type LeadBoardClient,
  type PurgeTemporaryDemoDataResponse,
  type RestrictedLeadViewData,
} from '@experience-platform/leadboard-client';
import type { CreateExperienceDefinitionInput } from '@experience-platform/shared-types';
import { createHandleRequest } from '../src/http.js';
import { createDemoApiDependencies } from '../src/infrastructure/dependencies.js';
import { createPermissiveDemoStartGuard } from './test-security-helpers.js';
import type { PresentationEvent, StartDemoRequest } from '../src/types/api.js';

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

class ControllableLeadBoardClient implements LeadBoardClient {
  readonly statuses = new Map<string, DemoSessionStatusResponse>();
  private readonly leadViews = new Map<string, RestrictedLeadViewData | 'not_ready'>();

  setStatus(leadboardDemoSessionId: string, status: DemoSessionStatusResponse): void {
    this.statuses.set(leadboardDemoSessionId, status);
  }

  setLeadView(
    leadboardDemoSessionId: string,
    leadView: RestrictedLeadViewData | 'not_ready',
  ): void {
    this.leadViews.set(leadboardDemoSessionId, leadView);
  }

  getLeadboardDemoSessionId(): string {
    return [...this.statuses.keys()][0]!;
  }

  async createDemoSessionMirror(
    request: CreateDemoSessionMirrorRequest,
  ): Promise<CreateDemoSessionMirrorResponse> {
    const leadboardDemoSessionId = randomUUID();
    this.statuses.set(leadboardDemoSessionId, {
      leadboardDemoSessionId,
      experienceSessionId: request.experienceSessionId,
      status: 'active',
      leadId: null,
      callSid: null,
      processingState: 'waiting_for_call',
    });

    return {
      leadboardDemoSessionId,
      status: 'active',
    };
  }

  async getDemoSessionStatus(leadboardDemoSessionId: string): Promise<DemoSessionStatusResponse> {
    const status = this.statuses.get(leadboardDemoSessionId);
    if (!status) {
      throw new Error(`Missing status for ${leadboardDemoSessionId}`);
    }

    return status;
  }

  async bindIncomingCall(): Promise<BindIncomingCallResponse> {
    throw new BindIncomingCallUnsupportedError();
  }

  async getRestrictedLeadView(
    request: GetRestrictedLeadViewRequest,
  ): Promise<RestrictedLeadViewData> {
    const leadView = this.leadViews.get(request.leadboardDemoSessionId);
    if (leadView === 'not_ready' || !leadView) {
      throw new RestrictedLeadNotReadyError(request.leadId);
    }

    return leadView;
  }

  async purgeTemporaryDemoData(
    leadboardDemoSessionId: string,
  ): Promise<PurgeTemporaryDemoDataResponse> {
    const status = this.statuses.get(leadboardDemoSessionId);
    if (!status) {
      throw new Error(`Missing status for ${leadboardDemoSessionId}`);
    }

    this.statuses.set(leadboardDemoSessionId, {
      ...status,
      status: 'purged',
      processingState: 'purged',
      leadId: null,
      callSid: null,
    });

    return {
      status: 'purged',
      deleted: {
        lead: true,
        transcript: true,
        summary: true,
        timeline: true,
        callRecords: true,
      },
    };
  }
}

function createMockResponse(): ServerResponse & { statusCode?: number; chunks: string[] } {
  const response = {
    statusCode: undefined as number | undefined,
    chunks: [] as string[],
    writeHead(statusCode: number) {
      response.statusCode = statusCode;
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

  return response as ServerResponse & { statusCode?: number; chunks: string[] };
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

async function seedActiveDefinition(databasePath: string): Promise<void> {
  const database = createDatabase({ filePath: databasePath });
  const logger = { info: () => undefined };
  const repository = new SqliteExperienceDefinitionRepository(database);
  const service = new ExperienceDefinitionService(repository, logger);
  const created = await service.create(plumbingDefinition);
  const activated = activateExperienceDefinition(created);
  await repository.update(activated);
}

describe('real mode status polling', () => {
  let databasePath: string;
  let analyticsDatabasePath: string;
  let leadBoardClient: ControllableLeadBoardClient;

  beforeEach(async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'demo-api-real-mode-'));
    databasePath = join(tempDir, `${randomUUID()}.sqlite`);
    analyticsDatabasePath = join(tempDir, `${randomUUID()}-analytics.sqlite`);
    leadBoardClient = new ControllableLeadBoardClient();
    await seedActiveDefinition(databasePath);
  });

  function createRealModeDependencies() {
    return createDemoApiDependencies({
      databasePath,
      analyticsDatabasePath,
      signingSecret: 'real-mode-test-secret',
      demoStartGuard: createPermissiveDemoStartGuard(),
      leadBoardClient,
      leadboardAdapterMode: 'real',
      leadboardSharedDemoOrgId: '00000000-0000-4000-8000-000000000099',
      statusPollIntervalMs: 60_000,
    });
  }

  it('blocks simulate-call in real mode', async () => {
    const deps = createRealModeDependencies();
    const handleRequest = createHandleRequest(deps);
    const startResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('POST', '/api/demo/v1/start', {
        ...validStartRequest,
        email: `simulate-block-${randomUUID()}@example.com`,
      }),
      startResponse,
    );
    const started = JSON.parse(startResponse.chunks.join(''));

    const simulateResponse = createMockResponse();
    await handleRequest(
      createJsonRequest(
        'POST',
        `/api/demo/v1/sessions/${started.experience_session_id}/simulate-call`,
        undefined,
        { authorization: `Bearer ${started.experience_token}` },
      ),
      simulateResponse,
    );

    expect(simulateResponse.statusCode).toBe(403);
    const body = JSON.parse(simulateResponse.chunks.join(''));
    expect(body.error.code).toBe('SIMULATE_CALL_UNAVAILABLE');
    expect(started.simulate_call_available).toBe(false);
  });

  it('emits presentation-safe events when processing state advances', async () => {
    const deps = createRealModeDependencies();
    const handleRequest = createHandleRequest(deps);
    const startResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('POST', '/api/demo/v1/start', {
        ...validStartRequest,
        email: `poll-events-${randomUUID()}@example.com`,
      }),
      startResponse,
    );
    const started = JSON.parse(startResponse.chunks.join(''));
    const leadboardDemoSessionId = leadBoardClient.getLeadboardDemoSessionId();

    const published: PresentationEvent[] = [];
    const unsubscribe = deps.sessionEventStream.subscribe(
      started.experience_session_id,
      (event) => {
        published.push(event);
      },
    );

    leadBoardClient.setStatus(leadboardDemoSessionId, {
      leadboardDemoSessionId,
      experienceSessionId: started.experience_session_id,
      status: 'lead_bound',
      leadId: 'lead_123',
      callSid: 'CA123',
      processingState: 'transcript_stored',
    });

    await deps.realModeStatusPoller!.pollOnceForTests(started.experience_session_id);
    unsubscribe();

    const eventNames = published.map((event) => event.event);
    expect(eventNames).toEqual([
      'call_started',
      'call_completed',
      'processing_started',
      'transcript_ready',
    ]);
    expect(eventNames.some((name) => name.includes('leadboard'))).toBe(false);
  });

  it('does not duplicate events when processing state is unchanged', async () => {
    const deps = createRealModeDependencies();
    const handleRequest = createHandleRequest(deps);
    const startResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('POST', '/api/demo/v1/start', {
        ...validStartRequest,
        email: `no-dup-${randomUUID()}@example.com`,
      }),
      startResponse,
    );
    const started = JSON.parse(startResponse.chunks.join(''));
    const leadboardDemoSessionId = leadBoardClient.getLeadboardDemoSessionId();

    leadBoardClient.setStatus(leadboardDemoSessionId, {
      leadboardDemoSessionId,
      experienceSessionId: started.experience_session_id,
      status: 'lead_bound',
      leadId: 'lead_123',
      callSid: 'CA123',
      processingState: 'summary_ready',
    });

    const poller = deps.realModeStatusPoller!;
    const published: PresentationEvent[] = [];
    const unsubscribe = deps.sessionEventStream.subscribe(
      started.experience_session_id,
      (event) => published.push(event),
    );

    await poller.pollOnceForTests(started.experience_session_id);
    const afterFirst = published.length;
    await poller.pollOnceForTests(started.experience_session_id);
    unsubscribe();

    expect(afterFirst).toBeGreaterThan(0);
    expect(published.length).toBe(afterFirst);
  });

  it('does not fail the session when lead view returns LEAD_NOT_READY', async () => {
    const deps = createRealModeDependencies();
    const handleRequest = createHandleRequest(deps);
    const startResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('POST', '/api/demo/v1/start', {
        ...validStartRequest,
        email: `lead-not-ready-${randomUUID()}@example.com`,
      }),
      startResponse,
    );
    const started = JSON.parse(startResponse.chunks.join(''));
    const leadboardDemoSessionId = leadBoardClient.getLeadboardDemoSessionId();

    leadBoardClient.setStatus(leadboardDemoSessionId, {
      leadboardDemoSessionId,
      experienceSessionId: started.experience_session_id,
      status: 'lead_bound',
      leadId: 'lead_123',
      callSid: 'CA123',
      processingState: 'lead_ready',
    });
    leadBoardClient.setLeadView(leadboardDemoSessionId, 'not_ready');

    await deps.realModeStatusPoller!.pollOnceForTests(started.experience_session_id);

    const leadViewResponse = createMockResponse();
    await handleRequest(
      createJsonRequest(
        'GET',
        `/api/demo/v1/sessions/${started.experience_session_id}/lead-view`,
        undefined,
        { authorization: `Bearer ${started.experience_token}` },
      ),
      leadViewResponse,
    );

    expect(leadViewResponse.statusCode).toBe(409);
    const body = JSON.parse(leadViewResponse.chunks.join(''));
    expect(body.error.code).toBe('LEAD_NOT_READY');

    const statusResponse = createMockResponse();
    await handleRequest(
      createJsonRequest(
        'GET',
        `/api/demo/v1/sessions/${started.experience_session_id}/status`,
        undefined,
        { authorization: `Bearer ${started.experience_token}` },
      ),
      statusResponse,
    );

    expect(statusResponse.statusCode).toBe(200);
  });

  it('stops polling on terminal mirror states', async () => {
    const deps = createRealModeDependencies();
    const handleRequest = createHandleRequest(deps);
    const startResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('POST', '/api/demo/v1/start', {
        ...validStartRequest,
        email: `terminal-${randomUUID()}@example.com`,
      }),
      startResponse,
    );
    const started = JSON.parse(startResponse.chunks.join(''));
    const leadboardDemoSessionId = leadBoardClient.getLeadboardDemoSessionId();
    const poller = deps.realModeStatusPoller!;

    expect(poller.isTracking(started.experience_session_id)).toBe(true);

    leadBoardClient.setStatus(leadboardDemoSessionId, {
      leadboardDemoSessionId,
      experienceSessionId: started.experience_session_id,
      status: 'expired',
      leadId: null,
      callSid: null,
      processingState: 'waiting_for_call',
    });

    await poller.pollOnceForTests(started.experience_session_id);
    expect(poller.isTracking(started.experience_session_id)).toBe(false);
  });

  it('keeps mock mode simulate-call working', async () => {
    const deps = createDemoApiDependencies({
      databasePath,
      analyticsDatabasePath,
      signingSecret: 'mock-mode-test-secret',
      demoStartGuard: createPermissiveDemoStartGuard(),
      leadBoardClient: new MockLeadBoardClient(),
      leadboardAdapterMode: 'mock',
    });
    const handleRequest = createHandleRequest(deps);
    const startResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('POST', '/api/demo/v1/start', {
        ...validStartRequest,
        email: `mock-sim-${randomUUID()}@example.com`,
      }),
      startResponse,
    );
    const started = JSON.parse(startResponse.chunks.join(''));
    expect(started.simulate_call_available).toBe(true);

    const simulateResponse = createMockResponse();
    await handleRequest(
      createJsonRequest(
        'POST',
        `/api/demo/v1/sessions/${started.experience_session_id}/simulate-call`,
        undefined,
        { authorization: `Bearer ${started.experience_token}` },
      ),
      simulateResponse,
    );

    expect(simulateResponse.statusCode).toBe(200);
    const body = JSON.parse(simulateResponse.chunks.join(''));
    expect(body.status).toBe('simulated');
  });
});
