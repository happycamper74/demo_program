import { DEMO_API_BASE_URL } from '../lib/constants.js';

export interface StartDemoRequest {
  full_name: string;
  business_name: string;
  email: string;
  business_market: 'NL' | 'US' | 'OTHER';
  country_name?: string;
  phone_number?: string;
  industry: string;
  business_location: string;
  company_size: string;
  website?: string;
  no_website?: boolean;
  biggest_challenge: string;
  implementation_timeframe: string;
  experience_definition_id: string;
  company_website_url?: string;
  challenge_completed?: boolean;
}

export interface StartDemoResponse {
  status: 'started';
  prospect_id: string;
  experience_session_id: string;
  experience_version: string;
  industry_supported: boolean;
  session_state: string;
  shared_demo_phone_number: string;
  expected_call_duration_seconds?: number;
  call_timeout_seconds?: number;
  experience_token: string;
  simulate_call_available: boolean;
  instructions?: {
    title: string;
    message: string;
    scenario_examples: string[];
  };
  industry_notice?: {
    title: string;
    message: string;
  };
}

export interface SessionStatusResponse {
  experience_session_id: string;
  state: string;
  current_step: string;
  lead_view_available: boolean;
  restricted_lead_view_url: string | null;
  recovery_available: boolean;
  expires_at: string;
  simulate_call_available: boolean;
}

export interface RecoverSessionResponse {
  status: 'recovered';
  experience_session_id: string;
  state: string;
  restricted_lead_view_url: string | null;
  experience_token: string;
}

export interface RestrictedLeadViewData {
  header: {
    leadId: string;
    businessName: string;
    contactName: string;
    phoneNumber: string;
    industry: string;
  };
  transcript: Array<{
    speaker: 'agent' | 'caller';
    text: string;
    timestamp: string;
  }>;
  summary: string;
  timeline: Array<{
    id: string;
    title: string;
    description: string;
    occurredAt: string;
  }>;
}

export interface DiscoverySlotResponse {
  slot_id: string;
  starts_at: string;
  display: string;
}

export interface DiscoverySlotsApiResponse {
  slots: DiscoverySlotResponse[];
  next_cursor: string | null;
}

export interface BookDiscoveryApiRequest {
  selected_slot_id: string;
  timezone: string;
}

export interface BookDiscoveryApiResponse {
  status: 'booked';
  discovery_session_id: string;
  scheduled_at: string;
  confirmation: {
    email_sent: boolean;
    sms_sent: boolean;
  };
}

export interface SimulateCallResponse {
  status: 'simulated';
  experience_session_id: string;
  state: string;
}

export interface PresentationEvent {
  event: string;
  data: {
    experience_session_id: string;
    label: string;
    timestamp: string;
    restricted_lead_view_url?: string;
  };
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    request_id: string;
    action?: string;
  };
}

export class DemoApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly action?: string,
  ) {
    super(message);
    this.name = 'DemoApiClientError';
  }
}

export interface DemoApiClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export class DemoApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: DemoApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEMO_API_BASE_URL;
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  }

  async startDemo(request: StartDemoRequest): Promise<StartDemoResponse> {
    return this.request<StartDemoResponse>('/start', {
      method: 'POST',
      body: JSON.stringify(request),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getSessionStatus(
    experienceSessionId: string,
    experienceToken: string,
  ): Promise<SessionStatusResponse> {
    return this.request<SessionStatusResponse>(`/sessions/${experienceSessionId}/status`, {
      headers: this.authHeaders(experienceToken),
    });
  }

  async recoverSession(
    experienceSessionId: string,
    recoveryToken: string,
  ): Promise<RecoverSessionResponse> {
    return this.request<RecoverSessionResponse>(`/sessions/${experienceSessionId}/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recovery_token: recoveryToken }),
    });
  }

  async getRestrictedLeadView(
    experienceSessionId: string,
    experienceToken: string,
  ): Promise<RestrictedLeadViewData> {
    return this.request<RestrictedLeadViewData>(`/sessions/${experienceSessionId}/lead-view`, {
      headers: this.authHeaders(experienceToken),
    });
  }

  async simulateIncomingCall(
    experienceSessionId: string,
    experienceToken: string,
  ): Promise<SimulateCallResponse> {
    return this.request<SimulateCallResponse>(`/sessions/${experienceSessionId}/simulate-call`, {
      method: 'POST',
      headers: this.authHeaders(experienceToken),
    });
  }

  async getDiscoverySlots(cursor?: string | null): Promise<DiscoverySlotsApiResponse> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return this.request<DiscoverySlotsApiResponse>(`/discovery-slots${query}`);
  }

  async bookDiscovery(
    experienceSessionId: string,
    experienceToken: string,
    request: BookDiscoveryApiRequest,
  ): Promise<BookDiscoveryApiResponse> {
    return this.request<BookDiscoveryApiResponse>(`/sessions/${experienceSessionId}/book-discovery`, {
      method: 'POST',
      headers: {
        ...this.authHeaders(experienceToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
  }

  async recordAnalyticsEvent(request: {
    event_name: string;
    experience_session_id?: string;
    prospect_id?: string;
    industry?: string;
    payload?: Record<string, unknown>;
  }): Promise<{ status: string }> {
    return this.request<{ status: string }>('/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  createEventSource(experienceSessionId: string, experienceToken: string): EventSource {
    const url = `${this.baseUrl}/sessions/${experienceSessionId}/events?token=${encodeURIComponent(experienceToken)}`;
    return new EventSource(url);
  }

  getEventStreamUrl(experienceSessionId: string, experienceToken: string): string {
    return `${this.baseUrl}/sessions/${experienceSessionId}/events?token=${encodeURIComponent(experienceToken)}`;
  }

  private authHeaders(token: string): HeadersInit {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, init);
    const body = (await response.json()) as T | ApiErrorBody;

    if (!response.ok) {
      const errorBody = body as ApiErrorBody;
      throw new DemoApiClientError(
        errorBody.error?.code ?? 'INTERNAL_ERROR',
        errorBody.error?.message ?? 'Request failed',
        response.status,
        errorBody.error?.action,
      );
    }

    return body as T;
  }
}

export function parseSseChunk(chunk: string): PresentationEvent[] {
  const events: PresentationEvent[] = [];
  const blocks = chunk.split('\n\n').filter(Boolean);

  for (const block of blocks) {
    const lines = block.split('\n');
    let eventName = 'message';
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      }
      if (line.startsWith('data:')) {
        data = line.slice(5).trim();
      }
    }

    if (data) {
      events.push({
        event: eventName,
        data: JSON.parse(data) as PresentationEvent['data'],
      });
    }
  }

  return events;
}

export function applyPresentationEvents(
  current: Set<string>,
  events: readonly PresentationEvent[],
): Set<string> {
  const next = new Set(current);
  for (const event of events) {
    next.add(event.event);
  }
  return next;
}
