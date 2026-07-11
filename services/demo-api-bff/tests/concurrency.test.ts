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
import { PhoneNumberMismatchError } from '@experience-platform/leadboard-client';
import { createHandleRequest } from '../src/http.js';
import { createDemoApiDependencies } from '../src/infrastructure/dependencies.js';
import { createPermissiveDemoStartGuard } from './test-security-helpers.js';
import type { StartDemoRequest } from '../src/types/api.js';

const plumbingDefinition = {
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

function buildStartRequest(email: string, phone: string): StartDemoRequest {
  return {
    full_name: 'Concurrent User',
    business_name: 'Concurrent Plumbing',
    email,
    phone_number: phone,
    industry: 'plumbing',
    business_location: 'Amsterdam',
    company_size: '2-5',
    website: 'https://example.com',
    biggest_challenge: 'never_miss_calls',
    implementation_timeframe: 'within_3_months',
    experience_definition_id: 'expdef_plumbing_demo_v1',
  };
}

describe('mock MVP concurrency validation', () => {
  let handleRequest: ReturnType<typeof createHandleRequest>;
  let deps: ReturnType<typeof createDemoApiDependencies>;

  beforeEach(async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'demo-api-bff-concurrency-'));
    const databasePath = join(tempDir, `${randomUUID()}.sqlite`);
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

  it('supports multiple concurrent sessions for different prospects', async () => {
    const starts = await Promise.all(
      Array.from({ length: 3 }, (_, index) => {
        const response = createMockResponse();
        return handleRequest(
          createJsonRequest(
            'POST',
            '/api/demo/v1/start',
            buildStartRequest(`concurrent-${index}-${randomUUID()}@example.com`, `+3162000000${index}`),
          ),
          response,
        ).then(() => response);
      }),
    );

    expect(starts.every((response) => response.statusCode === 200)).toBe(true);
    const sessionIds = starts.map((response) => JSON.parse(response.chunks.join('')).experience_session_id);
    expect(new Set(sessionIds).size).toBe(3);
  });

  it('enforces one active session per prospect and experience definition', async () => {
    const email = `single-active-${randomUUID()}@example.com`;
    const phone = '+31621111111';
    const request = buildStartRequest(email, phone);

    const first = createMockResponse();
    await handleRequest(createJsonRequest('POST', '/api/demo/v1/start', request), first);
    expect(first.statusCode).toBe(200);

    const second = createMockResponse();
    await handleRequest(createJsonRequest('POST', '/api/demo/v1/start', request), second);
    expect(second.statusCode).toBe(409);
    expect(JSON.parse(second.chunks.join('')).error.code).toBe('ACTIVE_SESSION_EXISTS');
  });

  it('handles simultaneous mock calls and phone mismatch under concurrency', async () => {
    const startA = createMockResponse();
    await handleRequest(
      createJsonRequest(
        'POST',
        '/api/demo/v1/start',
        buildStartRequest(`call-a-${randomUUID()}@example.com`, '+31622222221'),
      ),
      startA,
    );
    const sessionA = JSON.parse(startA.chunks.join(''));

    const startB = createMockResponse();
    await handleRequest(
      createJsonRequest(
        'POST',
        '/api/demo/v1/start',
        buildStartRequest(`call-b-${randomUUID()}@example.com`, '+31622222222'),
      ),
      startB,
    );
    const sessionB = JSON.parse(startB.chunks.join(''));

    const responseA = createMockResponse();
    const responseB = createMockResponse();
    await Promise.all([
      handleRequest(
        createJsonRequest(
          'POST',
          `/api/demo/v1/sessions/${sessionA.experience_session_id}/simulate-call`,
          undefined,
          { authorization: `Bearer ${sessionA.experience_token}` },
        ),
        responseA,
      ),
      handleRequest(
        createJsonRequest(
          'POST',
          `/api/demo/v1/sessions/${sessionB.experience_session_id}/simulate-call`,
          undefined,
          { authorization: `Bearer ${sessionB.experience_token}` },
        ),
        responseB,
      ),
    ]);

    expect(responseA.statusCode).toBe(200);
    expect(responseB.statusCode).toBe(200);

    const leadboardClient = deps.demoService.getLeadBoardClient();
    await expect(
      leadboardClient.bindIncomingCall({
        experienceSessionId: sessionA.experience_session_id,
        callerPhoneE164: '+31622222222',
      }),
    ).rejects.toBeInstanceOf(PhoneNumberMismatchError);
  });

  it('streams presentation-safe events to multiple SSE consumers', async () => {
    const start = createMockResponse();
    await handleRequest(
      createJsonRequest(
        'POST',
        '/api/demo/v1/start',
        buildStartRequest(`sse-${randomUUID()}@example.com`, '+31623333333'),
      ),
      start,
    );
    const started = JSON.parse(start.chunks.join(''));

    const eventsA = createMockResponse();
    const eventsB = createMockResponse();
    await Promise.all([
      handleRequest(
        createJsonRequest(
          'GET',
          `/api/demo/v1/sessions/${started.experience_session_id}/events?token=${started.experience_token}`,
        ),
        eventsA,
      ),
      handleRequest(
        createJsonRequest(
          'GET',
          `/api/demo/v1/sessions/${started.experience_session_id}/events?token=${started.experience_token}`,
        ),
        eventsB,
      ),
    ]);

    const streamA = eventsA.chunks.join('');
    const streamB = eventsB.chunks.join('');
    expect(streamA).toContain('event: session_started');
    expect(streamB).toContain('event: waiting_for_call');
    expect(streamA).not.toContain('leadboard.');
    expect(streamB).not.toContain('token=');
  });
});
