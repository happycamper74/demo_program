import { describe, expect, it } from 'vitest';
import { AnalyticsService } from '../src/analytics-service.js';
import { InMemoryAnalyticsEventRepository } from '../src/repositories/in-memory-analytics-event-repository.js';
import { SqliteAnalyticsEventRepository } from '../src/repositories/sqlite-analytics-event-repository.js';
import { createAnalyticsDatabase } from '../src/infrastructure/database/connection.js';

describe('AnalyticsService', () => {
  it('records immutable analytics events', async () => {
    const service = new AnalyticsService(new InMemoryAnalyticsEventRepository());
    const recorded = await service.recordEvent({
      eventName: 'landing.viewed',
      payload: { source: 'test' },
    });

    expect(recorded.eventId).toBeTruthy();
    expect(recorded.eventName).toBe('landing.viewed');
    expect(recorded.payload.source).toBe('test');
  });

  it('aggregates conversion funnel with drop-off and timing', async () => {
    const service = new AnalyticsService(new InMemoryAnalyticsEventRepository());

    await service.recordEvent({
      eventName: 'landing.viewed',
      experienceSessionId: 'sess_1',
    });
    await service.recordEvent({
      eventName: 'industry.selected',
      experienceSessionId: 'sess_1',
      industry: 'plumbing',
      occurredAt: new Date(Date.now() + 1000).toISOString(),
    });
    await service.recordEvent({
      eventName: 'demo.started',
      experienceSessionId: 'sess_1',
      industry: 'plumbing',
      occurredAt: new Date(Date.now() + 3000).toISOString(),
    });
    await service.recordEvent({
      eventName: 'discovery.booked',
      experienceSessionId: 'sess_1',
      industry: 'plumbing',
      occurredAt: new Date(Date.now() + 8000).toISOString(),
    });

    const funnel = await service.getFunnelReport();
    const landing = funnel.stages.find((stage) => stage.stage === 'landing.viewed');
    const industry = funnel.stages.find((stage) => stage.stage === 'industry.selected');
    const discovery = funnel.stages.find((stage) => stage.stage === 'discovery.booked');

    expect(landing?.count).toBe(1);
    expect(industry?.drop_off_from_previous).toBe(0);
    expect(discovery?.count).toBe(1);
  });

  it('aggregates industry demand including discovery booked', async () => {
    const service = new AnalyticsService(new InMemoryAnalyticsEventRepository());

    await service.recordEvent({ eventName: 'industry.selected', industry: 'plumbing' });
    await service.recordEvent({ eventName: 'demo.started', industry: 'plumbing' });
    await service.recordEvent({ eventName: 'lead.ready', industry: 'plumbing' });
    await service.recordEvent({ eventName: 'discovery.booked', industry: 'plumbing' });
    await service.recordEvent({ eventName: 'industry.selected', industry: 'electrical' });

    const report = await service.getIndustryDemandReport();
    const plumbing = report.industries.find((row) => row.industry === 'plumbing');

    expect(plumbing?.industry_selected).toBe(1);
    expect(plumbing?.demo_started).toBe(1);
    expect(plumbing?.demo_completed).toBe(1);
    expect(plumbing?.discovery_booked).toBe(1);
  });

  it('persists events in sqlite storage isolated from demo cleanup', async () => {
    const database = createAnalyticsDatabase();
    const service = new AnalyticsService(new SqliteAnalyticsEventRepository(database));

    await service.recordEvent({ eventName: 'discovery.booked', industry: 'plumbing' });
    const events = await service.getIndustryDemandReport();

    expect(events.industries[0]?.discovery_booked).toBe(1);
  });
});
