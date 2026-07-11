export { AnalyticsService } from './analytics-service.js';
export { createAnalyticsDatabase } from './infrastructure/database/connection.js';
export { InMemoryAnalyticsEventRepository } from './repositories/in-memory-analytics-event-repository.js';
export { SqliteAnalyticsEventRepository } from './repositories/sqlite-analytics-event-repository.js';
export type { AnalyticsEventRepository } from './repositories/analytics-event-repository.js';
export {
  ANALYTICS_EVENT_NAMES,
  FUNNEL_STAGE_ORDER,
} from './types.js';
export type {
  AnalyticsEvent,
  AnalyticsEventName,
  FunnelReport,
  FunnelStageReport,
  IndustryDemandReport,
  IndustryDemandReportRow,
  RecordAnalyticsEventInput,
} from './types.js';
