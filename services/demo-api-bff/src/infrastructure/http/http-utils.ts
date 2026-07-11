import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { DemoApiError } from '../../domain/api-errors.js';
import type { ApiErrorBody } from '../../types/api.js';

export interface RequestContext {
  readonly requestId: string;
  readonly method: string;
  readonly url: string;
  readonly pathname: string;
  readonly authorization?: string;
}

export function resolveRequestId(req: IncomingMessage): string {
  const header = req.headers['x-request-id'];
  if (typeof header === 'string' && header.trim().length > 0) {
    return header;
  }

  if (Array.isArray(header) && header[0]) {
    return header[0];
  }

  return `req_${randomUUID()}`;
}

export function createRequestContext(req: IncomingMessage): RequestContext {
  const url = req.url ?? '/';
  const pathname = url.split('?')[0] ?? '/';

  return {
    requestId: resolveRequestId(req),
    method: req.method ?? 'GET',
    url,
    pathname,
    authorization:
      typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
  };
}

export async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (raw.length === 0) {
    return {} as T;
  }

  return JSON.parse(raw) as T;
}

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
  requestId: string,
): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'X-Request-Id': requestId,
  });
  res.end(JSON.stringify(body));
}

export function sendError(res: ServerResponse, error: DemoApiError, requestId: string): void {
  const body: ApiErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      request_id: requestId,
      ...(error.details ? { details: error.details } : {}),
      ...(error.action ? { action: error.action } : {}),
    },
  };

  sendJson(res, error.statusCode, body, requestId);
}

export function sendSseEvent(
  res: ServerResponse,
  event: string,
  data: Record<string, unknown>,
): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
