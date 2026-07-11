import { describe, expect, it, vi } from 'vitest';
import type { UpsertProspectInput } from '@experience-platform/shared-types';
import { ProspectService } from '../src/application/prospect-service.js';
import { createDatabase } from '../src/infrastructure/database/connection.js';
import { SqliteProspectRepository } from '../src/infrastructure/repositories/sqlite-prospect-repository.js';

const prospectInput: UpsertProspectInput = {
  fullName: 'John Smith',
  businessName: "Joe's Plumbing",
  email: 'john@example.com',
  phoneNumber: '+31612345678',
  businessMarket: 'NL',
  industry: 'plumbing',
  businessLocation: 'Amsterdam, Netherlands',
  companySize: '2-5',
  website: 'https://joesplumbing.nl',
  biggestChallenge: 'never_miss_calls',
  implementationTimeframe: 'within_3_months',
};

function createService(): ProspectService {
  const database = createDatabase();
  const repository = new SqliteProspectRepository(database);
  return new ProspectService(repository, { info: vi.fn() });
}

describe('ProspectService', () => {
  it('creates a new prospect', async () => {
    const service = createService();
    const created = await service.upsert(prospectInput);

    expect(created.prospectId).toMatch(/^prospect_/);
    expect(created.email).toBe(prospectInput.email);
    expect(created.businessMarket).toBe('NL');
  });

  it('updates an existing prospect matched by email', async () => {
    const service = createService();
    const created = await service.upsert(prospectInput);

    const updated = await service.upsert({
      ...prospectInput,
      fullName: 'Johnny Smith',
      businessName: 'Smith Plumbing',
    });

    expect(updated.prospectId).toBe(created.prospectId);
    expect(updated.fullName).toBe('Johnny Smith');
    expect(updated.businessName).toBe('Smith Plumbing');
  });

  it('updates phone_number and business_market on email match', async () => {
    const service = createService();
    const created = await service.upsert(prospectInput);

    const updated = await service.upsert({
      ...prospectInput,
      phoneNumber: '+14155552671',
      businessMarket: 'US',
    });

    expect(updated.prospectId).toBe(created.prospectId);
    expect(updated.phoneNumber).toBe('+14155552671');
    expect(updated.businessMarket).toBe('US');
  });

  it('finds prospects by email and phone number', async () => {
    const service = createService();
    const created = await service.upsert(prospectInput);

    const byEmail = await service.findByEmail(prospectInput.email);
    const byPhone = await service.findByPhoneNumber(prospectInput.phoneNumber);

    expect(byEmail?.prospectId).toBe(created.prospectId);
    expect(byPhone?.prospectId).toBe(created.prospectId);
  });

  it('supports legacy prospects without business_market until updated', async () => {
    const database = createDatabase();
    const repository = new SqliteProspectRepository(database);
    const service = new ProspectService(repository, { info: vi.fn() });

    const legacy = await repository.create({
      prospectId: 'prospect_legacy_1',
      fullName: prospectInput.fullName,
      businessName: prospectInput.businessName,
      email: 'legacy@example.com',
      phoneNumber: '+31600000000',
      businessMarket: null,
      industry: prospectInput.industry,
      businessLocation: prospectInput.businessLocation,
      companySize: prospectInput.companySize,
      website: prospectInput.website ?? null,
      biggestChallenge: prospectInput.biggestChallenge,
      implementationTimeframe: prospectInput.implementationTimeframe,
      currentStatus: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const updated = await service.upsert({
      ...prospectInput,
      email: legacy.email,
      phoneNumber: '+31646275553',
      businessMarket: 'NL',
    });

    expect(updated.prospectId).toBe(legacy.prospectId);
    expect(updated.phoneNumber).toBe('+31646275553');
    expect(updated.businessMarket).toBe('NL');
  });

  it('does not expose a delete path for permanent prospect data', () => {
    expect('delete' in ProspectService.prototype).toBe(false);
    expect('delete' in SqliteProspectRepository.prototype).toBe(false);
  });
});
