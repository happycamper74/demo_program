const TOKEN_FIELD_NAMES = [
  'token',
  'access_token',
  'raw_token',
  'authorization',
  'recovery_token',
  'experience_token',
];

const TRANSCRIPT_FIELD_NAMES = ['transcript', 'transcript_text', 'full_transcript'];

export function redactTokenFields(details: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = { ...details };

  for (const fieldName of TOKEN_FIELD_NAMES) {
    if (fieldName in redacted) {
      redacted[fieldName] = '[REDACTED]';
    }
  }

  for (const fieldName of TRANSCRIPT_FIELD_NAMES) {
    if (fieldName in redacted) {
      redacted[fieldName] = '[REDACTED]';
    }
  }

  if (typeof redacted.url === 'string') {
    redacted.url = redactUrlForLogging(redacted.url);
  }

  return redacted;
}

export function redactUrlForLogging(url: string): string {
  try {
    const parsed = new URL(url, 'http://localhost');
    if (parsed.searchParams.has('token')) {
      parsed.searchParams.set('token', '[REDACTED]');
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url.replace(/token=[^&]+/gi, 'token=[REDACTED]');
  }
}

export function createSafeSecurityLogger(logger: {
  info: (event: string, details: Record<string, unknown>) => void;
  warn: (event: string, details: Record<string, unknown>) => void;
}) {
  return {
    info(event: string, details: Record<string, unknown>) {
      logger.info(event, redactTokenFields(details));
    },
    warn(event: string, details: Record<string, unknown>) {
      logger.warn(event, redactTokenFields(details));
    },
  };
}
