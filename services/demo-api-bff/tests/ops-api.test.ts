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
import type { CreateExperienceDefinitionInput } from '@experience-platform/shared-types';
import { createHandleRequest } from '../src/http.js';
import { createDemoApiDependencies } from '../src/infrastructure/dependencies.js';
import { getDefaultOpsToken } from '../src/infrastructure/ops-auth.js';
import { createPermissiveDemoStartGuard } from './test-security-helpers.js';

const plumbingDefinition: CreateExperienceDefinitionInput = {
  name: 'Plumbing Demo',
  slug: 'plumbing_demo',
  version: 'v1',
  industry: 'plumbing',
  estimatedDurationSeconds: 180,
  maximumCallDurationSeconds: 900,
  scenario: {
    examples: ['Blocked kitchen sink'],
  },
  aiAgentIdentifier: 'retell_plumbing_v1',
};

function createMockResponse(): ServerResponse & {
  statusCode?: number;
  chunks: string[];
} {
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
  const repository = new SqliteExperienceDefinitionRepository(database);
  const service = new ExperienceDefinitionService(repository, { info: () => undefined });
  const created = await service.create(plumbingDefinition);
  await repository.update(activateExperienceDefinition(created));
}

describe('demo-api-bff operations routes', () => {
  let handleRequest: ReturnType<typeof createHandleRequest>;
  const opsHeaders = { 'x-ops-internal-token': getDefaultOpsToken() };

  beforeEach(async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'demo-api-bff-ops-'));
    const databasePath = join(tempDir, `${randomUUID()}.sqlite`);
    const analyticsDatabasePath = join(tempDir, `${randomUUID()}-analytics.sqlite`);
    await seedActiveDefinition(databasePath);
    handleRequest = createHandleRequest(
      createDemoApiDependencies({
        databasePath,
        analyticsDatabasePath,
        signingSecret: 'demo-api-bff-test-secret',
        demoStartGuard: createPermissiveDemoStartGuard(),
      }),
    );
  });

  it('rejects operations requests without internal token', async () => {
    const response = createMockResponse();
    await handleRequest(
      createJsonRequest('GET', '/api/ops/v1/health'),
      response,
    );

    expect(response.statusCode).toBe(401);
  });

  it('returns platform health components', async () => {
    const response = createMockResponse();
    await handleRequest(
      createJsonRequest('GET', '/api/ops/v1/health', undefined, opsHeaders),
      response,
    );

    const body = JSON.parse(response.chunks.join(''));
    expect(response.statusCode).toBe(200);
    expect(body.components.some((item: { component: string }) => item.component === 'analytics')).toBe(
      true,
    );
  });

  it('returns live operations sessions and funnel report', async () => {
    const startResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('POST', '/api/demo/v1/start', {
        full_name: 'Ops User',
        business_name: 'Ops Plumbing',
        email: `ops-${randomUUID()}@example.com`,
        phone_number: '+31612345679',
        industry: 'plumbing',
        business_location: 'Amsterdam',
        company_size: '2-5',
        website: 'https://example.com',
        biggest_challenge: 'missed_calls',
        implementation_timeframe: 'within_3_months',
        experience_definition_id: 'expdef_plumbing_demo_v1',
      }),
      startResponse,
    );
    const started = JSON.parse(startResponse.chunks.join(''));

    const liveResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('GET', '/api/ops/v1/sessions/live', undefined, opsHeaders),
      liveResponse,
    );
    const live = JSON.parse(liveResponse.chunks.join(''));
    expect(live.sessions.some((session: { experience_session_id: string }) =>
      session.experience_session_id === started.experience_session_id,
    )).toBe(true);

    const funnelResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('GET', '/api/ops/v1/reports/funnel', undefined, opsHeaders),
      funnelResponse,
    );
    const funnel = JSON.parse(funnelResponse.chunks.join(''));
    expect(funnel.stages.find((stage: { stage: string }) => stage.stage === 'demo.started')?.count).toBeGreaterThan(
      0,
    );
  });

  it('supports session history search and actionable incidents list', async () => {
    const email = `history-${randomUUID()}@example.com`;
    const startResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('POST', '/api/demo/v1/start', {
        full_name: 'History User',
        business_name: 'History Plumbing',
        email,
        phone_number: '+31612345680',
        industry: 'plumbing',
        business_location: 'Amsterdam',
        company_size: '2-5',
        website: 'https://example.com',
        biggest_challenge: 'missed_calls',
        implementation_timeframe: 'within_3_months',
        experience_definition_id: 'expdef_plumbing_demo_v1',
      }),
      startResponse,
    );

    const historyResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('GET', `/api/ops/v1/sessions/history?email=${encodeURIComponent(email)}`, undefined, opsHeaders),
      historyResponse,
    );
    const history = JSON.parse(historyResponse.chunks.join(''));
    expect(history.sessions.length).toBeGreaterThan(0);

    const actionsResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('GET', '/api/ops/v1/actions', undefined, opsHeaders),
      actionsResponse,
    );
    const actions = JSON.parse(actionsResponse.chunks.join(''));
    expect(Array.isArray(actions.incidents)).toBe(true);
  });
});
