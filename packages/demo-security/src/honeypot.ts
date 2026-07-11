import { GENERIC_DEMO_START_FAILURE_MESSAGE } from './types.js';

export function isHoneypotFilled(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function honeypotRejectionMessage(): string {
  return GENERIC_DEMO_START_FAILURE_MESSAGE;
}
