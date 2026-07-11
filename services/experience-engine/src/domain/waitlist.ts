import { randomUUID } from 'node:crypto';

export type WaitlistStatus = 'waiting';

export interface WaitlistEntry {
  readonly id: string;
  readonly createdAt: string;
  readonly status: WaitlistStatus;
  readonly fullName: string;
  readonly businessName: string;
  readonly email: string;
  readonly emailNormalized: string;
  readonly countryName: string;
  readonly businessLocation: string;
  readonly industry: string;
  readonly companySize: string;
  readonly website: string | null;
  readonly noWebsite: boolean;
  readonly biggestChallenge: string;
  readonly implementationTimeframe: string;
  readonly clientContext: Record<string, unknown> | null;
}

export interface CreateWaitlistEntryInput {
  readonly fullName: string;
  readonly businessName: string;
  readonly email: string;
  readonly emailNormalized: string;
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

export function buildWaitlistEntryId(): string {
  return `waitlist_${randomUUID()}`;
}

export function createWaitlistEntryEntity(
  input: CreateWaitlistEntryInput,
  now: string = new Date().toISOString(),
): WaitlistEntry {
  return {
    id: buildWaitlistEntryId(),
    createdAt: now,
    status: 'waiting',
    fullName: input.fullName,
    businessName: input.businessName,
    email: input.email,
    emailNormalized: input.emailNormalized,
    countryName: input.countryName,
    businessLocation: input.businessLocation,
    industry: input.industry,
    companySize: input.companySize,
    website: input.noWebsite ? null : (input.website ?? null),
    noWebsite: input.noWebsite,
    biggestChallenge: input.biggestChallenge,
    implementationTimeframe: input.implementationTimeframe,
    clientContext: input.clientContext ?? null,
  };
}
