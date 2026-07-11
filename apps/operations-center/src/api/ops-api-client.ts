const OPS_API_BASE_URL = '/api/ops/v1';
const OPS_INTERNAL_TOKEN = 'local-ops-dev-token';

export interface OpsIncident {
  incident_id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  experience_session_id: string | null;
  action_type: 'retry' | 'cleanup' | 'investigate';
  created_at: string;
}

export interface LiveSessionView {
  experience_session_id: string;
  prospect_name: string;
  business_name: string;
  industry: string;
  experience_definition_id: string;
  state: string;
  current_stage: string;
  elapsed_seconds: number;
  incident_id: string | null;
}

export interface SessionHistoryEntry {
  experience_session_id: string;
  prospect_name: string;
  business_name: string;
  email: string;
  phone_number: string;
  industry: string;
  experience_definition_id: string;
  state: string;
  started_at: string;
  completed_at: string | null;
  timeline: Array<{ event_name: string; occurred_at: string; label: string }>;
}

export interface PlatformHealthComponent {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
}

export interface FunnelStageReport {
  stage: string;
  count: number;
  drop_off_from_previous: number | null;
  drop_off_rate_from_previous: number | null;
  average_seconds_from_previous: number | null;
}

export class OpsApiClient {
  constructor(
    private readonly options: {
      fetchImpl?: typeof fetch;
      baseUrl?: string;
      token?: string;
    } = {},
  ) {}

  private get fetchImpl(): typeof fetch {
    return this.options.fetchImpl ?? fetch.bind(globalThis);
  }

  private get baseUrl(): string {
    return this.options.baseUrl ?? OPS_API_BASE_URL;
  }

  private get token(): string {
    return this.options.token ?? OPS_INTERNAL_TOKEN;
  }

  async getActionCenter(): Promise<{ incidents: OpsIncident[] }> {
    return this.request('/actions');
  }

  async getLiveSessions(): Promise<{ sessions: LiveSessionView[] }> {
    return this.request('/sessions/live');
  }

  async searchSessionHistory(filters: Record<string, string>): Promise<{ sessions: SessionHistoryEntry[] }> {
    const params = new URLSearchParams(filters);
    return this.request(`/sessions/history?${params.toString()}`);
  }

  async getPlatformHealth(): Promise<{ components: PlatformHealthComponent[]; generated_at: string }> {
    return this.request('/health');
  }

  async getFunnelReport(): Promise<{ stages: FunnelStageReport[]; generated_at: string }> {
    return this.request('/reports/funnel');
  }

  async getIndustryDemandReport(): Promise<{
    industries: Array<{
      industry: string;
      industry_selected: number;
      demo_started: number;
      demo_completed: number;
      discovery_booked: number;
    }>;
    generated_at: string;
  }> {
    return this.request('/reports/industry-demand');
  }

  async retryIncident(incidentId: string): Promise<{ message: string }> {
    return this.request(`/actions/${encodeURIComponent(incidentId)}/retry`, { method: 'POST' });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Ops-Internal-Token': this.token,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Operations API request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
