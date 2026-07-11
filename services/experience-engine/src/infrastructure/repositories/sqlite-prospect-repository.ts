/**
 * Local development persistence adapter.
 * Business logic depends on ProspectRepository, not this implementation.
 */
import type Database from 'better-sqlite3';
import type { DemoMarket, Prospect } from '@experience-platform/shared-types';
import type { ProspectRepository } from '../../repositories/prospect-repository.js';

interface ProspectRow {
  prospect_id: string;
  full_name: string;
  business_name: string;
  email: string;
  phone_number: string;
  business_market: DemoMarket | null | undefined;
  industry: string;
  business_location: string;
  company_size: string;
  website: string | null;
  biggest_challenge: string;
  implementation_timeframe: string;
  current_status: Prospect['currentStatus'];
  created_at: string;
  updated_at: string;
}

function mapRowToProspect(row: ProspectRow): Prospect {
  return {
    prospectId: row.prospect_id,
    fullName: row.full_name,
    businessName: row.business_name,
    email: row.email,
    phoneNumber: row.phone_number,
    businessMarket: row.business_market ?? null,
    industry: row.industry,
    businessLocation: row.business_location,
    companySize: row.company_size,
    website: row.website,
    biggestChallenge: row.biggest_challenge,
    implementationTimeframe: row.implementation_timeframe,
    currentStatus: row.current_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteProspectRepository implements ProspectRepository {
  constructor(private readonly database: Database.Database) {}

  async create(prospect: Prospect): Promise<Prospect> {
    this.database
      .prepare(
        `INSERT INTO prospects (
          prospect_id,
          full_name,
          business_name,
          email,
          phone_number,
          business_market,
          industry,
          business_location,
          company_size,
          website,
          biggest_challenge,
          implementation_timeframe,
          current_status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        prospect.prospectId,
        prospect.fullName,
        prospect.businessName,
        prospect.email,
        prospect.phoneNumber,
        prospect.businessMarket,
        prospect.industry,
        prospect.businessLocation,
        prospect.companySize,
        prospect.website,
        prospect.biggestChallenge,
        prospect.implementationTimeframe,
        prospect.currentStatus,
        prospect.createdAt,
        prospect.updatedAt,
      );

    return prospect;
  }

  async update(prospect: Prospect): Promise<Prospect> {
    this.database
      .prepare(
        `UPDATE prospects
         SET full_name = ?,
             business_name = ?,
             email = ?,
             phone_number = ?,
             business_market = ?,
             industry = ?,
             business_location = ?,
             company_size = ?,
             website = ?,
             biggest_challenge = ?,
             implementation_timeframe = ?,
             updated_at = ?
         WHERE prospect_id = ?`,
      )
      .run(
        prospect.fullName,
        prospect.businessName,
        prospect.email,
        prospect.phoneNumber,
        prospect.businessMarket,
        prospect.industry,
        prospect.businessLocation,
        prospect.companySize,
        prospect.website,
        prospect.biggestChallenge,
        prospect.implementationTimeframe,
        prospect.updatedAt,
        prospect.prospectId,
      );

    return prospect;
  }

  async findById(prospectId: string): Promise<Prospect | null> {
    const row = this.database
      .prepare('SELECT * FROM prospects WHERE prospect_id = ?')
      .get(prospectId) as ProspectRow | undefined;

    return row ? mapRowToProspect(row) : null;
  }

  async findByEmail(email: string): Promise<Prospect | null> {
    const row = this.database
      .prepare('SELECT * FROM prospects WHERE email = ?')
      .get(email) as ProspectRow | undefined;

    return row ? mapRowToProspect(row) : null;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<Prospect | null> {
    const row = this.database
      .prepare('SELECT * FROM prospects WHERE phone_number = ?')
      .get(phoneNumber) as ProspectRow | undefined;

    return row ? mapRowToProspect(row) : null;
  }
}
