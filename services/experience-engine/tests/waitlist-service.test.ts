import { describe, expect, it, vi } from 'vitest';
import { WaitlistService, type CreateWaitlistSubmissionInput } from '../src/application/waitlist-service.js';
import { WaitlistEmailExistsError } from '../src/domain/waitlist-errors.js';
import { createDatabase } from '../src/infrastructure/database/connection.js';
import { SqliteWaitlistRepository } from '../src/infrastructure/repositories/sqlite-waitlist-repository.js';

const baseInput: CreateWaitlistSubmissionInput = {
  fullName: '  John Smith  ',
  businessName: "  Joe's Plumbing  ",
  email: 'User@Example.com',
  countryName: '  Germany  ',
  businessLocation: 'Berlin',
  industry: 'plumbing',
  companySize: '2-5',
  website: 'https://example.com',
  noWebsite: false,
  biggestChallenge: 'never_miss_calls',
  implementationTimeframe: 'within_3_months',
  clientContext: { campaign: 'summer', ref: 42 },
};

function createService(): WaitlistService {
  const database = createDatabase();
  const repository = new SqliteWaitlistRepository(database);
  return new WaitlistService(repository, { info: vi.fn() });
}

describe('WaitlistService', () => {
  it('creates a waitlist entry with waiting status', async () => {
    const service = createService();
    const created = await service.create(baseInput);

    expect(created.id).toMatch(/^waitlist_/);
    expect(created.status).toBe('waiting');
  });

  it('persists all qualification fields', async () => {
    const service = createService();
    const created = await service.create({
      ...baseInput,
      email: `fields-${Date.now()}@example.com`,
    });

    const stored = await service.findByEmailNormalized(created.emailNormalized);
    expect(stored).toEqual(created);
    expect(stored?.fullName).toBe(baseInput.fullName);
    expect(stored?.businessName).toBe(baseInput.businessName);
    expect(stored?.countryName).toBe('Germany');
    expect(stored?.businessLocation).toBe(baseInput.businessLocation);
    expect(stored?.industry).toBe(baseInput.industry);
    expect(stored?.companySize).toBe(baseInput.companySize);
    expect(stored?.website).toBe(baseInput.website);
    expect(stored?.noWebsite).toBe(false);
    expect(stored?.biggestChallenge).toBe(baseInput.biggestChallenge);
    expect(stored?.implementationTimeframe).toBe(baseInput.implementationTimeframe);
  });

  it('stores country_name trimmed while preserving full_name and business_name formatting', async () => {
    const service = createService();
    const created = await service.create({
      ...baseInput,
      email: `trim-${Date.now()}@example.com`,
    });

    expect(created.countryName).toBe('Germany');
    expect(created.fullName).toBe('  John Smith  ');
    expect(created.businessName).toBe("  Joe's Plumbing  ");
  });

  it('normalizes email for uniqueness while preserving trimmed submitted email', async () => {
    const service = createService();
    const created = await service.create({
      ...baseInput,
      email: '  User@Example.com  ',
    });

    expect(created.email).toBe('User@Example.com');
    expect(created.emailNormalized).toBe('user@example.com');
  });

  it('throws WAITLIST_EMAIL_EXISTS for duplicate casing and whitespace', async () => {
    const service = createService();
    const email = `duplicate-${Date.now()}@example.com`;

    await service.create({ ...baseInput, email });

    await expect(
      service.create({ ...baseInput, email: `  ${email.toUpperCase()}  ` }),
    ).rejects.toMatchObject({
      name: 'WaitlistEmailExistsError',
      code: 'WAITLIST_EMAIL_EXISTS',
      emailNormalized: email.toLowerCase(),
    });
  });

  it('leaves the existing row unchanged after a duplicate submission', async () => {
    const service = createService();
    const email = `unchanged-${Date.now()}@example.com`;
    const first = await service.create({ ...baseInput, email });

    await expect(
      service.create({
        ...baseInput,
        fullName: 'Different Name',
        businessName: 'Different Business',
        countryName: 'France',
        email: `  ${email.toUpperCase()}  `,
      }),
    ).rejects.toBeInstanceOf(WaitlistEmailExistsError);

    const stored = await service.findByEmailNormalized(first.emailNormalized);
    expect(stored).toEqual(first);
  });

  it('round-trips client_context JSON', async () => {
    const service = createService();
    const created = await service.create({
      ...baseInput,
      email: `json-${Date.now()}@example.com`,
      clientContext: { campaign: 'summer', ref: 42, nested: { source: 'ad' } },
    });

    const stored = await service.findByEmailNormalized(created.emailNormalized);
    expect(stored?.clientContext).toEqual({
      campaign: 'summer',
      ref: 42,
      nested: { source: 'ad' },
    });
  });

  it('resolves concurrent duplicate inserts through the database constraint', async () => {
    const service = createService();
    const email = `concurrent-${Date.now()}@example.com`;
    const input = { ...baseInput, email };

    const results = await Promise.allSettled([
      service.create(input),
      service.create({ ...input, fullName: 'Other User' }),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(WaitlistEmailExistsError);

    const stored = await service.findByEmailNormalized(email.toLowerCase());
    expect(stored?.emailNormalized).toBe(email.toLowerCase());
  });

  it('does not include phone in the persistence contract', () => {
    const submissionKeys = Object.keys(baseInput).sort();
    expect(submissionKeys).not.toContain('phoneNumber');
    expect(submissionKeys).not.toContain('phone_number');

    const database = createDatabase();
    const columns = database
      .prepare('PRAGMA table_info(waitlist_entries)')
      .all()
      .map((row) => (row as { name: string }).name);

    expect(columns).not.toContain('phone_number');
    expect(columns).not.toContain('phone');
  });
});
