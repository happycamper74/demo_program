import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { AnalyticsEvent, AnalyticsEventName, RecordAnalyticsEventInput } from '../types.js';
import type { AnalyticsEventRepository } from './analytics-event-repository.js';

interface AnalyticsEventRow {
  event_id: string;
  event_name: AnalyticsEventName;
  occurred_at: string;
  experience_session_id: string | null;
  prospect_id: string | null;
  industry: string | null;
  payload_json: string;
}

function mapRow(row: AnalyticsEventRow): AnalyticsEvent {
  return {
    eventId: row.event_id,
    eventName: row.event_name,
    occurredAt: row.occurred_at,
    experienceSessionId: row.experience_session_id,
    prospectId: row.prospect_id,
    industry: row.industry,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
  };
}

export class SqliteAnalyticsEventRepository implements AnalyticsEventRepository {
  constructor(private readonly database: Database.Database) {}

  async record(input: RecordAnalyticsEventInput): Promise<AnalyticsEvent> {
    const event: AnalyticsEvent = {
      eventId: randomUUID(),
      eventName: input.eventName,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      experienceSessionId: input.experienceSessionId ?? null,
      prospectId: input.prospectId ?? null,
      industry: input.industry ?? null,
      payload: input.payload ?? {},
    };

    this.database
      .prepare(
        `INSERT INTO analytics_events (
          event_id,
          event_name,
          occurred_at,
          experience_session_id,
          prospect_id,
          industry,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        event.eventId,
        event.eventName,
        event.occurredAt,
        event.experienceSessionId,
        event.prospectId,
        event.industry,
        JSON.stringify(event.payload),
      );

    return event;
  }

  async listByEventName(eventName: AnalyticsEventName): Promise<readonly AnalyticsEvent[]> {
    const rows = this.database
      .prepare('SELECT * FROM analytics_events WHERE event_name = ? ORDER BY occurred_at ASC')
      .all(eventName) as AnalyticsEventRow[];

    return rows.map(mapRow);
  }

  async listAll(): Promise<readonly AnalyticsEvent[]> {
    const rows = this.database
      .prepare('SELECT * FROM analytics_events ORDER BY occurred_at ASC')
      .all() as AnalyticsEventRow[];

    return rows.map(mapRow);
  }
}
