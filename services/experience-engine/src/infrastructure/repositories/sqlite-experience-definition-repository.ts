/**
 * Local development persistence adapter.
 * Business logic depends on ExperienceDefinitionRepository, not this implementation.
 */
import type Database from 'better-sqlite3';
import type { ExperienceDefinition } from '@experience-platform/shared-types';
import type { ExperienceDefinitionRepository } from '../../repositories/experience-definition-repository.js';

interface ExperienceDefinitionRow {
  experience_definition_id: string;
  name: string;
  slug: string;
  version: string;
  industry: string;
  status: ExperienceDefinition['status'];
  estimated_duration_seconds: number;
  maximum_call_duration_seconds: number;
  scenario: string;
  ai_agent_identifier: string;
  booking_configuration: string;
  active: number;
  created_at: string;
  updated_at: string;
}

function mapRowToDefinition(row: ExperienceDefinitionRow): ExperienceDefinition {
  return {
    experienceDefinitionId: row.experience_definition_id,
    name: row.name,
    slug: row.slug,
    version: row.version,
    industry: row.industry,
    status: row.status,
    estimatedDurationSeconds: row.estimated_duration_seconds,
    maximumCallDurationSeconds: row.maximum_call_duration_seconds,
    scenario: JSON.parse(row.scenario) as ExperienceDefinition['scenario'],
    aiAgentIdentifier: row.ai_agent_identifier,
    bookingConfiguration: JSON.parse(row.booking_configuration) as Record<string, unknown>,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteExperienceDefinitionRepository implements ExperienceDefinitionRepository {
  constructor(private readonly database: Database.Database) {}

  async create(definition: ExperienceDefinition): Promise<ExperienceDefinition> {
    this.database
      .prepare(
        `INSERT INTO experience_definitions (
          experience_definition_id,
          name,
          slug,
          version,
          industry,
          status,
          estimated_duration_seconds,
          maximum_call_duration_seconds,
          scenario,
          ai_agent_identifier,
          booking_configuration,
          active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        definition.experienceDefinitionId,
        definition.name,
        definition.slug,
        definition.version,
        definition.industry,
        definition.status,
        definition.estimatedDurationSeconds,
        definition.maximumCallDurationSeconds,
        JSON.stringify(definition.scenario),
        definition.aiAgentIdentifier,
        JSON.stringify(definition.bookingConfiguration),
        definition.active ? 1 : 0,
        definition.createdAt,
        definition.updatedAt,
      );

    return definition;
  }

  async findById(experienceDefinitionId: string): Promise<ExperienceDefinition | null> {
    const row = this.database
      .prepare('SELECT * FROM experience_definitions WHERE experience_definition_id = ?')
      .get(experienceDefinitionId) as ExperienceDefinitionRow | undefined;

    return row ? mapRowToDefinition(row) : null;
  }

  async findBySlugAndVersion(slug: string, version: string): Promise<ExperienceDefinition | null> {
    const row = this.database
      .prepare('SELECT * FROM experience_definitions WHERE slug = ? AND version = ?')
      .get(slug, version) as ExperienceDefinitionRow | undefined;

    return row ? mapRowToDefinition(row) : null;
  }

  async findByIndustry(industry: string): Promise<ExperienceDefinition[]> {
    const rows = this.database
      .prepare('SELECT * FROM experience_definitions WHERE industry = ? ORDER BY created_at ASC')
      .all(industry) as ExperienceDefinitionRow[];

    return rows.map(mapRowToDefinition);
  }

  async update(definition: ExperienceDefinition): Promise<ExperienceDefinition> {
    this.database
      .prepare(
        `UPDATE experience_definitions
         SET status = ?,
             active = ?,
             updated_at = ?
         WHERE experience_definition_id = ?`,
      )
      .run(
        definition.status,
        definition.active ? 1 : 0,
        definition.updatedAt,
        definition.experienceDefinitionId,
      );

    return definition;
  }
}
