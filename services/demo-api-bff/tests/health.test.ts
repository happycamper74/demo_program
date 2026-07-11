import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { createHealthResponse } from '../src/api/health.js';
import { createHandleRequest, SERVICE_NAME } from '../src/http.js';

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

describe('@experience-platform/demo-api-bff', () => {
  it('returns a health response payload', () => {
    expect(createHealthResponse(SERVICE_NAME)).toEqual({
      status: 'ok',
      service: SERVICE_NAME,
    });
  });

  it('handles GET /health', async () => {
    const request = { method: 'GET', url: '/health' } as IncomingMessage;
    const response = createMockResponse();

    await createHandleRequest()(request, response);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(JSON.stringify(createHealthResponse(SERVICE_NAME)));
  });
});
