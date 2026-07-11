/**
 * Local development persistence adapter.
 * Business logic depends on WaitlistRepository, not this implementation.
 */
import type Database from 'better-sqlite3';
import { WaitlistEmailExistsError } from '../../domain/waitlist-errors.js';
import type { WaitlistEntry } from '../../domain/waitlist.js';
import type { WaitlistRepository } from '../../repositories/waitlist-repository.js';

interface WaitlistEntryRow {
  id: string;
  created_at: string;
  status: WaitlistEntry['status'];
  full_name: string;
  business_name: string;
  email: string;
  email_normalized: string;
  country_name: string;
  business_location: string;
  industry: string;
  company_size: string;
  website: string | null;
  no_website: number;
  biggest_challenge: string;
  implementation_timeframe: string;
  client_context: string | null;
}

function mapRowToWaitlistEntry(row: WaitlistEntryRow): WaitlistEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    fullName: row.full_name,
    businessName: row.business_name,
    email: row.email,
    emailNormalized: row.email_normalized,
    countryName: row.country_name,
    businessLocation: row.business_location,
    industry: row.industry,
    companySize: row.company_size,
    website: row.website,
    noWebsite: row.no_website === 1,
    biggestChallenge: row.biggest_challenge,
    implementationTimeframe: row.implementation_timeframe,
    clientContext: row.client_context ? (JSON.parse(row.client_context) as Record<string, unknown>) : null,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}

export class SqliteWaitlistRepository implements WaitlistRepository {
  constructor(private readonly database: Database.Database) {}

  async create(entry: WaitlistEntry): Promise<WaitlistEntry> {
    try {
      this.database
        .prepare(
          `INSERT INTO waitlist_entries (
            id,
            created_at,
            status,
            full_name,
            business_name,
            email,
            email_normalized,
            country_name,
            business_location,
            industry,
            company_size,
            website,
            no_website,
            biggest_challenge,
            implementation_timeframe,
            client_context
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          entry.id,
          entry.createdAt,
          entry.status,
          entry.fullName,
          entry.businessName,
          entry.email,
          entry.emailNormalized,
          entry.countryName,
          entry.businessLocation,
          entry.industry,
          entry.companySize,
          entry.website,
          entry.noWebsite ? 1 : 0,
          entry.biggestChallenge,
          entry.implementationTimeframe,
          entry.clientContext ? JSON.stringify(entry.clientContext) : null,
        );
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new WaitlistEmailExistsError(entry.emailNormalized);
      }

      throw error;
    }

    return entry;
  }

  async findByEmailNormalized(emailNormalized: string): Promise<WaitlistEntry | null> {
    const row = this.database
      .prepare('SELECT * FROM waitlist_entries WHERE email_normalized = ?')
      .get(emailNormalized) as WaitlistEntryRow | undefined;

    return row ? mapRowToWaitlistEntry(row) : null;
  }

  async findById(id: string): Promise<WaitlistEntry | null> {
    const row = this.database
      .prepare('SELECT * FROM waitlist_entries WHERE id = ?')
      .get(id) as WaitlistEntryRow | undefined;

    return row ? mapRowToWaitlistEntry(row) : null;
  }
}
