import type { IncomingMessage } from 'node:http';

export function resolveClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }

  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim() ?? 'unknown';
  }

  return req.socket?.remoteAddress ?? 'unknown';
}
