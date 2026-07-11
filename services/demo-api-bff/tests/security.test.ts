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
import { DemoStartGuard, InMemoryRateLimiter } from '@experience-platform/demo-security';
import { createSafeSecurityLogger } from '@experience-platform/demo-security';
import type { CreateExperienceDefinitionInput } from '@experience-platform/shared-types';
import { createHandleRequest } from '../src/http.js';
import { createDemoApiDependencies } from '../src/infrastructure/dependencies.js';
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

const baseStartRequest: StartDemoRequest = {
  full_name: 'Security User',
  business_name: 'Secure Plumbing',
  email: 'secure@example.com',
  business_market: 'NL',
  phone_number: '+31612345670',
  industry: 'plumbing',
  business_location: 'Amsterdam',
  company_size: '2-5',
  website: 'https://example.com',
  biggest_challenge: 'never_miss_calls',
  implementation_timeframe: 'within_3_months',
  experience_definition_id: 'expdef_plumbing_demo_v1',
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
    socket: { remoteAddress: headers?.['x-forwarded-for'] ?? '127.0.0.1' },
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

describe('demo-api-bff security', () => {
  let handleRequest: ReturnType<typeof createHandleRequest>;
  let rateLimiter: InMemoryRateLimiter;
  let databasePath: string;

  beforeEach(async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'demo-api-bff-security-'));
    databasePath = join(tempDir, `${randomUUID()}.sqlite`);
    const analyticsDatabasePath = join(tempDir, `${randomUUID()}-analytics.sqlite`);
    await seedActiveDefinition(databasePath);
    rateLimiter = new InMemoryRateLimiter();
    handleRequest = createHandleRequest(
      createDemoApiDependencies({
        databasePath,
        analyticsDatabasePath,
        signingSecret: 'demo-api-bff-test-secret',
        demoStartGuard: new DemoStartGuard({
          rateLimiter,
          config: {
            rateLimits: {
              ipMax: 2,
              ipWindowMs: 60_000,
              emailMax: 2,
              emailWindowMs: 60_000,
              phoneMax: 2,
              phoneWindowMs: 60_000,
            },
            riskThresholds: {
              mediumIpAttempts: 99,
              highIpAttempts: 99,
              criticalIpAttempts: 99,
              mediumEmailAttempts: 99,
              highEmailAttempts: 99,
              criticalEmailAttempts: 99,
              mediumPhoneAttempts: 99,
              highPhoneAttempts: 99,
              criticalPhoneAttempts: 99,
            },
          },
        }),
      }),
    );
  });

  it('rejects honeypot submissions with a safe generic response', async () => {
    const response = createMockResponse();
    await handleRequest(
      createJsonRequest('POST', '/api/demo/v1/start', {
        ...baseStartRequest,
        email: `honeypot-${randomUUID()}@example.com`,
        company_website_url: 'https://spam.example',
      }),
      response,
    );

    const body = JSON.parse(response.chunks.join(''));
    expect(response.statusCode).toBe(403);
    expect(body.error.code).toBe('DEMO_START_UNAVAILABLE');
    expect(body.error.message).not.toMatch(/honeypot/i);
  });

  it('rate limits by IP, email, and phone', async () => {
    const ip = '203.0.113.55';
    const headers = { 'x-forwarded-for': ip };

    for (let index = 0; index < 2; index += 1) {
      const response = createMockResponse();
      await handleRequest(
        createJsonRequest(
          'POST',
          '/api/demo/v1/start',
          {
            ...baseStartRequest,
            email: `ip-${index}-${randomUUID()}@example.com`,
            phone_number: `+31612345${600 + index}`,
          },
          headers,
        ),
        response,
      );
      expect(response.statusCode).toBe(200);
    }

    const blocked = createMockResponse();
    await handleRequest(
      createJsonRequest(
        'POST',
        '/api/demo/v1/start',
        {
          ...baseStartRequest,
          email: `ip-blocked-${randomUUID()}@example.com`,
          phone_number: '+31612345699',
        },
        headers,
      ),
      blocked,
    );
    expect(blocked.statusCode).toBe(403);
    expect(JSON.parse(blocked.chunks.join('')).error.code).toBe('DEMO_START_UNAVAILABLE');
  });

  it('returns medium, high, and critical adaptive responses without exposing risk reasons', async () => {
    const adaptiveLimiter = new InMemoryRateLimiter();
    const tempDir = mkdtempSync(join(tmpdir(), 'demo-api-bff-adaptive-'));
    const adaptiveDatabasePath = join(tempDir, `${randomUUID()}.sqlite`);
    const adaptiveAnalyticsPath = join(tempDir, `${randomUUID()}-analytics.sqlite`);
    await seedActiveDefinition(adaptiveDatabasePath);

    const adaptiveHandler = createHandleRequest(
      createDemoApiDependencies({
        databasePath: adaptiveDatabasePath,
        analyticsDatabasePath: adaptiveAnalyticsPath,
        signingSecret: 'demo-api-bff-test-secret',
        demoStartGuard: new DemoStartGuard({
          rateLimiter: adaptiveLimiter,
          config: {
            rateLimits: {
              ipMax: 20,
              ipWindowMs: 60_000,
              emailMax: 20,
              emailWindowMs: 60_000,
              phoneMax: 20,
              phoneWindowMs: 60_000,
            },
            riskThresholds: {
              mediumIpAttempts: 2,
              highIpAttempts: 4,
              criticalIpAttempts: 6,
              mediumEmailAttempts: 99,
              highEmailAttempts: 99,
              criticalEmailAttempts: 99,
              mediumPhoneAttempts: 99,
              highPhoneAttempts: 99,
              criticalPhoneAttempts: 99,
            },
          },
        }),
      }),
    );

    const ip = '198.51.100.77';
    const headers = { 'x-forwarded-for': ip };
    let phoneCounter = 600;
    const makeRequest = (challengeCompleted = false) =>
      createJsonRequest(
        'POST',
        '/api/demo/v1/start',
        {
          ...baseStartRequest,
          email: `adaptive-${randomUUID()}@example.com`,
          phone_number: `+31612345${phoneCounter++}`,
          challenge_completed: challengeCompleted,
        },
        headers,
      );

    const first = createMockResponse();
    await adaptiveHandler(makeRequest(), first);
    expect(first.statusCode).toBe(200);

    const second = createMockResponse();
    await adaptiveHandler(makeRequest(), second);
    expect(second.statusCode).toBe(403);
    expect(JSON.parse(second.chunks.join('')).error.code).toBe('CHALLENGE_REQUIRED');

    const third = createMockResponse();
    await adaptiveHandler(makeRequest(true), third);
    expect(third.statusCode).toBe(200);

    const fourth = createMockResponse();
    await adaptiveHandler(makeRequest(), fourth);
    expect(fourth.statusCode).toBe(403);
    expect(JSON.parse(fourth.chunks.join('')).error.action).toBe('book_discovery');
  });

  it('rate limits equivalent NL phone formats after normalization', async () => {
    const adaptiveLimiter = new InMemoryRateLimiter();
    const tempDir = mkdtempSync(join(tmpdir(), 'demo-api-bff-normalized-phone-'));
    const adaptiveDatabasePath = join(tempDir, `${randomUUID()}.sqlite`);
    const adaptiveAnalyticsPath = join(tempDir, `${randomUUID()}-analytics.sqlite`);
    await seedActiveDefinition(adaptiveDatabasePath);

    const adaptiveHandler = createHandleRequest(
      createDemoApiDependencies({
        databasePath: adaptiveDatabasePath,
        analyticsDatabasePath: adaptiveAnalyticsPath,
        signingSecret: 'demo-api-bff-test-secret',
        demoStartGuard: new DemoStartGuard({
          rateLimiter: adaptiveLimiter,
          config: {
            rateLimits: {
              ipMax: 20,
              ipWindowMs: 60_000,
              emailMax: 20,
              emailWindowMs: 60_000,
              phoneMax: 1,
              phoneWindowMs: 60_000,
            },
            riskThresholds: {
              mediumIpAttempts: 99,
              highIpAttempts: 99,
              criticalIpAttempts: 99,
              mediumEmailAttempts: 99,
              highEmailAttempts: 99,
              criticalEmailAttempts: 99,
              mediumPhoneAttempts: 99,
              highPhoneAttempts: 99,
              criticalPhoneAttempts: 99,
            },
          },
        }),
      }),
    );

    const ip = '203.0.113.88';
    const headers = { 'x-forwarded-for': ip };
    const email = (index: number) => `normalized-phone-${index}-${randomUUID()}@example.com`;

    const first = createMockResponse();
    await adaptiveHandler(
      createJsonRequest(
        'POST',
        '/api/demo/v1/start',
        {
          ...baseStartRequest,
          email: email(1),
          phone_number: '0646275553',
        },
        headers,
      ),
      first,
    );
    expect(first.statusCode).toBe(200);

    const second = createMockResponse();
    await adaptiveHandler(
      createJsonRequest(
        'POST',
        '/api/demo/v1/start',
        {
          ...baseStartRequest,
          email: email(2),
          phone_number: '+31 6 46275553',
        },
        headers,
      ),
      second,
    );
    expect(second.statusCode).toBe(403);
    expect(JSON.parse(second.chunks.join('')).error.code).toBe('DEMO_START_UNAVAILABLE');
  });

  it('rejects OTHER waitlist honeypot submissions with a safe generic response', async () => {
    const response = createMockResponse();
    await handleRequest(
      createJsonRequest('POST', '/api/demo/v1/start', {
        ...baseStartRequest,
        business_market: 'OTHER',
        country_name: 'Canada',
        phone_number: undefined,
        email: `waitlist-honeypot-${randomUUID()}@example.com`,
        company_website_url: 'https://spam.example',
      }),
      response,
    );

    const body = JSON.parse(response.chunks.join(''));
    expect(response.statusCode).toBe(403);
    expect(body.error.code).toBe('DEMO_START_UNAVAILABLE');
    expect(body.error.message).not.toMatch(/honeypot/i);
  });

  it('rate limits OTHER waitlist submissions by email without phone involvement', async () => {
    const adaptiveLimiter = new InMemoryRateLimiter();
    const tempDir = mkdtempSync(join(tmpdir(), 'demo-api-bff-waitlist-security-'));
    const adaptiveDatabasePath = join(tempDir, `${randomUUID()}.sqlite`);
    const adaptiveAnalyticsPath = join(tempDir, `${randomUUID()}-analytics.sqlite`);
    await seedActiveDefinition(adaptiveDatabasePath);

    const adaptiveHandler = createHandleRequest(
      createDemoApiDependencies({
        databasePath: adaptiveDatabasePath,
        analyticsDatabasePath: adaptiveAnalyticsPath,
        signingSecret: 'demo-api-bff-test-secret',
        demoStartGuard: new DemoStartGuard({
          rateLimiter: adaptiveLimiter,
          config: {
            rateLimits: {
              ipMax: 20,
              ipWindowMs: 60_000,
              emailMax: 1,
              emailWindowMs: 60_000,
              phoneMax: 20,
              phoneWindowMs: 60_000,
            },
            riskThresholds: {
              mediumIpAttempts: 99,
              highIpAttempts: 99,
              criticalIpAttempts: 99,
              mediumEmailAttempts: 99,
              highEmailAttempts: 99,
              criticalEmailAttempts: 99,
              mediumPhoneAttempts: 99,
              highPhoneAttempts: 99,
              criticalPhoneAttempts: 99,
            },
          },
        }),
      }),
    );

    const email = `waitlist-rate-${randomUUID()}@example.com`;
    const makeRequest = (ip: string) =>
      createJsonRequest(
        'POST',
        '/api/demo/v1/start',
        {
          ...baseStartRequest,
          business_market: 'OTHER',
          country_name: 'Canada',
          phone_number: '+31612345678',
          email,
        },
        { 'x-forwarded-for': ip },
      );

    const first = createMockResponse();
    await adaptiveHandler(makeRequest('203.0.113.91'), first);
    expect(first.statusCode).toBe(201);

    const blocked = createMockResponse();
    await adaptiveHandler(makeRequest('203.0.113.92'), blocked);
    expect(blocked.statusCode).toBe(403);
    expect(JSON.parse(blocked.chunks.join('')).error.code).toBe('DEMO_START_UNAVAILABLE');
  });

  it('redacts tokens in security logs', () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    const safeLogger = createSafeSecurityLogger(logger);

    safeLogger.info('demo.sse.connected', {
      url: '/api/demo/v1/sessions/expsess_1/events?token=raw-token-value',
      experience_token: 'raw-token-value',
      transcript: 'should not appear',
    });

    expect(logger.info).toHaveBeenCalledWith(
      'demo.sse.connected',
      expect.objectContaining({
        url: expect.stringContaining('token=%5BREDACTED%5D'),
        experience_token: '[REDACTED]',
        transcript: '[REDACTED]',
      }),
    );
  });
});
