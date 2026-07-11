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
import { createDatabase, SqliteExperienceSessionRepository } from '@experience-platform/experience-engine/experience-sessions';
import { MockLeadBoardClient } from '@experience-platform/leadboard-client';
import type { CreateExperienceDefinitionInput } from '@experience-platform/shared-types';
import { createHandleRequest } from '../src/http.js';
import { createDemoApiDependencies } from '../src/infrastructure/dependencies.js';
import { getDefaultOpsToken } from '../src/infrastructure/ops-auth.js';
import { createPermissiveDemoStartGuard } from './test-security-helpers.js';
import type { StartDemoRequest } from '../src/types/api.js';

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

function createMockResponse(): ServerResponse & { statusCode?: number; chunks: string[] } {
  const response = {
    statusCode: undefined as number | undefined,
    chunks: [] as string[],
    writeHead(statusCode: number, headers?: Record<string, string | string[] | undefined>) {
      response.statusCode = statusCode;
      void headers;
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
  const repository = new SqliteExperienceDefinitionRepository(database);
  const service = new ExperienceDefinitionService(repository, { info: () => undefined });
  const created = await service.create(plumbingDefinition);
  await repository.update(activateExperienceDefinition(created));
}

function buildStartRequest(overrides: Partial<StartDemoRequest> = {}): StartDemoRequest {
  return {
    full_name: 'E2E User',
    business_name: 'E2E Plumbing',
    email: `e2e-${randomUUID()}@example.com`,
    business_market: 'NL',
    phone_number: `+31612${Math.floor(Math.random() * 1_000_000)}`,
    industry: 'plumbing',
    business_location: 'Amsterdam',
    company_size: '2-5',
    website: 'https://example.com',
    biggest_challenge: 'never_miss_calls',
    implementation_timeframe: 'within_3_months',
    experience_definition_id: 'expdef_plumbing_demo_v1',
    ...overrides,
  };
}

describe('mock MVP end-to-end journey', () => {
  let handleRequest: ReturnType<typeof createHandleRequest>;
  let deps: ReturnType<typeof createDemoApiDependencies>;
  let databasePath: string;
  const opsHeaders = { 'x-ops-internal-token': getDefaultOpsToken() };

  beforeEach(async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'demo-api-bff-e2e-'));
    databasePath = join(tempDir, `${randomUUID()}.sqlite`);
    const analyticsDatabasePath = join(tempDir, `${randomUUID()}-analytics.sqlite`);
    await seedActiveDefinition(databasePath);
    deps = createDemoApiDependencies({
      databasePath,
      analyticsDatabasePath,
      signingSecret: 'demo-api-bff-test-secret',
      demoStartGuard: createPermissiveDemoStartGuard(),
    });
    handleRequest = createHandleRequest(deps);
  });

  it('completes the supported industry mock journey with analytics recorded', async () => {
    const startResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('POST', '/api/demo/v1/start', buildStartRequest()),
      startResponse,
    );
    const started = JSON.parse(startResponse.chunks.join(''));
    expect(startResponse.statusCode).toBe(200);

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
    expect(leadViewResponse.statusCode).toBe(200);

    const slotsResponse = createMockResponse();
    await handleRequest(createJsonRequest('GET', '/api/demo/v1/discovery-slots'), slotsResponse);
    const slots = JSON.parse(slotsResponse.chunks.join(''));

    const bookResponse = createMockResponse();
    await handleRequest(
      createJsonRequest(
        'POST',
        `/api/demo/v1/sessions/${started.experience_session_id}/book-discovery`,
        {
          selected_slot_id: slots.slots[0].slot_id,
          timezone: 'Europe/Amsterdam',
        },
        { authorization: `Bearer ${started.experience_token}` },
      ),
      bookResponse,
    );
    expect(bookResponse.statusCode).toBe(200);

    const funnelResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('GET', '/api/ops/v1/reports/funnel', undefined, opsHeaders),
      funnelResponse,
    );
    const funnel = JSON.parse(funnelResponse.chunks.join(''));
    expect(funnel.stages.find((stage: { stage: string }) => stage.stage === 'demo.started')?.count).toBeGreaterThan(
      0,
    );
    expect(
      funnel.stages.find((stage: { stage: string }) => stage.stage === 'discovery.booked')?.count,
    ).toBeGreaterThan(0);
  });

  it('supports unsupported industry demo start', async () => {
    const response = createMockResponse();
    await handleRequest(
      createJsonRequest(
        'POST',
        '/api/demo/v1/start',
        buildStartRequest({ industry: 'electrical' }),
      ),
      response,
    );

    const body = JSON.parse(response.chunks.join(''));
    expect(response.statusCode).toBe(200);
    expect(body.industry_supported).toBe(false);
    expect(body.industry_notice).toBeDefined();
  });

  it('supports recovery and blocks cross-session access', async () => {
    const firstStart = createMockResponse();
    await handleRequest(createJsonRequest('POST', '/api/demo/v1/start', buildStartRequest()), firstStart);
    const first = JSON.parse(firstStart.chunks.join(''));

    const secondStart = createMockResponse();
    await handleRequest(createJsonRequest('POST', '/api/demo/v1/start', buildStartRequest()), secondStart);
    const second = JSON.parse(secondStart.chunks.join(''));

    await deps.workflowOrchestrator.transition(first.experience_session_id, 'CallActive');
    await deps.workflowOrchestrator.transition(first.experience_session_id, 'Processing');
    await deps.workflowOrchestrator.transition(first.experience_session_id, 'LeadReady');
    await deps.workflowOrchestrator.enterRecovery(first.experience_session_id);

    const recoveryToken = await deps.experienceTokenService.createToken({
      experienceSessionId: first.experience_session_id,
      experienceDefinitionId: 'expdef_plumbing_demo_v1',
      prospectId: first.prospect_id,
      permissions: ['experience:view', 'experience:recover'],
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const recoverResponse = createMockResponse();
    await handleRequest(
      createJsonRequest(
        'POST',
        `/api/demo/v1/sessions/${first.experience_session_id}/recover`,
        { recovery_token: recoveryToken },
      ),
      recoverResponse,
    );
    expect(recoverResponse.statusCode).toBe(200);

    const crossSessionResponse = createMockResponse();
    await handleRequest(
      createJsonRequest(
        'GET',
        `/api/demo/v1/sessions/${second.experience_session_id}/status`,
        undefined,
        { authorization: `Bearer ${first.experience_token}` },
      ),
      crossSessionResponse,
    );
    expect(crossSessionResponse.statusCode).toBe(403);
  });

  it('purges mock leadboard artifacts after lead processing', async () => {
    const startResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('POST', '/api/demo/v1/start', buildStartRequest()),
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

    const sessionRepository = new SqliteExperienceSessionRepository(
      createDatabase({ filePath: databasePath }),
    );
    const session = await sessionRepository.findById(started.experience_session_id);
    const leadboardClient = deps.demoService.getLeadBoardClient() as MockLeadBoardClient;
    const purgeResult = await leadboardClient.purgeTemporaryDemoData(
      session?.leadboardDemoSessionId ?? '',
    );

    expect(purgeResult.status).toBe('purged');
    await expect(
      leadboardClient.getRestrictedLeadView({
        experienceSessionId: started.experience_session_id,
        leadboardDemoSessionId: session?.leadboardDemoSessionId ?? '',
        leadId: session?.leadboardLeadId ?? '',
      }),
    ).rejects.toThrow();
  });
});
