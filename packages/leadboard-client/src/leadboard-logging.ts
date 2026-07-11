export type LeadBoardClientLogger = {
  debug?(message: string, context?: Record<string, unknown>): void;
  warn?(message: string, context?: Record<string, unknown>): void;
};

const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'x-leadboard-demo-internal-key',
]);

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_NAMES.has(name.toLowerCase())) {
      redacted[name] = '[REDACTED]';
      continue;
    }
    redacted[name] = value;
  }
  return redacted;
}

export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of ['api_key', 'apikey', 'token', 'key']) {
      if (parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, '[REDACTED]');
      }
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
