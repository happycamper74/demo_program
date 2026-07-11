const TOKEN_FIELD_NAMES = ['token', 'access_token', 'raw_token', 'authorization', 'recovery_token'];

export interface SafeAuthLogger {
  info(event: string, details: Record<string, unknown>): void;
  warn(event: string, details: Record<string, unknown>): void;
}

export function redactTokenFields(details: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = { ...details };

  for (const fieldName of TOKEN_FIELD_NAMES) {
    if (fieldName in redacted) {
      redacted[fieldName] = '[REDACTED]';
    }
  }

  return redacted;
}

export function createSafeAuthLogger(logger: {
  info: (event: string, details: Record<string, unknown>) => void;
  warn: (event: string, details: Record<string, unknown>) => void;
}): SafeAuthLogger {
  return {
    info(event: string, details: Record<string, unknown>) {
      logger.info(event, redactTokenFields(details));
    },
    warn(event: string, details: Record<string, unknown>) {
      logger.warn(event, redactTokenFields(details));
    },
  };
}
