import { randomUUID } from 'node:crypto';
import type { DemoMarket, Prospect, UpsertProspectInput } from '@experience-platform/shared-types';

export function buildProspectId(): string {
  return `prospect_${randomUUID()}`;
}

export function createProspectEntity(
  input: UpsertProspectInput,
  now: string = new Date().toISOString(),
): Prospect {
  return {
    prospectId: buildProspectId(),
    fullName: input.fullName,
    businessName: input.businessName,
    email: input.email,
    phoneNumber: input.phoneNumber,
    businessMarket: input.businessMarket ?? null,
    industry: input.industry,
    businessLocation: input.businessLocation,
    companySize: input.companySize,
    website: input.website ?? null,
    biggestChallenge: input.biggestChallenge,
    implementationTimeframe: input.implementationTimeframe,
    currentStatus: 'new',
    createdAt: now,
    updatedAt: now,
  };
}

export function updateProspectEntity(
  existing: Prospect,
  input: UpsertProspectInput,
  now: string = new Date().toISOString(),
): Prospect {
  return {
    ...existing,
    fullName: input.fullName,
    businessName: input.businessName,
    email: input.email,
    phoneNumber: input.phoneNumber,
    businessMarket: input.businessMarket ?? existing.businessMarket,
    industry: input.industry,
    businessLocation: input.businessLocation,
    companySize: input.companySize,
    website: input.website ?? null,
    biggestChallenge: input.biggestChallenge,
    implementationTimeframe: input.implementationTimeframe,
    updatedAt: now,
  };
}

export function isDemoMarket(market: string): market is DemoMarket {
  return market === 'NL' || market === 'US';
}
