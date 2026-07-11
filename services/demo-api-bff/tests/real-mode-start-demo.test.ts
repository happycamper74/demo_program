import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activateExperienceDefinition,
  ExperienceDefinitionService,
  SqliteExperienceDefinitionRepository,
} from '@experience-platform/experience-engine/experience-definitions';
import { createDatabase } from '@experience-platform/experience-engine/experience-sessions';
import {
  LeadBoardConfigurationError,
  RealLeadBoardClient,
  loadLeadBoardClientConfigFromEnv,
} from '@experience-platform/leadboard-client';
import type { CreateExperienceDefinitionInput } from '@experience-platform/shared-types';
import { createHandleRequest } from '../src/http.js';
import { createDemoApiDependencies } from '../src/infrastructure/dependencies.js';
import { createPermissiveDemoStartGuard } from './test-security-helpers.js';
import type { StartDemoRequest } from '../src/types/api.js';

const SHARED_DEMO_ORG_ID = '00000000-0000-4000-8000-000000000099';
const REAL_DEMO_PHONE_NUMBER = '+3197010225604';

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
  full_name: 'Charles Test',
  business_name: 'Test Plumbing Company',
  email: 'charles.fresh.2001@example.com',
  phone_number: '+31610002001',
  industry: 'plumbing',
  business_location: 'Amsterdam, Netherlands',
  company_size: '2-5',
  no_website: true,
  biggest_challenge: 'never_miss_calls',
  implementation_timeframe: 'within_3_months',
  experience_definition_id: 'expdef_plumbing_demo_v1',
  company_website_url: '',
  challenge_completed: false,
};

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
): IncomingMessage {
  const payload = body === undefined ? '' : JSON.stringify(body);
  return {
    method,
    url,
    headers: {
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(payload)),
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

describe('real mode start demo', () => {
  let databasePath: string;
  let analyticsDatabasePath: string;

  beforeEach(async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'demo-api-real-start-'));
    databasePath = join(tempDir, `${randomUUID()}.sqlite`);
    analyticsDatabasePath = join(tempDir, `${randomUUID()}-analytics.sqlite`);
    await seedActiveDefinition(databasePath);
  });

  it('requires LEADBOARD_SHARED_DEMO_ORG_ID to be a UUID in real mode', () => {
    expect(() =>
      loadLeadBoardClientConfigFromEnv({
        LEADBOARD_ADAPTER_MODE: 'real',
        LEADBOARD_BASE_URL: 'http://localhost:3000',
        LEADBOARD_INTERNAL_API_KEY: 'local-demo-secret',
      }),
    ).toThrow(LeadBoardConfigurationError);
  });

  it('prefers LeadBoard shared_demo_phone_number over configured fallback in real mode', async () => {
    let mirrorRequestBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/internal/leadboard-demo/v1/sessions') && init?.method === 'POST') {
        mirrorRequestBody = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({
            leadboard_demo_session_id: '11111111-1111-4111-8111-111111111111',
            status: 'active',
            shared_demo_phone_number: REAL_DEMO_PHONE_NUMBER,
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      }

      throw new Error(`Unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
    }) as typeof fetch;

    const leadBoardClient = new RealLeadBoardClient({
      baseUrl: 'http://localhost:3000',
      internalApiKey: 'local-demo-secret',
      fetch: fetchMock,
    });

    const deps = createDemoApiDependencies({
      databasePath,
      analyticsDatabasePath,
      signingSecret: 'real-mode-start-secret',
      demoStartGuard: createPermissiveDemoStartGuard(),
      leadBoardClient,
      leadboardAdapterMode: 'real',
      leadboardSharedDemoOrgId: SHARED_DEMO_ORG_ID,
      leadboardSharedDemoPhoneNumber: '+31201234567',
      statusPollIntervalMs: 60_000,
    });
    const handleRequest = createHandleRequest(deps);
    const response = createMockResponse();

    await handleRequest(
      createJsonRequest('POST', '/api/demo/v1/start', {
        ...validStartRequest,
        email: `real-start-${randomUUID()}@example.com`,
        phone_number: `+3161${String(Date.now()).slice(-8)}`,
      }),
      response,
    );

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.chunks.join(''));
    expect(body.shared_demo_phone_number).toBe(REAL_DEMO_PHONE_NUMBER);
    expect(body.shared_demo_phone_number).not.toBe('+31201234567');
    expect(mirrorRequestBody).toBeDefined();
    expect(mirrorRequestBody?.shared_demo_org_id).toBe(SHARED_DEMO_ORG_ID);
    expect(mirrorRequestBody?.shared_demo_org_id).not.toBe('org_demo_shared');
  });

  it('uses configured fallback phone when LeadBoard omits shared_demo_phone_number', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/internal/leadboard-demo/v1/sessions') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            leadboard_demo_session_id: '22222222-2222-4222-8222-222222222222',
            status: 'active',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      }

      throw new Error(`Unexpected fetch: ${init?.method ?? 'GET'} ${url}`);
    }) as typeof fetch;

    const leadBoardClient = new RealLeadBoardClient({
      baseUrl: 'http://localhost:3000',
      internalApiKey: 'local-demo-secret',
      fetch: fetchMock,
    });

    const deps = createDemoApiDependencies({
      databasePath,
      analyticsDatabasePath,
      signingSecret: 'real-mode-start-secret',
      demoStartGuard: createPermissiveDemoStartGuard(),
      leadBoardClient,
      leadboardAdapterMode: 'real',
      leadboardSharedDemoOrgId: SHARED_DEMO_ORG_ID,
      leadboardSharedDemoPhoneNumber: REAL_DEMO_PHONE_NUMBER,
      statusPollIntervalMs: 60_000,
    });
    const handleRequest = createHandleRequest(deps);
    const response = createMockResponse();

    await handleRequest(
      createJsonRequest('POST', '/api/demo/v1/start', {
        ...validStartRequest,
        email: `real-fallback-${randomUUID()}@example.com`,
        phone_number: `+3161${String(Date.now()).slice(-8)}`,
      }),
      response,
    );

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.chunks.join(''));
    expect(body.shared_demo_phone_number).toBe(REAL_DEMO_PHONE_NUMBER);
  });
});
