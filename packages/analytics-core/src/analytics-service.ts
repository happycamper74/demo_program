import type { AnalyticsEventRepository } from './repositories/analytics-event-repository.js';
import {
  FUNNEL_STAGE_ORDER,
  type AnalyticsEventName,
  type FunnelReport,
  type FunnelStageReport,
  type IndustryDemandReport,
  type RecordAnalyticsEventInput,
} from './types.js';

export class AnalyticsService {
  constructor(private readonly repository: AnalyticsEventRepository) {}

  async recordEvent(input: RecordAnalyticsEventInput) {
    return this.repository.record(input);
  }

  async getFunnelReport(): Promise<FunnelReport> {
    const allEvents = await this.repository.listAll();
    const stages: FunnelStageReport[] = [];

    for (let index = 0; index < FUNNEL_STAGE_ORDER.length; index += 1) {
      const stage = FUNNEL_STAGE_ORDER[index] as AnalyticsEventName;
      const stageEvents = allEvents.filter((event) => event.eventName === stage);
      const count = stageEvents.length;

      let dropOffFromPrevious: number | null = null;
      let dropOffRateFromPrevious: number | null = null;
      let averageSecondsFromPrevious: number | null = null;

      if (index > 0) {
        const previousStage = FUNNEL_STAGE_ORDER[index - 1] as AnalyticsEventName;
        const previousCount = allEvents.filter((event) => event.eventName === previousStage).length;
        dropOffFromPrevious = Math.max(previousCount - count, 0);
        dropOffRateFromPrevious =
          previousCount > 0 ? Number((dropOffFromPrevious / previousCount).toFixed(4)) : null;
        averageSecondsFromPrevious = computeAverageStageDuration(
          allEvents,
          previousStage,
          stage,
        );
      }

      stages.push({
        stage,
        count,
        drop_off_from_previous: dropOffFromPrevious,
        drop_off_rate_from_previous: dropOffRateFromPrevious,
        average_seconds_from_previous: averageSecondsFromPrevious,
      });
    }

    return {
      stages,
      generated_at: new Date().toISOString(),
    };
  }

  async listEventsForSession(experienceSessionId: string) {
    const allEvents = await this.repository.listAll();
    return allEvents.filter((event) => event.experienceSessionId === experienceSessionId);
  }

  async getIndustryDemandReport(): Promise<IndustryDemandReport> {
    const allEvents = await this.repository.listAll();
    const industries = new Map<string, {
      industry: string;
      industry_selected: number;
      demo_started: number;
      demo_completed: number;
      discovery_booked: number;
    }>();

    const ensureRow = (industry: string) => {
      const key = industry.trim().toLowerCase();
      const existing = industries.get(key);
      if (existing) {
        return existing;
      }

      const row = {
        industry: key,
        industry_selected: 0,
        demo_started: 0,
        demo_completed: 0,
        discovery_booked: 0,
      };
      industries.set(key, row);
      return row;
    };

    for (const event of allEvents) {
      const industry = event.industry?.trim().toLowerCase();
      if (!industry) {
        continue;
      }

      const row = ensureRow(industry);

      switch (event.eventName) {
        case 'industry.selected':
          row.industry_selected += 1;
          break;
        case 'demo.started':
          row.demo_started += 1;
          break;
        case 'lead.ready':
          row.demo_completed += 1;
          break;
        case 'discovery.booked':
          row.discovery_booked += 1;
          break;
        default:
          break;
      }
    }

    return {
      industries: [...industries.values()].sort((left, right) =>
        left.industry.localeCompare(right.industry),
      ),
      generated_at: new Date().toISOString(),
    };
  }
}

function computeAverageStageDuration(
  events: readonly {
    readonly eventName: AnalyticsEventName;
    readonly occurredAt: string;
    readonly experienceSessionId: string | null;
  }[],
  fromStage: AnalyticsEventName,
  toStage: AnalyticsEventName,
): number | null {
  const durations: number[] = [];

  const sessions = new Set(
    events
      .filter((event) => event.experienceSessionId)
      .map((event) => event.experienceSessionId as string),
  );

  for (const sessionId of sessions) {
    const fromEvent = events.find(
      (event) => event.experienceSessionId === sessionId && event.eventName === fromStage,
    );
    const toEvent = events.find(
      (event) => event.experienceSessionId === sessionId && event.eventName === toStage,
    );

    if (!fromEvent || !toEvent) {
      continue;
    }

    const delta =
      (new Date(toEvent.occurredAt).getTime() - new Date(fromEvent.occurredAt).getTime()) / 1000;

    if (delta >= 0) {
      durations.push(delta);
    }
  }

  if (durations.length === 0) {
    return null;
  }

  const total = durations.reduce((sum, value) => sum + value, 0);
  return Number((total / durations.length).toFixed(2));
}
