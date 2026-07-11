export class DemoApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>,
    public readonly action?: string,
  ) {
    super(message);
    this.name = 'DemoApiError';
  }
}

export function validationFailed(message: string, details?: Record<string, unknown>): DemoApiError {
  return new DemoApiError('VALIDATION_FAILED', message, 400, details);
}

export function sessionNotFound(experienceSessionId: string): DemoApiError {
  return new DemoApiError(
    'SESSION_NOT_FOUND',
    'The requested demo session could not be found.',
    404,
    { experience_session_id: experienceSessionId },
  );
}

export function demoAlreadyCompleted(): DemoApiError {
  return new DemoApiError(
    'DEMO_ALREADY_COMPLETED',
    'You have already completed this interactive demo. The next step is to book a Discovery Session.',
    409,
    undefined,
    'book_discovery',
  );
}

export function sessionNotRecoverable(message = 'This session can no longer be recovered.'): DemoApiError {
  return new DemoApiError('SESSION_NOT_RECOVERABLE', message, 409);
}

export function unauthorized(message = 'Authentication is required.'): DemoApiError {
  return new DemoApiError('UNAUTHORIZED', message, 401);
}

export function forbidden(message = 'You are not allowed to access this session.'): DemoApiError {
  return new DemoApiError('FORBIDDEN', message, 403);
}

export function discoveryAlreadyBooked(): DemoApiError {
  return new DemoApiError(
    'DISCOVERY_ALREADY_BOOKED',
    'A Discovery Session has already been booked for this demo.',
    409,
  );
}

export function leadNotReady(message = 'Lead data is not ready yet.'): DemoApiError {
  return new DemoApiError('LEAD_NOT_READY', message, 409);
}

export function simulateCallUnavailable(): DemoApiError {
  return new DemoApiError(
    'SIMULATE_CALL_UNAVAILABLE',
    'Simulate incoming call is only available in mock LeadBoard mode.',
    403,
  );
}

export function demoStartUnavailable(): DemoApiError {
  return new DemoApiError(
    'DEMO_START_UNAVAILABLE',
    'Unable to start demo right now. Please try again later or book a Discovery Session.',
    403,
    undefined,
    'book_discovery',
  );
}

export function challengeRequired(): DemoApiError {
  return new DemoApiError(
    'CHALLENGE_REQUIRED',
    'Please complete the verification step before starting your demo.',
    403,
    undefined,
    'complete_challenge',
  );
}

export function highRiskRedirect(): DemoApiError {
  return new DemoApiError(
    'DEMO_START_REDIRECT',
    'We could not start your interactive demo automatically. Please book a Discovery Session or contact our team.',
    403,
    undefined,
    'book_discovery',
  );
}

export function activeSessionExists(): DemoApiError {
  return new DemoApiError(
    'ACTIVE_SESSION_EXISTS',
    'You already have an active demo session for this experience.',
    409,
  );
}

export function internalError(message = 'An unexpected error occurred.'): DemoApiError {
  return new DemoApiError('INTERNAL_ERROR', message, 500);
}

export function waitlistEmailExists(
  message = "You're already on our waitlist.",
): DemoApiError {
  return new DemoApiError('WAITLIST_EMAIL_EXISTS', message, 409);
}
