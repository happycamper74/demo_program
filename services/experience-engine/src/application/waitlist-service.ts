import { createCorrelationId } from '../domain/experience-definition.js';
import {
  createWaitlistEntryEntity,
  type CreateWaitlistEntryInput,
  type WaitlistEntry,
} from '../domain/waitlist.js';
import type { WaitlistRepository } from '../repositories/waitlist-repository.js';

export interface CreateWaitlistSubmissionInput {
  readonly fullName: string;
  readonly businessName: string;
  readonly email: string;
  readonly countryName: string;
  readonly businessLocation: string;
  readonly industry: string;
  readonly companySize: string;
  readonly website?: string | null;
  readonly noWebsite: boolean;
  readonly biggestChallenge: string;
  readonly implementationTimeframe: string;
  readonly clientContext?: Record<string, unknown> | null;
}

export interface WaitlistServiceLogger {
  info(event: string, details: Record<string, unknown>): void;
}

export class WaitlistService {
  constructor(
    private readonly repository: WaitlistRepository,
    private readonly logger: WaitlistServiceLogger,
  ) {}

  async create(input: CreateWaitlistSubmissionInput): Promise<WaitlistEntry> {
    const trimmedEmail = input.email.trim();
    const entityInput: CreateWaitlistEntryInput = {
      fullName: input.fullName,
      businessName: input.businessName,
      email: trimmedEmail,
      emailNormalized: trimmedEmail.toLowerCase(),
      countryName: input.countryName.trim(),
      businessLocation: input.businessLocation,
      industry: input.industry,
      companySize: input.companySize,
      website: input.noWebsite ? null : (input.website ?? null),
      noWebsite: input.noWebsite,
      biggestChallenge: input.biggestChallenge,
      implementationTimeframe: input.implementationTimeframe,
      clientContext: input.clientContext ?? null,
    };

    const entry = createWaitlistEntryEntity(entityInput);
    const created = await this.repository.create(entry);

    this.logger.info('waitlist.created', {
      correlationId: createCorrelationId(),
      component: 'experience-engine',
      waitlistEntryId: created.id,
    });

    return created;
  }

  async findByEmailNormalized(emailNormalized: string): Promise<WaitlistEntry | null> {
    return this.repository.findByEmailNormalized(emailNormalized);
  }
}
