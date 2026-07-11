import {
  AnalyticsService,
  createAnalyticsDatabase,
  SqliteAnalyticsEventRepository,
  type AnalyticsEventName,
} from '@experience-platform/analytics-core';
import { mkdirSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, resolve } from 'node:path';
import { createHealthResponse, isHealthCheck } from './api/health.js';

export const SERVICE_NAME = 'analytics';
export const DEFAULT_PORT = 3003;

let analyticsService: AnalyticsService | undefined;

function resolveAnalyticsDatabasePath(): string {
  const filePath = process.env.ANALYTICS_DATABASE_PATH ?? '.data/analytics-service.sqlite';
  const resolved = resolve(filePath);
  mkdirSync(dirname(resolved), { recursive: true });
  return resolved;
}

function getAnalyticsService(): AnalyticsService {
  if (!analyticsService) {
    const database = createAnalyticsDatabase({
      filePath: resolveAnalyticsDatabasePath(),
    });
    analyticsService = new AnalyticsService(new SqliteAnalyticsEventRepository(database));
  }

  return analyticsService;
}

export function createAnalyticsServiceForTests(service: AnalyticsService): void {
  analyticsService = service;
}

export async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handleRequestAsync(req, res);
}

async function handleRequestAsync(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = url.pathname;

  if (isHealthCheck(method, req.url ?? undefined)) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(createHealthResponse(SERVICE_NAME)));
    return;
  }

  const service = getAnalyticsService();

  if (method === 'POST' && pathname === '/api/analytics/v1/events') {
    const body = await readJsonBody<{
      event_name: AnalyticsEventName;
      experience_session_id?: string;
      prospect_id?: string;
      industry?: string;
      payload?: Record<string, unknown>;
    }>(req);

    const recorded = await service.recordEvent({
      eventName: body.event_name,
      experienceSessionId: body.experience_session_id ?? null,
      prospectId: body.prospect_id ?? null,
      industry: body.industry ?? null,
      payload: body.payload,
    });

    sendJson(res, 201, recorded);
    return;
  }

  if (method === 'GET' && pathname === '/api/analytics/v1/reports/funnel') {
    sendJson(res, 200, await service.getFunnelReport());
    return;
  }

  if (method === 'GET' && pathname === '/api/analytics/v1/reports/industry-demand') {
    sendJson(res, 200, await service.getIndustryDemandReport());
    return;
  }

  res.writeHead(404).end();
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw) as T;
}
