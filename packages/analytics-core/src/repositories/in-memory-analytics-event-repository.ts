import { randomUUID } from 'node:crypto';
import type { AnalyticsEvent, AnalyticsEventName, RecordAnalyticsEventInput } from '../types.js';
import type { AnalyticsEventRepository } from './analytics-event-repository.js';

export class InMemoryAnalyticsEventRepository implements AnalyticsEventRepository {
  private readonly events: AnalyticsEvent[] = [];

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

    this.events.push(event);
    return event;
  }

  async listByEventName(eventName: AnalyticsEventName): Promise<readonly AnalyticsEvent[]> {
    return this.events.filter((event) => event.eventName === eventName);
  }

  async listAll(): Promise<readonly AnalyticsEvent[]> {
    return [...this.events];
  }
}
