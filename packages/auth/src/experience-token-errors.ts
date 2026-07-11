export class ExperienceTokenConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExperienceTokenConfigurationError';
  }
}

export class ExperienceTokenExpiredError extends Error {
  constructor() {
    super('Experience token has expired');
    this.name = 'ExperienceTokenExpiredError';
  }
}

export class ExperienceTokenVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExperienceTokenVerificationError';
  }
}

export class InvalidExperienceTokenTypeError extends Error {
  constructor(public readonly tokenType: string) {
    super(`Invalid experience token type: ${tokenType}`);
    this.name = 'InvalidExperienceTokenTypeError';
  }
}

export class MissingExperienceTokenClaimError extends Error {
  constructor(public readonly claim: string) {
    super(`Missing required experience token claim: ${claim}`);
    this.name = 'MissingExperienceTokenClaimError';
  }
}

export class ExperienceTokenOwnershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExperienceTokenOwnershipError';
  }
}
