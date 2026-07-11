export class WaitlistEmailExistsError extends Error {
  readonly code = 'WAITLIST_EMAIL_EXISTS' as const;

  constructor(public readonly emailNormalized: string) {
    super("You're already on our waitlist.");
    this.name = 'WaitlistEmailExistsError';
  }
}
