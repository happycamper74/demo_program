export const APP_NAME = 'demo-web' as const;

export const DEMO_API_BASE_URL = import.meta.env.VITE_DEMO_API_BASE_URL ?? '/api/demo/v1';

export const EXPERIENCE_DEFINITION_ID = 'expdef_plumbing_demo_v1';

export const SUPPORTED_INDUSTRY = 'plumbing';

export type BusinessMarket = 'NL' | 'US' | 'OTHER';

export const BUSINESS_MARKET_OPTIONS = [
  { value: 'NL' as const, label: 'Netherlands' },
  { value: 'US' as const, label: 'United States' },
  { value: 'OTHER' as const, label: 'Another Country' },
] as const;

export const COUNTRY_NAME_MAX_LENGTH = 100;

export const INDUSTRY_OPTIONS = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'other', label: 'Other' },
] as const;

export const COMPANY_SIZE_OPTIONS = ['1', '2-5', '6-10', '11-25', '26+'] as const;

export const IMPLEMENTATION_TIMEFRAME_OPTIONS = [
  { value: 'within_1_month', label: 'Within 1 month' },
  { value: 'within_3_months', label: 'Within 3 months' },
  { value: 'within_6_months', label: 'Within 6 months' },
  { value: 'exploring', label: 'Just exploring' },
] as const;

export const CHALLENGE_OPTIONS = [
  { value: 'never_miss_calls', label: 'Never miss customer calls' },
  { value: 'reduce_admin', label: 'Reduce admin work' },
  { value: 'faster_follow_up', label: 'Follow up faster' },
  { value: 'grow_revenue', label: 'Grow revenue' },
] as const;

export const PROGRESS_MILESTONES = [
  { key: 'waiting_for_call', label: 'Waiting for call' },
  { key: 'call_started', label: 'Call received' },
  { key: 'call_completed', label: 'Call completed' },
  { key: 'transcript_ready', label: 'Conversation understood' },
  { key: 'customer_details_ready', label: 'Customer details extracted' },
  { key: 'summary_ready', label: 'Summary ready' },
  { key: 'lead_ready', label: 'Lead ready' },
] as const;

export const FORBIDDEN_SCRIPT_PHRASES = [
  'full script',
  'read this word for word',
  'say exactly',
] as const;

export const UNSUPPORTED_INDUSTRY_NOTICE = {
  title: 'LeadBoard is currently optimized for plumbing businesses',
  message:
    'You are welcome to try the interactive demo. The example call uses a plumbing scenario, but it demonstrates the AI call handling, transcript, lead creation, and automation workflow that could power future industry editions.',
} as const;
