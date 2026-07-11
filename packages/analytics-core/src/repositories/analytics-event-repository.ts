import type { AnalyticsEvent, AnalyticsEventName, RecordAnalyticsEventInput } from '../types.js';

export interface AnalyticsEventRepository {
  record(input: RecordAnalyticsEventInput): Promise<AnalyticsEvent>;
  listByEventName(eventName: AnalyticsEventName): Promise<readonly AnalyticsEvent[]>;
  listAll(): Promise<readonly AnalyticsEvent[]>;
}
