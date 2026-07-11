export interface StartDemoRequest {
  readonly full_name: string;
  readonly business_name: string;
  readonly email: string;
  readonly phone_number: string;
  readonly industry: string;
  readonly business_location: string;
  readonly company_size: string;
  readonly website?: string;
  readonly no_website?: boolean;
  readonly biggest_challenge: string;
  readonly implementation_timeframe: string;
  readonly experience_definition_id: string;
  readonly company_website_url?: string;
  readonly challenge_completed?: boolean;
  readonly client_context?: Record<string, unknown>;
}

export interface StartDemoResponse {
  readonly status: 'started';
  readonly prospect_id: string;
  readonly experience_session_id: string;
  readonly experience_version: string;
  readonly industry_supported: boolean;
  readonly session_state: string;
  readonly shared_demo_phone_number: string;
  readonly expected_call_duration_seconds?: number;
  readonly call_timeout_seconds?: number;
  readonly experience_token: string;
  readonly instructions?: {
    readonly title: string;
    readonly message: string;
    readonly scenario_examples: readonly string[];
  };
  readonly industry_notice?: {
    readonly title: string;
    readonly message: string;
  };
  readonly simulate_call_available: boolean;
}

export interface SessionStatusResponse {
  readonly experience_session_id: string;
  readonly state: string;
  readonly current_step: string;
  readonly lead_view_available: boolean;
  readonly restricted_lead_view_url: string | null;
  readonly recovery_available: boolean;
  readonly expires_at: string;
  readonly simulate_call_available: boolean;
}

export interface RecoverSessionRequest {
  readonly recovery_token: string;
}

export interface RecoverSessionResponse {
  readonly status: 'recovered';
  readonly experience_session_id: string;
  readonly state: string;
  readonly restricted_lead_view_url: string | null;
  readonly experience_token: string;
}

export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
    readonly request_id: string;
    readonly action?: string;
  };
}

export type PresentationEventName =
  | 'session_started'
  | 'waiting_for_call'
  | 'call_started'
  | 'call_completed'
  | 'processing_started'
  | 'transcript_ready'
  | 'customer_details_ready'
  | 'timeline_ready'
  | 'summary_ready'
  | 'lead_ready'
  | 'discovery_available'
  | 'discovery_booked'
  | 'session_recovered'
  | 'session_expired'
  | 'cleanup_started'
  | 'completed';

export interface PresentationEvent {
  readonly event: PresentationEventName;
  readonly data: {
    readonly experience_session_id: string;
    readonly label: string;
    readonly timestamp: string;
    readonly restricted_lead_view_url?: string;
  };
}

export interface DiscoverySlotResponse {
  readonly slot_id: string;
  readonly starts_at: string;
  readonly display: string;
}

export interface DiscoverySlotsApiResponse {
  readonly slots: readonly DiscoverySlotResponse[];
  readonly next_cursor: string | null;
}

export interface BookDiscoveryApiRequest {
  readonly selected_slot_id: string;
  readonly timezone: string;
}

export interface BookDiscoveryApiResponse {
  readonly status: 'booked';
  readonly discovery_session_id: string;
  readonly scheduled_at: string;
  readonly confirmation: {
    readonly email_sent: boolean;
    readonly sms_sent: boolean;
  };
}

export interface SimulateCallResponse {
  readonly status: 'simulated';
  readonly experience_session_id: string;
  readonly state: string;
}
