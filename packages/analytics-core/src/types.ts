export const ANALYTICS_EVENT_NAMES = [
  'landing.viewed',
  'industry.selected',
  'qualification.completed',
  'demo.started',
  'call.started',
  'call.completed',
  'lead.ready',
  'lead.viewed',
  'discovery.clicked',
  'discovery.booked',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export const FUNNEL_STAGE_ORDER: readonly AnalyticsEventName[] = [
  'landing.viewed',
  'industry.selected',
  'qualification.completed',
  'demo.started',
  'call.started',
  'call.completed',
  'lead.ready',
  'lead.viewed',
  'discovery.clicked',
  'discovery.booked',
];

export interface AnalyticsEvent {
  readonly eventId: string;
  readonly eventName: AnalyticsEventName;
  readonly occurredAt: string;
  readonly experienceSessionId: string | null;
  readonly prospectId: string | null;
  readonly industry: string | null;
  readonly payload: Record<string, unknown>;
}

export interface RecordAnalyticsEventInput {
  readonly eventName: AnalyticsEventName;
  readonly occurredAt?: string;
  readonly experienceSessionId?: string | null;
  readonly prospectId?: string | null;
  readonly industry?: string | null;
  readonly payload?: Record<string, unknown>;
}

export interface FunnelStageReport {
  readonly stage: AnalyticsEventName;
  readonly count: number;
  readonly drop_off_from_previous: number | null;
  readonly drop_off_rate_from_previous: number | null;
  readonly average_seconds_from_previous: number | null;
}

export interface FunnelReport {
  readonly stages: readonly FunnelStageReport[];
  readonly generated_at: string;
}

export interface IndustryDemandReportRow {
  readonly industry: string;
  readonly industry_selected: number;
  readonly demo_started: number;
  readonly demo_completed: number;
  readonly discovery_booked: number;
}

export interface IndustryDemandReport {
  readonly industries: readonly IndustryDemandReportRow[];
  readonly generated_at: string;
}
