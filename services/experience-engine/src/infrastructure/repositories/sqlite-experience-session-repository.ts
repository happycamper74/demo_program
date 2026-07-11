/**
 * Local development persistence adapter.
 * Business logic depends on ExperienceSessionRepository, not this implementation.
 * Replace with a Postgres adapter for non-local environments without changing services.
 */
import type Database from 'better-sqlite3';
import type { ExperienceSession, ExperienceSessionState } from '@experience-platform/shared-types';
import { ACTIVE_EXPERIENCE_SESSION_STATES } from '../../domain/experience-session.js';
import type { ExperienceSessionRepository, SessionOperationsFilters } from '../../repositories/experience-session-repository.js';

interface ExperienceSessionRow {
  experience_session_id: string;
  prospect_id: string;
  experience_definition_id: string;
  state: ExperienceSessionState;
  recovery_state: ExperienceSession['recoveryState'];
  failure_reason: string | null;
  cleanup_state: ExperienceSession['cleanupState'];
  started_at: string;
  expires_at: string;
  completed_at: string | null;
  purged_at: string | null;
  recovery_previous_state: ExperienceSessionState | null;
  leadboard_demo_session_id: string | null;
  leadboard_lead_id: string | null;
}

function mapRowToSession(row: ExperienceSessionRow): ExperienceSession {
  return {
    experienceSessionId: row.experience_session_id,
    prospectId: row.prospect_id,
    experienceDefinitionId: row.experience_definition_id,
    state: row.state,
    recoveryState: row.recovery_state,
    failureReason: row.failure_reason,
    cleanupState: row.cleanup_state,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
    purgedAt: row.purged_at,
    recoveryPreviousState: row.recovery_previous_state,
    leadboardDemoSessionId: row.leadboard_demo_session_id,
    leadboardLeadId: row.leadboard_lead_id,
  };
}

function buildActiveStatePlaceholders(): string {
  return ACTIVE_EXPERIENCE_SESSION_STATES.map(() => '?').join(', ');
}

export class SqliteExperienceSessionRepository implements ExperienceSessionRepository {
  constructor(private readonly database: Database.Database) {}

  async create(session: ExperienceSession): Promise<ExperienceSession> {
    this.database
      .prepare(
        `INSERT INTO experience_sessions (
          experience_session_id,
          prospect_id,
          experience_definition_id,
          state,
          recovery_state,
          failure_reason,
          cleanup_state,
          started_at,
          expires_at,
          completed_at,
          purged_at,
          recovery_previous_state,
          leadboard_demo_session_id,
          leadboard_lead_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        session.experienceSessionId,
        session.prospectId,
        session.experienceDefinitionId,
        session.state,
        session.recoveryState,
        session.failureReason,
        session.cleanupState,
        session.startedAt,
        session.expiresAt,
        session.completedAt,
        session.purgedAt,
        session.recoveryPreviousState,
        session.leadboardDemoSessionId,
        session.leadboardLeadId,
      );

    return session;
  }

  async update(session: ExperienceSession): Promise<ExperienceSession> {
    this.database
      .prepare(
        `UPDATE experience_sessions
         SET state = ?,
             recovery_state = ?,
             failure_reason = ?,
             cleanup_state = ?,
             expires_at = ?,
             completed_at = ?,
             purged_at = ?,
             recovery_previous_state = ?,
             leadboard_demo_session_id = ?,
             leadboard_lead_id = ?
         WHERE experience_session_id = ?`,
      )
      .run(
        session.state,
        session.recoveryState,
        session.failureReason,
        session.cleanupState,
        session.expiresAt,
        session.completedAt,
        session.purgedAt,
        session.recoveryPreviousState,
        session.leadboardDemoSessionId,
        session.leadboardLeadId,
        session.experienceSessionId,
      );

    return session;
  }

  async findById(experienceSessionId: string): Promise<ExperienceSession | null> {
    const row = this.database
      .prepare('SELECT * FROM experience_sessions WHERE experience_session_id = ?')
      .get(experienceSessionId) as ExperienceSessionRow | undefined;

    return row ? mapRowToSession(row) : null;
  }

  async findActiveByProspectAndDefinition(
    prospectId: string,
    experienceDefinitionId: string,
  ): Promise<ExperienceSession | null> {
    const row = this.database
      .prepare(
        `SELECT * FROM experience_sessions
         WHERE prospect_id = ?
           AND experience_definition_id = ?
           AND state IN (${buildActiveStatePlaceholders()})
         ORDER BY started_at DESC
         LIMIT 1`,
      )
      .get(prospectId, experienceDefinitionId, ...ACTIVE_EXPERIENCE_SESSION_STATES) as
      | ExperienceSessionRow
      | undefined;

    return row ? mapRowToSession(row) : null;
  }

  async findCompletedByProspectAndDefinition(
    prospectId: string,
    experienceDefinitionId: string,
  ): Promise<ExperienceSession | null> {
    const row = this.database
      .prepare(
        `SELECT * FROM experience_sessions
         WHERE prospect_id = ?
           AND experience_definition_id = ?
           AND state = 'Completed'
           AND completed_at IS NOT NULL
         ORDER BY completed_at DESC
         LIMIT 1`,
      )
      .get(prospectId, experienceDefinitionId) as ExperienceSessionRow | undefined;

    return row ? mapRowToSession(row) : null;
  }

  async listActiveForOperations(): Promise<ExperienceSession[]> {
    const rows = this.database
      .prepare(
        `SELECT * FROM experience_sessions
         WHERE state IN (${buildActiveStatePlaceholders()})
         ORDER BY started_at DESC`,
      )
      .all(...ACTIVE_EXPERIENCE_SESSION_STATES) as ExperienceSessionRow[];

    return rows.map(mapRowToSession);
  }

  async searchForOperations(filters: SessionOperationsFilters): Promise<ExperienceSession[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.experienceSessionId) {
      conditions.push('es.experience_session_id = ?');
      params.push(filters.experienceSessionId);
    }

    if (filters.startedAfter) {
      conditions.push('es.started_at >= ?');
      params.push(filters.startedAfter);
    }

    if (filters.startedBefore) {
      conditions.push('es.started_at <= ?');
      params.push(filters.startedBefore);
    }

    if (filters.prospectName) {
      conditions.push('p.full_name LIKE ?');
      params.push(`%${filters.prospectName}%`);
    }

    if (filters.businessName) {
      conditions.push('p.business_name LIKE ?');
      params.push(`%${filters.businessName}%`);
    }

    if (filters.email) {
      conditions.push('p.email LIKE ?');
      params.push(`%${filters.email}%`);
    }

    if (filters.phone) {
      conditions.push('p.phone_number LIKE ?');
      params.push(`%${filters.phone}%`);
    }

    if (filters.industry) {
      conditions.push('LOWER(p.industry) = ?');
      params.push(filters.industry.trim().toLowerCase());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.database
      .prepare(
        `SELECT es.*
         FROM experience_sessions es
         JOIN prospects p ON p.prospect_id = es.prospect_id
         ${whereClause}
         ORDER BY es.started_at DESC
         LIMIT 100`,
      )
      .all(...params) as ExperienceSessionRow[];

    return rows.map(mapRowToSession);
  }
}
