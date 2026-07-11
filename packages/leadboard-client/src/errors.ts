export class LeadBoardRealAdapterNotAvailableError extends Error {
  constructor() {
    super('Real LeadBoard adapter is not available until EP-11');
    this.name = 'LeadBoardRealAdapterNotAvailableError';
  }
}

export class LeadBoardConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeadBoardConfigurationError';
  }
}

export class LeadBoardApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly operation: string;

  constructor(input: { code: string; message: string; status: number; operation: string }) {
    super(input.message);
    this.name = 'LeadBoardApiError';
    this.code = input.code;
    this.status = input.status;
    this.operation = input.operation;
  }
}

export class BindIncomingCallUnsupportedError extends Error {
  constructor() {
    super(
      'bindIncomingCall is not supported in real LeadBoard mode; production call binding is handled by twilio_transcribe_new voice intake',
    );
    this.name = 'BindIncomingCallUnsupportedError';
  }
}

export class DemoSessionMirrorNotFoundError extends Error {
  constructor(public readonly identifier: string) {
    super(`LeadBoard demo session mirror not found: ${identifier}`);
    this.name = 'DemoSessionMirrorNotFoundError';
  }
}

export class PhoneNumberMismatchError extends Error {
  constructor() {
    super('Caller phone number does not match the registered prospect phone number');
    this.name = 'PhoneNumberMismatchError';
  }
}

export class ActiveCallAlreadyExistsError extends Error {
  constructor(public readonly experienceSessionId: string) {
    super(`An active call already exists for experience session ${experienceSessionId}`);
    this.name = 'ActiveCallAlreadyExistsError';
  }
}

export class RestrictedLeadAccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RestrictedLeadAccessDeniedError';
  }
}

export class RestrictedLeadNotReadyError extends Error {
  constructor(public readonly leadId: string) {
    super(`Restricted lead view is not ready for lead ${leadId}`);
    this.name = 'RestrictedLeadNotReadyError';
  }
}

export class PurgeOperationFailedError extends Error {
  constructor(
    public readonly leadboardDemoSessionId: string,
    public readonly reason: string,
  ) {
    super(`Purge failed for session ${leadboardDemoSessionId}: ${reason}`);
    this.name = 'PurgeOperationFailedError';
  }
}
