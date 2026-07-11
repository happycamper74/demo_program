import type { IncomingMessage } from 'node:http';
import { unauthorized } from '../domain/api-errors.js';

const DEFAULT_OPS_TOKEN = 'local-ops-dev-token';

export function authorizeOpsRequest(req: IncomingMessage): void {
  const headerToken = req.headers['x-ops-internal-token'];
  const token = Array.isArray(headerToken) ? headerToken[0] : headerToken;
  const expected = process.env.OPS_INTERNAL_TOKEN ?? DEFAULT_OPS_TOKEN;

  if (!token || token !== expected) {
    throw unauthorized('Operations access requires a valid internal token.');
  }
}

export function getDefaultOpsToken(): string {
  return process.env.OPS_INTERNAL_TOKEN ?? DEFAULT_OPS_TOKEN;
}
