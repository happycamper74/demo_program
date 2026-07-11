import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import {
  AnalyticsService,
  InMemoryAnalyticsEventRepository,
} from '@experience-platform/analytics-core';
import { createAnalyticsServiceForTests, handleRequest } from '../src/http.js';

function createMockResponse(): ServerResponse & { statusCode?: number; body?: string } {
  const response: ServerResponse & { statusCode?: number; body?: string } = {
    statusCode: undefined,
    body: undefined,
    writeHead(statusCode: number) {
      response.statusCode = statusCode;
    },
    end(body?: string) {
      response.body = body;
    },
  } as ServerResponse & { statusCode?: number; body?: string };

  return response;
}

function createJsonRequest(method: string, url: string, body?: unknown): IncomingMessage {
  const payload = body === undefined ? '' : JSON.stringify(body);
  return {
    method,
    url,
    headers: {
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(payload)),
    },
    async *[Symbol.asyncIterator]() {
      if (payload.length > 0) {
        yield payload;
      }
    },
  } as IncomingMessage;
}

describe('@experience-platform/analytics API', () => {
  it('records analytics events and returns funnel aggregation', async () => {
    const service = new AnalyticsService(new InMemoryAnalyticsEventRepository());
    createAnalyticsServiceForTests(service);

    const recordResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('POST', '/api/analytics/v1/events', {
        event_name: 'landing.viewed',
      }),
      recordResponse,
    );
    expect(recordResponse.statusCode).toBe(201);

    const funnelResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('GET', '/api/analytics/v1/reports/funnel'),
      funnelResponse,
    );

    const funnel = JSON.parse(funnelResponse.body ?? '{}');
    expect(funnel.stages[0]?.stage).toBe('landing.viewed');
    expect(funnel.stages[0]?.count).toBe(1);
  });

  it('returns industry demand aggregation', async () => {
    const service = new AnalyticsService(new InMemoryAnalyticsEventRepository());
    createAnalyticsServiceForTests(service);

    await handleRequest(
      createJsonRequest('POST', '/api/analytics/v1/events', {
        event_name: 'discovery.booked',
        industry: 'plumbing',
      }),
      createMockResponse(),
    );

    const demandResponse = createMockResponse();
    await handleRequest(
      createJsonRequest('GET', '/api/analytics/v1/reports/industry-demand'),
      demandResponse,
    );

    const demand = JSON.parse(demandResponse.body ?? '{}');
    expect(demand.industries[0]?.discovery_booked).toBe(1);
  });
});
