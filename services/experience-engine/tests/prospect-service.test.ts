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

  it('finds prospects by email and phone number', async () => {
    const service = createService();
    const created = await service.upsert(prospectInput);

    const byEmail = await service.findByEmail(prospectInput.email);
    const byPhone = await service.findByPhoneNumber(prospectInput.phoneNumber);

    expect(byEmail?.prospectId).toBe(created.prospectId);
    expect(byPhone?.prospectId).toBe(created.prospectId);
  });

  it('does not expose a delete path for permanent prospect data', () => {
    expect('delete' in ProspectService.prototype).toBe(false);
    expect('delete' in SqliteProspectRepository.prototype).toBe(false);
  });
});
