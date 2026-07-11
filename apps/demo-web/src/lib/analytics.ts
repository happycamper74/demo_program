import { DemoApiClient } from '../api/demo-api-client.js';

const client = new DemoApiClient();

export type ClientAnalyticsEventName =
  | 'landing.viewed'
  | 'industry.selected'
  | 'discovery.clicked';

export function recordClientAnalyticsEvent(
  eventName: ClientAnalyticsEventName,
  details?: {
    experienceSessionId?: string;
    prospectId?: string;
    industry?: string;
    payload?: Record<string, unknown>;
  },
): void {
  void client
    .recordAnalyticsEvent({
      event_name: eventName,
      experience_session_id: details?.experienceSessionId,
      prospect_id: details?.prospectId,
      industry: details?.industry,
      payload: details?.payload,
    })
    .catch(() => undefined);
}
