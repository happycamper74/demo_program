import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHealthResponse, isHealthCheck } from './api/health.js';

export const SERVICE_NAME = 'experience-engine';
export const DEFAULT_PORT = 3001;

export function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  if (isHealthCheck(req.method, req.url ?? undefined)) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(createHealthResponse(SERVICE_NAME)));
    return;
  }

  res.writeHead(404).end();
}
